import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/database.js';
import { verifyFirebaseIdToken } from '../config/firebase.js';
import { normalizeLocalKrPhone } from '../utils/phone.js';
import { validatePhone } from '../utils/validation.js';
import {
  hydrateUserPiiRow,
  nameLookupBindParams,
  nameLookupWhereClause,
  packPhoneOnly,
  phoneLookupBindParams,
  phoneLookupWhereClause,
} from '../services/userPii.service.js';

if (!process.env.JWT_SECRET) {
  throw new Error('[FATAL] JWT_SECRET 환경변수가 없습니다.');
}

const JWT_SECRET = process.env.JWT_SECRET;
const RECOVERY_TOKEN_TTL = process.env.RECOVERY_TOKEN_TTL || '15m';

const GENERIC_NOT_FOUND = '입력한 정보와 일치하는 계정을 찾을 수 없습니다.';

/**
 * Firebase Phone Auth idToken + 클라이언트 전화번호 일치 검증
 * @returns {Promise<string>} normalized phone
 */
export async function assertFirebasePhoneToken(idToken, clientPhone) {
  if (!idToken || typeof idToken !== 'string') {
    const err = new Error('ID_TOKEN_REQUIRED');
    err.code = 'ID_TOKEN_REQUIRED';
    err.status = 400;
    err.publicMessage = '인증 토큰이 필요합니다.';
    throw err;
  }

  const normalizedClient = normalizeLocalKrPhone(clientPhone);
  if (!normalizedClient || !validatePhone(normalizedClient)) {
    const err = new Error('INVALID_PHONE');
    err.code = 'INVALID_PHONE';
    err.status = 400;
    err.publicMessage = '올바른 전화번호 형식이 아닙니다.';
    throw err;
  }

  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch (tokenErr) {
    const err = new Error('INVALID_ID_TOKEN');
    err.code = 'INVALID_ID_TOKEN';
    err.status = 401;
    err.publicMessage = '유효하지 않거나 만료된 인증 토큰입니다.';
    throw err;
  }

  if (decoded.firebase?.sign_in_provider !== 'phone') {
    const err = new Error('NOT_PHONE_TOKEN');
    err.code = 'NOT_PHONE_TOKEN';
    err.status = 400;
    err.publicMessage = '전화번호 인증 토큰이 아닙니다.';
    throw err;
  }

  const normalizedToken = normalizeLocalKrPhone(decoded.phone_number);
  if (!normalizedToken || normalizedToken !== normalizedClient) {
    const err = new Error('PHONE_MISMATCH');
    err.code = 'PHONE_MISMATCH';
    err.status = 400;
    err.publicMessage =
      '인증한 전화번호와 입력한 전화번호가 일치하지 않습니다.';
    throw err;
  }

  return normalizedToken;
}

async function findActiveUser(whereSql, params) {
  const [rows] = await pool.execute(
    `SELECT id, username, name_enc, phone_enc, is_banned, is_deleted
     FROM users
     WHERE is_deleted = FALSE
       AND (is_banned IS NULL OR is_banned = FALSE)
       AND ${whereSql}
     LIMIT 1`,
    params,
  );
  const row = rows[0] || null;
  return row ? hydrateUserPiiRow(row, ['name', 'phone']) : null;
}

export async function findRegisteredUserByPhoneAndName(phone, name) {
  const normalizedPhone = normalizeLocalKrPhone(phone);
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    const err = new Error('NAME_REQUIRED');
    err.code = 'NAME_REQUIRED';
    err.status = 400;
    err.publicMessage = '이름을 입력해주세요.';
    throw err;
  }

  const user = await findActiveUser(
    `${phoneLookupWhereClause()} AND ${nameLookupWhereClause()}`,
    [...phoneLookupBindParams(normalizedPhone), ...nameLookupBindParams(trimmedName)],
  );

  if (!user) {
    const err = new Error('USER_NOT_FOUND');
    err.code = 'USER_NOT_FOUND';
    err.status = 404;
    err.publicMessage = GENERIC_NOT_FOUND;
    throw err;
  }

  return user;
}

export async function findRegisteredUserByPhoneNameUsername(
  phone,
  name,
  username,
) {
  const normalizedPhone = normalizeLocalKrPhone(phone);
  const trimmedName = String(name || '').trim();
  const trimmedUsername = String(username || '').trim();

  if (!trimmedName || !trimmedUsername) {
    const err = new Error('FIELDS_REQUIRED');
    err.code = 'FIELDS_REQUIRED';
    err.status = 400;
    err.publicMessage = '이름과 아이디를 입력해주세요.';
    throw err;
  }

  const user = await findActiveUser(
    `${phoneLookupWhereClause()} AND ${nameLookupWhereClause()} AND username = ?`,
    [
      ...phoneLookupBindParams(normalizedPhone),
      ...nameLookupBindParams(trimmedName),
      trimmedUsername,
    ],
  );

  if (!user) {
    const err = new Error('USER_NOT_FOUND');
    err.code = 'USER_NOT_FOUND';
    err.status = 404;
    err.publicMessage = GENERIC_NOT_FOUND;
    throw err;
  }

  return user;
}

export async function issuePasswordRecoveryToken({ userId, phone, username }) {
  const jti = crypto.randomUUID();
  const normalizedPhone = normalizeLocalKrPhone(phone);
  const trimmedUsername = String(username || '').trim();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const phonePacked = packPhoneOnly(normalizedPhone);

  const token = jwt.sign(
    {
      type: 'recovery_password',
      jti,
      userId,
      phone: normalizedPhone,
      username: trimmedUsername,
    },
    JWT_SECRET,
    { expiresIn: RECOVERY_TOKEN_TTL, algorithm: 'HS256' },
  );

  await pool.execute(
    `INSERT INTO account_recovery_tokens
       (jti, user_id, phone_enc, phone_lookup, username, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      jti,
      userId,
      phonePacked.phone_enc,
      phonePacked.phone_lookup,
      trimmedUsername,
      expiresAt,
    ],
  );

  return token;
}

export async function consumePasswordRecoveryToken(token, { phone, username }) {
  if (!token || typeof token !== 'string') {
    const err = new Error('RECOVERY_TOKEN_REQUIRED');
    err.code = 'RECOVERY_TOKEN_REQUIRED';
    err.status = 400;
    err.publicMessage = '비밀번호 재설정 토큰이 필요합니다.';
    throw err;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    const err = new Error('INVALID_RECOVERY_TOKEN');
    err.code = 'INVALID_RECOVERY_TOKEN';
    err.status = 401;
    err.publicMessage =
      '비밀번호 재설정 링크가 만료되었습니다. 처음부터 다시 진행해 주세요.';
    throw err;
  }

  if (decoded?.type !== 'recovery_password' || !decoded?.jti) {
    const err = new Error('INVALID_RECOVERY_TOKEN');
    err.code = 'INVALID_RECOVERY_TOKEN';
    err.status = 401;
    err.publicMessage =
      '비밀번호 재설정 링크가 만료되었습니다. 처음부터 다시 진행해 주세요.';
    throw err;
  }

  const normalizedPhone = normalizeLocalKrPhone(phone);
  const trimmedUsername = String(username || '').trim();

  if (
    decoded.phone !== normalizedPhone ||
    decoded.username !== trimmedUsername
  ) {
    const err = new Error('RECOVERY_MISMATCH');
    err.code = 'RECOVERY_MISMATCH';
    err.status = 400;
    err.publicMessage =
      '계정 정보가 일치하지 않습니다. 처음부터 다시 진행해 주세요.';
    throw err;
  }

  const [rows] = await pool.execute(
    `SELECT id, user_id, used_at, expires_at
     FROM account_recovery_tokens
     WHERE jti = ? LIMIT 1`,
    [decoded.jti],
  );

  if (!rows.length) {
    const err = new Error('INVALID_RECOVERY_TOKEN');
    err.code = 'INVALID_RECOVERY_TOKEN';
    err.status = 401;
    err.publicMessage =
      '비밀번호 재설정 링크가 만료되었습니다. 처음부터 다시 진행해 주세요.';
    throw err;
  }

  const row = rows[0];
  if (row.used_at) {
    const err = new Error('RECOVERY_TOKEN_USED');
    err.code = 'RECOVERY_TOKEN_USED';
    err.status = 401;
    err.publicMessage =
      '이미 사용된 재설정 요청입니다. 처음부터 다시 진행해 주세요.';
    throw err;
  }
  if (new Date(row.expires_at) < new Date()) {
    const err = new Error('RECOVERY_TOKEN_EXPIRED');
    err.code = 'RECOVERY_TOKEN_EXPIRED';
    err.status = 401;
    err.publicMessage =
      '비밀번호 재설정 링크가 만료되었습니다. 처음부터 다시 진행해 주세요.';
    throw err;
  }

  if (row.user_id !== decoded.userId) {
    const err = new Error('INVALID_RECOVERY_TOKEN');
    err.code = 'INVALID_RECOVERY_TOKEN';
    err.status = 401;
    err.publicMessage =
      '비밀번호 재설정 링크가 만료되었습니다. 처음부터 다시 진행해 주세요.';
    throw err;
  }

  await pool.execute(
    'UPDATE account_recovery_tokens SET used_at = NOW() WHERE id = ?',
    [row.id],
  );

  return { userId: row.user_id };
}

export function mapRecoveryError(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
  return {
    status: error?.status || 500,
    message: error?.publicMessage || error?.message || fallback,
  };
}

function mapInicisRecoveryError(error) {
  const code = error?.code || '';
  const messages = {
    IDENTITY_TOKEN_REQUIRED: '본인인증을 먼저 완료해 주세요.',
    INVALID_IDENTITY_TOKEN: '유효하지 않거나 만료된 본인인증입니다. 다시 시도해 주세요.',
    IDENTITY_PURPOSE_MISMATCH: '본인인증 용도가 올바르지 않습니다.',
    IDENTITY_NOT_SUCCESS: '본인인증이 완료되지 않았습니다.',
    IDENTITY_TOKEN_USED: '이미 사용된 본인인증입니다. 다시 시도해 주세요.',
    IDENTITY_TOKEN_EXPIRED: '본인인증이 만료되었습니다. 다시 시도해 주세요.',
    IDENTITY_NAME_MISMATCH:
      '입력하신 이름과 본인인증 정보가 일치하지 않습니다.',
    INICIS_DISABLED: '본인인증 서비스를 이용할 수 없습니다.',
  };
  if (messages[code]) {
    return {
      status: error?.status || 400,
      message: messages[code],
    };
  }
  return mapRecoveryError(error);
}

export { mapInicisRecoveryError };

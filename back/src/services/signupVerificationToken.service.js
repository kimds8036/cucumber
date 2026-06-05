import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/database.js';
import { normalizeLocalKrPhone } from '../utils/phone.js';

if (!process.env.JWT_SECRET) {
  throw new Error('[FATAL] JWT_SECRET 환경변수가 없습니다.');
}

const JWT_SECRET = process.env.JWT_SECRET;
const OCR_TOKEN_TTL = process.env.SIGNUP_OCR_TOKEN_TTL || '30m';

/**
 * OCR 통과 후 가입용 단기 토큰 발급 (재사용·변조 방지)
 */
export async function issueStudentOcrVerificationToken({
  name,
  birthDate,
  schoolId,
  phone,
}) {
  const jti = crypto.randomUUID();
  const normalizedPhone = phone ? normalizeLocalKrPhone(phone) : null;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const token = jwt.sign(
    {
      type: 'signup_ocr',
      jti,
      name: String(name || '').trim(),
      birthDate,
      schoolId: String(schoolId || '').trim(),
      phone: normalizedPhone,
    },
    JWT_SECRET,
    { expiresIn: OCR_TOKEN_TTL, algorithm: 'HS256' },
  );

  await pool.execute(
    `INSERT INTO signup_verification_tokens
       (jti, token_type, name, birth_date, school_id, phone, expires_at)
     VALUES (?, 'ocr', ?, ?, ?, ?, ?)`,
    [
      jti,
      String(name || '').trim(),
      birthDate,
      String(schoolId || '').trim(),
      normalizedPhone,
      expiresAt,
    ],
  );

  return token;
}

/**
 * 최종 signup 시 OCR 토큰 소비 + payload 교차 검증
 */
export async function consumeStudentOcrVerificationToken(
  token,
  { name, birthDate, schoolId, phone },
) {
  if (!token || typeof token !== 'string') {
    const err = new Error('STUDENT_VERIFICATION_TOKEN_REQUIRED');
    err.code = 'STUDENT_VERIFICATION_TOKEN_REQUIRED';
    throw err;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (e) {
    const err = new Error('INVALID_STUDENT_VERIFICATION_TOKEN');
    err.code = 'INVALID_STUDENT_VERIFICATION_TOKEN';
    throw err;
  }

  if (decoded?.type !== 'signup_ocr' || !decoded?.jti) {
    const err = new Error('INVALID_STUDENT_VERIFICATION_TOKEN');
    err.code = 'INVALID_STUDENT_VERIFICATION_TOKEN';
    throw err;
  }

  const normalizedPhone = normalizeLocalKrPhone(phone);
  const trimmedName = String(name || '').trim();
  const trimmedSchoolId = String(schoolId || '').trim();

  if (
    decoded.name !== trimmedName ||
    decoded.birthDate !== birthDate ||
    decoded.schoolId !== trimmedSchoolId
  ) {
    const err = new Error('STUDENT_VERIFICATION_MISMATCH');
    err.code = 'STUDENT_VERIFICATION_MISMATCH';
    throw err;
  }

  if (decoded.phone && normalizedPhone && decoded.phone !== normalizedPhone) {
    const err = new Error('STUDENT_VERIFICATION_PHONE_MISMATCH');
    err.code = 'STUDENT_VERIFICATION_PHONE_MISMATCH';
    throw err;
  }

  const [rows] = await pool.execute(
    `SELECT id, used_at, expires_at FROM signup_verification_tokens
     WHERE jti = ? AND token_type = 'ocr' LIMIT 1`,
    [decoded.jti],
  );

  if (!rows.length) {
    const err = new Error('INVALID_STUDENT_VERIFICATION_TOKEN');
    err.code = 'INVALID_STUDENT_VERIFICATION_TOKEN';
    throw err;
  }

  const row = rows[0];
  if (row.used_at) {
    const err = new Error('STUDENT_VERIFICATION_TOKEN_USED');
    err.code = 'STUDENT_VERIFICATION_TOKEN_USED';
    throw err;
  }
  if (new Date(row.expires_at) < new Date()) {
    const err = new Error('STUDENT_VERIFICATION_TOKEN_EXPIRED');
    err.code = 'STUDENT_VERIFICATION_TOKEN_EXPIRED';
    throw err;
  }

  const [schoolRows] = await pool.execute(
    'SELECT school_id FROM schools WHERE school_id = ? LIMIT 1',
    [trimmedSchoolId],
  );
  if (!schoolRows.length) {
    const err = new Error('INVALID_SCHOOL_ID');
    err.code = 'INVALID_SCHOOL_ID';
    throw err;
  }

  await pool.execute(
    'UPDATE signup_verification_tokens SET used_at = NOW() WHERE id = ?',
    [row.id],
  );

  return { jti: decoded.jti, schoolId: trimmedSchoolId };
}

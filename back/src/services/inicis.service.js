import pool from '../config/database.js';
import {
  assertInicisReadyForSession,
  buildAuthHash,
  createClientToken,
  createMTxId,
  getInicisConfig,
  hashLookup,
  isAllowedAppReturnUrl,
  isAllowedAuthRequestUrl,
  isInicisEnabled,
  tryDecryptInicisField,
} from '../config/inicis.js';
import { decryptPii, encryptPii } from '../utils/piiCrypto.js';
import { normalizeBirthDateInput } from './userPii.service.js';

const PURPOSES = new Set([
  'student_signup',
  'guardian_consent',
  'find_username',
  'password_recovery',
]);

function decodeMaybeUrl(v) {
  if (v == null) return '';
  const s = String(v);
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function birthdayToIso(yyyymmdd) {
  const d = String(yyyymmdd || '').replace(/\D/g, '');
  if (d.length !== 8) return null;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

/** identity_verifications 저장값 — AES 암호문 또는 구버전 평문 */
function resolveIdentityStoredField(value) {
  if (value == null || value === '') return null;
  const raw = String(value);
  try {
    return decryptPii(raw);
  } catch {
    return raw.trim() || null;
  }
}

function packIdentityStoredField(value) {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  try {
    return encryptPii(raw);
  } catch {
    return raw;
  }
}

function digitsOnlyPhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

/** mysql2는 undefined 바인딩 불가 — 간편인증(01) 등 필드 미제공 시 null 로 통일 */
function sqlBind(v) {
  return v === undefined ? null : v;
}

export async function createInicisSession({ purpose, appReturnUrl = null }) {
  if (!isInicisEnabled()) {
    const err = new Error(
      'INICIS_ENABLED=false 입니다. 실연동 전에 환경 변수와 도메인 등록을 확인하세요.',
    );
    err.status = 503;
    err.code = 'INICIS_DISABLED';
    throw err;
  }

  if (!PURPOSES.has(purpose)) {
    const err = new Error('purpose 가 올바르지 않습니다.');
    err.status = 400;
    throw err;
  }

  const { cfg, missing } = assertInicisReadyForSession();
  if (missing.length) {
    const err = new Error(`이니시스 설정 부족: ${missing.join(', ')}`);
    err.status = 503;
    throw err;
  }

  const mTxId = createMTxId();
  const authHash = buildAuthHash({
    mid: cfg.mid,
    mTxId,
    apiKey: cfg.apiKey,
  });
  const expiresAt = new Date(
    Date.now() + cfg.sessionTtlMinutes * 60 * 1000,
  );

  const safeAppReturn =
    appReturnUrl && isAllowedAppReturnUrl(appReturnUrl)
      ? String(appReturnUrl).trim()
      : null;

  await pool.execute(
    `INSERT INTO identity_verifications
      (m_tx_id, purpose, app_return_url, status, expires_at)
     VALUES (?, ?, ?, 'pending', ?)`,
    [mTxId, purpose, safeAppReturn, expiresAt],
  );

  const patched = withMTxIdOnCallbackUrls(cfg, mTxId, {
    appReturnUrl: safeAppReturn,
  });
  const form = {
    mid: cfg.mid,
    reqSvcCd: cfg.reqSvcCd,
    mTxId,
    successUrl: patched.successUrl,
    failUrl: patched.failUrl,
    authHash,
    flgFixedUser: 'N',
    reservedMsg: 'isUseToken=Y',
  };
  if (cfg.diCode) form.DI_CODE = cfg.diCode;

  const launchUrl = `${cfg.publicBase}/api/auth/inicis/launch/${encodeURIComponent(mTxId)}`;

  return {
    mTxId,
    launchUrl,
    authRequestUrl: cfg.authRequestUrl,
    expiresAt: expiresAt.toISOString(),
    form,
  };
}

export async function getLaunchForm(mTxId) {
  const { cfg, missing } = assertInicisReadyForSession();
  if (missing.length) {
    const err = new Error(`이니시스 설정 부족: ${missing.join(', ')}`);
    err.status = 503;
    throw err;
  }

  const [rows] = await pool.execute(
    `SELECT m_tx_id, status, expires_at, app_return_url
     FROM identity_verifications WHERE m_tx_id = ? LIMIT 1`,
    [mTxId],
  );
  const row = rows[0];
  if (!row) {
    const err = new Error('인증 세션을 찾을 수 없습니다.');
    err.status = 404;
    throw err;
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    const err = new Error('인증 세션이 만료되었습니다.');
    err.status = 410;
    throw err;
  }
  if (!['pending', 'launched'].includes(row.status)) {
    const err = new Error('이미 처리된 인증 세션입니다.');
    err.status = 409;
    throw err;
  }

  await pool.execute(
    `UPDATE identity_verifications SET status = 'launched' WHERE m_tx_id = ? AND status = 'pending'`,
    [mTxId],
  );

  const authHash = buildAuthHash({
    mid: cfg.mid,
    mTxId,
    apiKey: cfg.apiKey,
  });
  const patched = withMTxIdOnCallbackUrls(cfg, mTxId, {
    appReturnUrl: row.app_return_url,
  });
  const fields = {
    mid: cfg.mid,
    reqSvcCd: cfg.reqSvcCd,
    mTxId,
    successUrl: patched.successUrl,
    failUrl: patched.failUrl,
    authHash,
    flgFixedUser: 'N',
    reservedMsg: 'isUseToken=Y',
  };
  if (cfg.diCode) fields.DI_CODE = cfg.diCode;

  return { action: cfg.authRequestUrl, fields };
}

export function renderAutoPostHtml({ action, fields }) {
  const inputs = Object.entries(fields)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(String(value))}" />`,
    )
    .join('\n');
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>본인인증 연결 중</title>
</head>
<body>
  <p style="font-family:sans-serif;text-align:center;margin-top:40px;">본인인증 화면으로 이동 중…</p>
  <form id="inicis" method="POST" action="${escapeHtml(action)}" accept-charset="UTF-8">
    ${inputs}
  </form>
  <script>document.getElementById('inicis').submit();</script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function resolveAppReturnFromBody(body) {
  const raw = String(body?.appReturn || body?.app_return || '').trim();
  if (!raw) return null;
  const decoded = decodeMaybeUrl(raw);
  return isAllowedAppReturnUrl(decoded) ? decoded : null;
}

function buildAppReturnTarget(appReturnUrl, { ok, mTxId, resultCode }) {
  if (!appReturnUrl) return null;
  try {
    const u = new URL(appReturnUrl);
    u.searchParams.set('result', ok ? 'success' : 'fail');
    if (mTxId) u.searchParams.set('mTxId', mTxId);
    if (resultCode) u.searchParams.set('resultCode', String(resultCode));
    return u.toString();
  } catch {
    return null;
  }
}

export async function handleInicisCallback(rawBody, { fail = false } = {}) {
  const body = rawBody || {};
  const appReturnUrl = resolveAppReturnFromBody(body);
  const resultCode = String(body.resultCode || body.result_code || '').trim();
  const resultMsg = decodeMaybeUrl(body.resultMsg || body.result_msg || '');
  const authRequestUrl = String(
    body.authRequestUrl || body.auth_request_url || '',
  ).trim();
  const txId = String(body.txId || body.tx_id || '').trim();
  const seedToken = String(body.token || '').trim();
  // STEP2: isUseToken=Y 이면 token(Base64)이 복호화 KEY — 매뉴얼 복호화 팝업
  const mTxId = String(body.mTxId || body.m_tx_id || '').trim();

  if (fail || resultCode !== '0000') {
    if (mTxId) {
      await pool.execute(
        `UPDATE identity_verifications
         SET status = 'fail', result_code = ?, result_msg = ?, tx_id = COALESCE(NULLIF(?, ''), tx_id)
         WHERE m_tx_id = ? AND status IN ('pending','launched')`,
        [resultCode || 'FAIL', resultMsg.slice(0, 500), txId, mTxId],
      );
    }
    return {
      ok: false,
      mTxId: mTxId || null,
      resultCode,
      resultMsg,
      html: renderResultPage(false, resultMsg || '인증에 실패했습니다.', {
        appReturnUrl,
        mTxId: mTxId || null,
        resultCode: resultCode || 'FAIL',
      }),
    };
  }

  if (!isAllowedAuthRequestUrl(authRequestUrl)) {
    if (mTxId) {
      await pool.execute(
        `UPDATE identity_verifications
         SET status = 'fail', result_code = 'BAD_URL', result_msg = ?
         WHERE m_tx_id = ?`,
        ['authRequestUrl validation failed', mTxId],
      );
    }
    return {
      ok: false,
      mTxId: mTxId || null,
      html: renderResultPage(false, '인증 응답 URL이 올바르지 않습니다.', {
        appReturnUrl,
        mTxId: mTxId || null,
        resultCode: 'BAD_URL',
      }),
    };
  }

  let sessionMTxId = mTxId;
  if (!sessionMTxId && txId) {
    // 최근 launched 세션 1건에 txId 연결 (가능하면 mTxId를 successUrl 쿼리로 붙이는 편이 안전)
    const [cands] = await pool.execute(
      `SELECT m_tx_id FROM identity_verifications
       WHERE status = 'launched' AND expires_at > NOW()
       ORDER BY id DESC LIMIT 5`,
    );
    if (cands.length === 1) sessionMTxId = cands[0].m_tx_id;
  }

  if (!sessionMTxId) {
    return {
      ok: false,
      html: renderResultPage(
        false,
        '세션을 특정할 수 없습니다. successUrl에 mTxId를 포함하도록 서버를 확인하세요.',
        { appReturnUrl, resultCode: 'NO_SESSION' },
      ),
    };
  }

  const resolvedAppReturn =
    appReturnUrl || (await loadAppReturnUrlForSession(sessionMTxId));

  // successUrl에 mTxId를 포함하도록 세션 생성 시 URL에 쿼리를 붙임 — 아래 fetchResult 전에 tx 저장
  await pool.execute(
    `UPDATE identity_verifications SET tx_id = ? WHERE m_tx_id = ?`,
    [txId, sessionMTxId],
  );

  const inquiry = await fetchIdentityResult({
    authRequestUrl,
    txId,
  });

  if (!inquiry.ok) {
    await pool.execute(
      `UPDATE identity_verifications
       SET status = 'fail', result_code = ?, result_msg = ?
       WHERE m_tx_id = ?`,
      [
        inquiry.resultCode || 'INQUIRY_FAIL',
        String(inquiry.resultMsg || '결과조회 실패').slice(0, 500),
        sessionMTxId,
      ],
    );
    return {
      ok: false,
      mTxId: sessionMTxId,
      html: renderResultPage(false, inquiry.resultMsg || '결과조회에 실패했습니다.', {
        appReturnUrl: resolvedAppReturn,
        mTxId: sessionMTxId,
        resultCode: inquiry.resultCode || 'INQUIRY_FAIL',
      }),
    };
  }

  const cfg = getInicisConfig();
  const enc = inquiry.data || {};
  const fields = {
    userName: enc.userName,
    userPhone: enc.userPhone,
    userBirthday: enc.userBirthday,
    userCi: enc.userCi || enc.userCi2,
  };
  // 본인확인(03) 전용 — 간편인증(01) 응답에는 없음 (매뉴얼 STEP4)
  if (cfg.reqSvcCd === '03') {
    fields.userGender = enc.userGender;
    fields.isForeign = enc.isForeign;
    fields.userDi = enc.userDi;
  }

  let decryptStatus = 'ok';
  const decrypted = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v == null || v === '') {
      decrypted[k] = null;
      continue;
    }
    // isUseToken=Y → STEP2 token + SEED IV 로 복호화 (매뉴얼)
    const r = tryDecryptInicisField(v, {
      seedToken,
      seedIv: cfg.seedIv,
      seedKey: cfg.seedKey,
    });
    if (r.skipped) {
      decryptStatus = r.reason === 'no_seed_iv' ? 'skipped_no_iv' : 'skipped_no_token';
      decrypted[k] = null;
    } else if (!r.ok) {
      // 평문일 수도 있음(토큰 미사용 환경)
      if (/^[가-힣A-Za-z0-9+\-/=._]+$/.test(String(v)) && String(v).length < 80) {
        decrypted[k] = String(v);
      } else {
        decryptStatus = 'error';
        decrypted[k] = null;
      }
    } else {
      decrypted[k] = r.value;
    }
  }

  const clientToken = createClientToken();
  const ciHash = hashLookup(decrypted.userCi);
  const diHash = hashLookup(decrypted.userDi);

  await pool.execute(
    `UPDATE identity_verifications SET
       status = 'success',
       result_code = ?,
       result_msg = ?,
       provider_dev_cd = ?,
       name_enc = ?,
       phone_enc = ?,
       birthday_enc = ?,
       gender = ?,
       is_foreign = ?,
       ci_enc = ?,
       di_enc = ?,
       ci_hash = ?,
       di_hash = ?,
       decrypt_status = ?,
       client_token = ?
     WHERE m_tx_id = ?`,
    [
      inquiry.resultCode || '0000',
      String(inquiry.resultMsg || '성공').slice(0, 500),
      sqlBind(enc.providerDevCd),
      sqlBind(packIdentityStoredField(decrypted.userName)),
      sqlBind(packIdentityStoredField(decrypted.userPhone)),
      sqlBind(packIdentityStoredField(decrypted.userBirthday)),
      sqlBind(
        decrypted.userGender
          ? String(decrypted.userGender).slice(0, 1)
          : null,
      ),
      sqlBind(
        decrypted.isForeign != null
          ? String(decrypted.isForeign).slice(0, 1)
          : null,
      ),
      sqlBind(decrypted.userCi),
      sqlBind(decrypted.userDi),
      sqlBind(ciHash),
      sqlBind(diHash),
      decryptStatus,
      clientToken,
      sessionMTxId,
    ],
  );

  return {
    ok: true,
    mTxId: sessionMTxId,
    clientToken,
    decryptStatus,
    html: renderResultPage(
      true,
      '본인인증이 완료되었습니다.',
      {
        appReturnUrl: resolvedAppReturn,
        mTxId: sessionMTxId,
        resultCode: inquiry.resultCode || '0000',
      },
    ),
  };
}

async function fetchIdentityResult({ authRequestUrl, txId }) {
  const cfg = getInicisConfig();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(authRequestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      body: JSON.stringify({ mid: cfg.mid, txId }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    const resultCode = String(data.resultCode || '').trim();
    const resultMsg = decodeMaybeUrl(data.resultMsg || '');
    if (resultCode !== '0000') {
      return { ok: false, resultCode, resultMsg, data };
    }
    return { ok: true, resultCode, resultMsg, data };
  } catch (e) {
    return {
      ok: false,
      resultCode: 'NETWORK',
      resultMsg: e?.message || '결과조회 네트워크 오류',
    };
  }
}

function renderResultPage(ok, message, { appReturnUrl, mTxId, resultCode } = {}) {
  const color = ok ? '#6f9163' : '#c0392b';
  const redirectTarget = buildAppReturnTarget(appReturnUrl, {
    ok,
    mTxId,
    resultCode,
  });
  const redirectBlock = redirectTarget
    ? `<p style="color:#444;font-size:15px;margin-top:20px;line-height:1.6;"><strong>왼쪽 상단 ✕</strong>를 눌러<br/>앱으로 돌아가 주세요.</p>
  <p style="color:#888;font-size:13px;margin-top:12px;">앱에서 인증 결과를 자동으로 확인합니다.</p>`
    : `<p style="color:#444;font-size:15px;margin-top:20px;line-height:1.6;"><strong>왼쪽 상단 ✕</strong>를 눌러<br/>앱으로 돌아가 주세요.</p>`;
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>인증 결과</title></head>
<body style="font-family:sans-serif;padding:32px;text-align:center;">
  <h2 style="color:${color}">${ok ? '인증 완료' : '인증 실패'}</h2>
  <p>${escapeHtml(message || '')}</p>
  ${redirectBlock}
</body></html>`;
}

async function loadAppReturnUrlForSession(mTxId) {
  const [rows] = await pool.execute(
    `SELECT app_return_url FROM identity_verifications WHERE m_tx_id = ? LIMIT 1`,
    [mTxId],
  );
  const url = rows[0]?.app_return_url;
  return url && isAllowedAppReturnUrl(url) ? url : null;
}

/** successUrl에 mTxId·appReturn 쿼리 — 콜백 매칭·앱 복귀용 */
export function withMTxIdOnCallbackUrls(cfg, mTxId, { appReturnUrl } = {}) {
  const add = (url) => {
    const u = new URL(url);
    u.searchParams.set('mTxId', mTxId);
    if (appReturnUrl && isAllowedAppReturnUrl(appReturnUrl)) {
      u.searchParams.set('appReturn', appReturnUrl);
    }
    return u.toString();
  };
  return {
    ...cfg,
    successUrl: add(cfg.successUrl),
    failUrl: add(cfg.failUrl),
  };
}

export async function createInicisSessionWithCallbackQuery({
  purpose,
  appReturnUrl,
}) {
  return createInicisSession({ purpose, appReturnUrl });
}

export async function getLaunchFormWithCallbackQuery(mTxId) {
  const base = await getLaunchForm(mTxId);
  return base;
}

export async function getInicisSessionStatus(mTxId) {
  const [rows] = await pool.execute(
    `SELECT m_tx_id, purpose, status, result_code, result_msg, decrypt_status,
            client_token, name_enc, phone_enc, birthday_enc, gender, is_foreign,
            expires_at, created_at
     FROM identity_verifications WHERE m_tx_id = ? LIMIT 1`,
    [mTxId],
  );
  const row = rows[0];
  if (!row) {
    const err = new Error('세션 없음');
    err.status = 404;
    throw err;
  }

  const expired = new Date(row.expires_at).getTime() < Date.now();
  const profile =
    row.status === 'success'
      ? {
          name: resolveIdentityStoredField(row.name_enc),
          phoneNumber: resolveIdentityStoredField(row.phone_enc),
          birthDate:
            birthdayToIso(resolveIdentityStoredField(row.birthday_enc)) ||
            resolveIdentityStoredField(row.birthday_enc) ||
            null,
          gender: row.gender || null,
          isForeign: row.is_foreign || null,
          decryptStatus: row.decrypt_status,
        }
      : null;

  return {
    mTxId: row.m_tx_id,
    purpose: row.purpose,
    status: expired && row.status === 'pending' ? 'expired' : row.status,
    resultCode: row.result_code,
    resultMsg: row.result_msg,
    clientToken: row.status === 'success' ? row.client_token : null,
    profile,
    expiresAt: row.expires_at,
  };
}

/**
 * client_token으로 본인인증 프로필 조회 (소비 전)
 */
export async function getIdentityVerificationByClientToken(
  clientToken,
  { purpose },
  connection = null,
) {
  const db = connection || pool;
  const token = String(clientToken || '').trim();
  if (!token) {
    const err = new Error('인증 토큰이 필요합니다.');
    err.code = 'IDENTITY_TOKEN_REQUIRED';
    err.status = 400;
    err.publicMessage = '본인인증 토큰이 필요합니다.';
    throw err;
  }

  const [rows] = await db.execute(
    `SELECT id, m_tx_id, purpose, status, name_enc, phone_enc, birthday_enc,
            expires_at, consumed_at, client_token
     FROM identity_verifications
     WHERE client_token = ?
     LIMIT 1`,
    [token],
  );
  const row = rows[0];
  if (!row) {
    const err = new Error('유효하지 않은 본인인증 토큰입니다.');
    err.code = 'INVALID_IDENTITY_TOKEN';
    err.status = 401;
    err.publicMessage = '유효하지 않거나 만료된 본인인증입니다. 다시 시도해 주세요.';
    throw err;
  }
  if (row.purpose !== purpose) {
    const err = new Error('본인인증 용도가 일치하지 않습니다.');
    err.code = 'IDENTITY_PURPOSE_MISMATCH';
    err.status = 400;
    err.publicMessage = '본인인증 용도가 올바르지 않습니다.';
    throw err;
  }
  if (row.status !== 'success') {
    const err = new Error('본인인증이 완료되지 않았습니다.');
    err.code = 'IDENTITY_NOT_SUCCESS';
    err.status = 400;
    err.publicMessage = '본인인증이 완료되지 않았습니다.';
    throw err;
  }
  if (row.consumed_at) {
    const err = new Error('이미 사용된 본인인증 토큰입니다.');
    err.code = 'IDENTITY_TOKEN_USED';
    err.status = 401;
    err.publicMessage = '이미 사용된 본인인증입니다. 다시 시도해 주세요.';
    throw err;
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    const err = new Error('본인인증 토큰이 만료되었습니다.');
    err.code = 'IDENTITY_TOKEN_EXPIRED';
    err.status = 401;
    err.publicMessage = '본인인증이 만료되었습니다. 다시 시도해 주세요.';
    throw err;
  }

  const profileName = String(resolveIdentityStoredField(row.name_enc) || '').trim();
  const profilePhone = digitsOnlyPhone(resolveIdentityStoredField(row.phone_enc));
  const profileBirth =
    birthdayToIso(resolveIdentityStoredField(row.birthday_enc)) ||
    String(resolveIdentityStoredField(row.birthday_enc) || '').slice(0, 10);

  return {
    id: row.id,
    mTxId: row.m_tx_id,
    name: profileName,
    phone: profilePhone,
    birthDate: profileBirth,
  };
}

/**
 * 가입 시 1회성 client_token 소비 (트랜잭션 connection 권장)
 */
export async function consumeIdentityVerificationClientToken(
  clientToken,
  {
    purpose,
    expectedName,
    expectedPhone,
    expectedBirthDate,
    linkedUserId = null,
  },
  connection = null,
) {
  const db = connection || pool;
  const token = String(clientToken || '').trim();
  if (!token) {
    const err = new Error('인증 토큰이 필요합니다.');
    err.code = 'IDENTITY_TOKEN_REQUIRED';
    throw err;
  }

  const [rows] = await db.execute(
    `SELECT id, m_tx_id, purpose, status, name_enc, phone_enc, birthday_enc,
            expires_at, consumed_at, client_token
     FROM identity_verifications
     WHERE client_token = ?
     LIMIT 1
     FOR UPDATE`,
    [token],
  );
  const row = rows[0];
  if (!row) {
    const err = new Error('유효하지 않은 본인인증 토큰입니다.');
    err.code = 'INVALID_IDENTITY_TOKEN';
    throw err;
  }
  if (row.purpose !== purpose) {
    const err = new Error('본인인증 용도가 일치하지 않습니다.');
    err.code = 'IDENTITY_PURPOSE_MISMATCH';
    throw err;
  }
  if (row.status !== 'success') {
    const err = new Error('본인인증이 완료되지 않았습니다.');
    err.code = 'IDENTITY_NOT_SUCCESS';
    throw err;
  }
  if (row.consumed_at) {
    const err = new Error('이미 사용된 본인인증 토큰입니다.');
    err.code = 'IDENTITY_TOKEN_USED';
    throw err;
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    const err = new Error('본인인증 토큰이 만료되었습니다.');
    err.code = 'IDENTITY_TOKEN_EXPIRED';
    throw err;
  }

  const profileName = String(resolveIdentityStoredField(row.name_enc) || '').trim();
  const profilePhone = digitsOnlyPhone(resolveIdentityStoredField(row.phone_enc));
  const profileBirth =
    birthdayToIso(resolveIdentityStoredField(row.birthday_enc)) ||
    String(resolveIdentityStoredField(row.birthday_enc) || '').slice(0, 10);

  if (expectedName && profileName && profileName !== String(expectedName).trim()) {
    const err = new Error('본인인증 이름이 가입 정보와 일치하지 않습니다.');
    err.code = 'IDENTITY_NAME_MISMATCH';
    throw err;
  }
  if (expectedPhone && profilePhone) {
    const exp = digitsOnlyPhone(expectedPhone);
    if (exp && exp !== profilePhone) {
      const err = new Error('본인인증 전화번호가 가입 정보와 일치하지 않습니다.');
      err.code = 'IDENTITY_PHONE_MISMATCH';
      throw err;
    }
  }
  if (
    expectedBirthDate &&
    profileBirth
  ) {
    const normExpected = normalizeBirthDateInput(expectedBirthDate);
    const normProfile = normalizeBirthDateInput(profileBirth);
    if (normExpected && normProfile && normExpected !== normProfile) {
      const err = new Error('본인인증 생년월일이 가입 정보와 일치하지 않습니다.');
      err.code = 'IDENTITY_BIRTH_MISMATCH';
      throw err;
    }
  }

  await db.execute(
    `UPDATE identity_verifications
     SET status = 'consumed', consumed_at = NOW(), linked_user_id = COALESCE(?, linked_user_id)
     WHERE id = ?`,
    [linkedUserId, row.id],
  );

  return {
    id: row.id,
    mTxId: row.m_tx_id,
    name: profileName,
    phone: profilePhone,
    birthDate: profileBirth,
  };
}

export { isInicisEnabled, getInicisConfig };

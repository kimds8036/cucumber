import pool from '../config/database.js';
import {
  assertInicisReadyForSession,
  buildAuthHash,
  createClientToken,
  createMTxId,
  getInicisConfig,
  hashLookup,
  isAllowedAuthRequestUrl,
  isInicisEnabled,
  tryDecryptInicisField,
} from '../config/inicis.js';

const PURPOSES = new Set(['student_signup', 'guardian_consent']);

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

export async function createInicisSession({ purpose }) {
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

  await pool.execute(
    `INSERT INTO identity_verifications
      (m_tx_id, purpose, status, expires_at)
     VALUES (?, ?, 'pending', ?)`,
    [mTxId, purpose, expiresAt],
  );

  const patched = withMTxIdOnCallbackUrls(cfg, mTxId);
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
    `SELECT m_tx_id, status, expires_at FROM identity_verifications WHERE m_tx_id = ? LIMIT 1`,
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
  const fields = {
    mid: cfg.mid,
    reqSvcCd: cfg.reqSvcCd,
    mTxId,
    successUrl: cfg.successUrl,
    failUrl: cfg.failUrl,
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

export async function handleInicisCallback(rawBody, { fail = false } = {}) {
  const body = rawBody || {};
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
      html: renderResultPage(false, resultMsg || '인증에 실패했습니다.'),
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
      html: renderResultPage(false, '인증 응답 URL이 올바르지 않습니다.'),
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
      ),
    };
  }

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
      html: renderResultPage(false, inquiry.resultMsg || '결과조회에 실패했습니다.'),
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
      enc.providerDevCd || null,
      decrypted.userName,
      decrypted.userPhone,
      decrypted.userBirthday,
      decrypted.userGender ? String(decrypted.userGender).slice(0, 1) : null,
      decrypted.isForeign != null ? String(decrypted.isForeign).slice(0, 1) : null,
      decrypted.userCi,
      decrypted.userDi,
      ciHash,
      diHash,
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
      decryptStatus === 'skipped_no_token' || decryptStatus === 'skipped_no_iv'
        ? '인증은 완료되었습니다. (STEP2 token 또는 SEED IV가 없어 상세 복호화는 적용되지 않았습니다. 앱으로 돌아가 주세요.)'
        : '본인인증이 완료되었습니다. 앱으로 돌아가 주세요.',
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

function renderResultPage(ok, message) {
  const color = ok ? '#6f9163' : '#c0392b';
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>인증 결과</title></head>
<body style="font-family:sans-serif;padding:32px;text-align:center;">
  <h2 style="color:${color}">${ok ? '인증 완료' : '인증 실패'}</h2>
  <p>${escapeHtml(message || '')}</p>
  <p style="color:#888;font-size:13px;margin-top:24px;">이 창을 닫고 앱으로 돌아가 주세요.</p>
</body></html>`;
}

/** successUrl에 mTxId 쿼리 강제 — 콜백 매칭용 */
export function withMTxIdOnCallbackUrls(cfg, mTxId) {
  const add = (url) => {
    const u = new URL(url);
    u.searchParams.set('mTxId', mTxId);
    return u.toString();
  };
  return {
    ...cfg,
    successUrl: add(cfg.successUrl),
    failUrl: add(cfg.failUrl),
  };
}

export async function createInicisSessionWithCallbackQuery({ purpose }) {
  return createInicisSession({ purpose });
}

export async function getLaunchFormWithCallbackQuery(mTxId) {
  const base = await getLaunchForm(mTxId);
  const cfg = getInicisConfig();
  const patched = withMTxIdOnCallbackUrls(cfg, mTxId);
  base.fields.successUrl = patched.successUrl;
  base.fields.failUrl = patched.failUrl;
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
          name: row.name_enc || null,
          phoneNumber: row.phone_enc || null,
          birthDate: birthdayToIso(row.birthday_enc) || row.birthday_enc || null,
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

export { isInicisEnabled, getInicisConfig };

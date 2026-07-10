import crypto from 'crypto';

/**
 * KG 이니시스 통합인증 설정.
 * 기본 INICIS_ENABLED=false — 실호출·가입 유효성은 별도 전환.
 */
export function isInicisEnabled() {
  return String(process.env.INICIS_ENABLED || '').toLowerCase() === 'true';
}

export function getInicisConfig() {
  const mid = String(process.env.INICIS_MID || '').trim();
  const apiKey = String(process.env.INICIS_API_KEY || '').trim();
  const seedIv = String(process.env.INICIS_SEED_IV || '').trim();
  const seedKey = String(process.env.INICIS_SEED_KEY || '').trim();
  const diCode = String(process.env.INICIS_DI_CODE || '').trim();
  const reqSvcCd = String(process.env.INICIS_REQ_SVC_CD || '01').trim() || '01';

  const publicBase = String(
    process.env.INICIS_PUBLIC_BASE_URL ||
      process.env.PUBLIC_API_BASE_URL ||
      '',
  )
    .trim()
    .replace(/\/$/, '');

  const successUrl =
    String(process.env.INICIS_SUCCESS_URL || '').trim() ||
    (publicBase ? `${publicBase}/api/auth/inicis/callback/success` : '');
  const failUrl =
    String(process.env.INICIS_FAIL_URL || '').trim() ||
    (publicBase ? `${publicBase}/api/auth/inicis/callback/fail` : '');

  const authRequestUrl = getInicisAuthRequestUrl(reqSvcCd);

  return {
    mid,
    apiKey,
    seedIv,
    seedKey,
    diCode,
    reqSvcCd,
    publicBase,
    successUrl,
    failUrl,
    authRequestUrl,
    sessionTtlMinutes: Number(process.env.INICIS_SESSION_TTL_MINUTES || 30),
  };
}

export function getInicisAuthRequestUrl(reqSvcCd) {
  // 매뉴얼: 01·02 간편인증·전자서명 → /auth, 03 본인확인 → /id/auth
  return String(reqSvcCd) === '03'
    ? 'https://sa.inicis.com/id/auth'
    : 'https://sa.inicis.com/auth';
}

/** 간편인증(01)·전자서명(02) — 본인확인(03) 전용 필드 없음 */
export function isInicisIdentityVerification(reqSvcCd) {
  return String(reqSvcCd) === '03';
}

/** 앱 복귀 딥링크 allowlist */
export function isAllowedAppReturnUrl(url) {
  try {
    const u = new URL(String(url || '').trim());
    const scheme = u.protocol.replace(':', '').toLowerCase();
    const allowed = new Set([
      'youthpaper',
      'exp+youth-paper',
      'com.ucost.youthpaper',
    ]);
    if (!allowed.has(scheme)) return false;

    const path = u.pathname.replace(/\/$/, '') || '/';
    // Expo Linking.createURL('inicis/return') → youthpaper://inicis/return (host=inicis, path=/return)
    if (u.hostname === 'inicis' && path === '/return') return true;
    if (path === '/inicis/return' || path.endsWith('/inicis/return')) return true;
    return false;
  } catch {
    return false;
  }
}

export function assertInicisReadyForSession() {
  const cfg = getInicisConfig();
  const missing = [];
  if (!cfg.mid) missing.push('INICIS_MID');
  if (!cfg.apiKey) missing.push('INICIS_API_KEY');
  if (!cfg.successUrl || !cfg.failUrl) {
    missing.push('INICIS_PUBLIC_BASE_URL (또는 INICIS_SUCCESS_URL/FAIL_URL)');
  }
  return { cfg, missing };
}

/** SHA256 hex — mid + mTxId + apikey */
export function buildAuthHash({ mid, mTxId, apiKey }) {
  return crypto
    .createHash('sha256')
    .update(`${mid}${mTxId}${apiKey}`, 'utf8')
    .digest('hex');
}

/** mTxId: 요청마다 유일, ≤20 */
export function createMTxId() {
  const t = Date.now().toString(36);
  const r = crypto.randomBytes(4).toString('hex');
  return `${t}${r}`.slice(0, 20);
}

export function createClientToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashLookup(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const pepper =
    process.env.INICIS_PII_PEPPER ||
    process.env.PII_HMAC_KEY ||
    process.env.JWT_SECRET ||
    'inicis-dev-pepper';
  return crypto.createHmac('sha256', pepper).update(raw, 'utf8').digest('hex');
}

/**
 * SEED-CBC 복호화.
 * 매뉴얼(통합인증 복호화 팝업): KEY = STEP2 token 을 Base64 디코딩한 16byte, IV = 가맹점 SEED IV.
 * @param {string} cipherTextB64
 * @param {{ seedToken?: string, seedIv?: string, seedKey?: string }} opts
 */
export function tryDecryptInicisField(cipherTextB64, { seedToken, seedIv, seedKey }) {
  if (!cipherTextB64) return { ok: true, value: null, skipped: false };

  const tokenRaw = String(seedToken || '').trim();
  const ivRaw = String(seedIv || '').trim();
  const staticKeyRaw = String(seedKey || '').trim();

  if (!tokenRaw && !staticKeyRaw) {
    return { ok: false, value: null, skipped: true, reason: 'no_seed_token' };
  }
  if (!ivRaw) {
    return { ok: false, value: null, skipped: true, reason: 'no_seed_iv' };
  }

  try {
    let keyBuf;
    if (tokenRaw) {
      keyBuf = Buffer.from(tokenRaw, 'base64');
      if (keyBuf.length < 16) {
        return { ok: false, value: null, skipped: false, reason: 'invalid_token_key_len' };
      }
      keyBuf = keyBuf.subarray(0, 16);
    } else {
      keyBuf = Buffer.from(staticKeyRaw, 'utf8').subarray(0, 16);
    }

    const ivBuf = Buffer.from(ivRaw, 'utf8');
    const iv = ivBuf.length >= 16 ? ivBuf.subarray(0, 16) : Buffer.alloc(16);
    const data = Buffer.from(String(cipherTextB64), 'base64');

    const candidates = ['seed-cbc', 'aes-128-cbc'];
    let lastErr = null;
    for (const algo of candidates) {
      try {
        const key = algo === 'aes-128-cbc' ? keyBuf : keyBuf;
        const decipher = crypto.createDecipheriv(algo, key, iv);
        decipher.setAutoPadding(true);
        const plain = Buffer.concat([
          decipher.update(data),
          decipher.final(),
        ]).toString('utf8');
        if (plain && !plain.includes('\u0000')) {
          return { ok: true, value: plain.trim(), skipped: false, algo };
        }
      } catch (e) {
        lastErr = e;
      }
    }
    return {
      ok: false,
      value: null,
      skipped: false,
      reason: lastErr?.message || 'decrypt_failed',
    };
  } catch (e) {
    return { ok: false, value: null, skipped: false, reason: e?.message };
  }
}

export const INICIS_AUTH_REQUEST_ALLOWLIST = [
  'inicis.com',
  'sa.inicis.com',
  'fcsa.inicis.com',
  'kssa.inicis.com',
];

export function isAllowedAuthRequestUrl(url) {
  try {
    const u = new URL(String(url || ''));
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return INICIS_AUTH_REQUEST_ALLOWLIST.some(
      (d) => host === d || host.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

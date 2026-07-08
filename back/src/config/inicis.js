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
  const reqSvcCd = String(process.env.INICIS_REQ_SVC_CD || '03').trim() || '03';

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

  const authRequestUrl =
    reqSvcCd === '03'
      ? 'https://sa.inicis.com/id/auth'
      : 'https://sa.inicis.com/auth';

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
 * SEED-CBC 복호화 시도.
 * Key 미설정 시 null + skipped.
 * 알고리즘은 이니시스 샘플에 맞게 추후 조정 가능 (Node seed-cbc / openssl).
 */
export function tryDecryptInicisField(cipherTextB64, { seedKey, seedIv }) {
  if (!cipherTextB64) return { ok: true, value: null, skipped: false };
  if (!seedKey) {
    return { ok: false, value: null, skipped: true, reason: 'no_seed_key' };
  }
  try {
    // 많은 샘플이 Base64 cipher + latin1/utf8 key·iv. IV는 보통 16바이트.
    const keyBuf = Buffer.from(seedKey, 'utf8');
    const ivBuf = Buffer.from(seedIv || '', 'utf8');
    const data = Buffer.from(String(cipherTextB64), 'base64');

    // seed-cbc 미지원 환경 대비: AES로 잘못 열면 깨짐 → openssl seed 시도
    // Node 기본 cipher에 seed-cbc가 없을 수 있음.
    const candidates = ['seed-cbc', 'aes-128-cbc', 'aes-256-cbc'];
    let lastErr = null;
    for (const algo of candidates) {
      try {
        const key =
          algo.startsWith('aes-256')
            ? crypto.createHash('sha256').update(keyBuf).digest()
            : keyBuf.subarray(0, 16);
        const iv = ivBuf.length >= 16 ? ivBuf.subarray(0, 16) : Buffer.alloc(16);
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

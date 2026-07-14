import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

function getEncryptionKeyMaterial() {
  const raw =
    process.env.PII_ENCRYPTION_KEY ||
    process.env.OTP_ENCRYPTION_KEY ||
    '';
  if (!raw || String(raw).trim().length < 16) {
    const err = new Error('PII_ENCRYPTION_KEY_NOT_CONFIGURED');
    err.code = 'PII_ENCRYPTION_KEY_NOT_CONFIGURED';
    throw err;
  }
  return String(raw).trim();
}

function getHmacKeyMaterial() {
  const raw =
    process.env.PII_HMAC_KEY ||
    process.env.PII_ENCRYPTION_KEY ||
    process.env.OTP_ENCRYPTION_KEY ||
    '';
  if (!raw || String(raw).trim().length < 16) {
    const err = new Error('PII_HMAC_KEY_NOT_CONFIGURED');
    err.code = 'PII_HMAC_KEY_NOT_CONFIGURED';
    throw err;
  }
  return String(raw).trim();
}

function deriveAesKey() {
  return crypto.createHash('sha256').update(getEncryptionKeyMaterial()).digest();
}

function deriveHmacKey() {
  return crypto.createHash('sha256').update(`hmac:${getHmacKeyMaterial()}`).digest();
}

/** AES-256-GCM — 표시·재확인용 (이름, 전화번호, 생년월일) */
export function encryptPii(plaintext) {
  const value = plaintext == null ? '' : String(plaintext);
  if (!value) return null;
  const key = deriveAesKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptPii(encoded) {
  if (encoded == null || encoded === '') return null;
  const key = deriveAesKey();
  const buf = Buffer.from(String(encoded), 'base64');
  if (buf.length < 29) return null;
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}

/** 전화번호·이름 등 동일값 재조회용 HMAC (솔트 = type prefix) */
export function hmacPiiLookup(type, normalizedValue) {
  const value = normalizedValue == null ? '' : String(normalizedValue).trim();
  if (!value) return null;
  return crypto
    .createHmac('sha256', deriveHmacKey())
    .update(`${type}:${value}`)
    .digest('hex');
}

export function isPiiCryptoConfigured() {
  try {
    getEncryptionKeyMaterial();
    getHmacKeyMaterial();
    return true;
  } catch {
    return false;
  }
}

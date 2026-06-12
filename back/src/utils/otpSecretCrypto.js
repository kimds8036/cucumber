import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

function getEncryptionKey() {
  const raw = process.env.OTP_ENCRYPTION_KEY;
  if (!raw || String(raw).trim().length < 16) {
    const err = new Error('OTP_ENCRYPTION_KEY_NOT_CONFIGURED');
    err.code = 'OTP_ENCRYPTION_KEY_NOT_CONFIGURED';
    throw err;
  }
  return crypto.createHash('sha256').update(String(raw)).digest();
}

export function encryptOtpSecret(plainSecret) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plainSecret), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptOtpSecret(encoded) {
  const key = getEncryptionKey();
  const buf = Buffer.from(String(encoded), 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}

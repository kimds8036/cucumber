import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import pool from '../config/database.js';
import {
  decryptOtpSecret,
  encryptOtpSecret,
} from '../utils/otpSecretCrypto.js';

const ISSUER = process.env.ADMIN_OTP_ISSUER || 'Youth Paper Admin';

export function generateTotpSecret() {
  return generateSecret();
}

export async function verifyTotpCode(code, secret) {
  const token = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(token)) return false;
  const result = await verify({ secret, token });
  return Boolean(result?.valid);
}

export async function buildTotpQrDataUrl({ secret, username }) {
  const otpauthUrl = generateURI({
    issuer: ISSUER,
    label: username || 'admin',
    secret,
  });
  return QRCode.toDataURL(otpauthUrl);
}

export async function getAdminTotpRow(userId) {
  const [rows] = await pool.execute(
    `SELECT user_id, secret_enc, confirmed_at
     FROM admin_totp_secrets
     WHERE user_id = ?
     LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

export async function createPendingTotpSecret(userId, plainSecret) {
  const secretEnc = encryptOtpSecret(plainSecret);
  await pool.execute(
    `INSERT INTO admin_totp_secrets (user_id, secret_enc, confirmed_at)
     VALUES (?, ?, NULL)
     ON DUPLICATE KEY UPDATE
       secret_enc = VALUES(secret_enc),
       confirmed_at = NULL,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, secretEnc],
  );
}

export async function confirmAdminTotpSecret(userId, plainSecret) {
  const secretEnc = encryptOtpSecret(plainSecret);
  await pool.execute(
    `INSERT INTO admin_totp_secrets (user_id, secret_enc, confirmed_at)
     VALUES (?, ?, UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       secret_enc = VALUES(secret_enc),
       confirmed_at = UTC_TIMESTAMP(),
       updated_at = CURRENT_TIMESTAMP`,
    [userId, secretEnc],
  );
}

export async function getConfirmedTotpSecret(userId) {
  const row = await getAdminTotpRow(userId);
  if (!row?.confirmed_at) return null;
  return decryptOtpSecret(row.secret_enc);
}

export async function getPendingTotpSecret(userId) {
  const row = await getAdminTotpRow(userId);
  if (!row || row.confirmed_at) return null;
  return decryptOtpSecret(row.secret_enc);
}

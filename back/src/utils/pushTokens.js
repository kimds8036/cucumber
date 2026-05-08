import pool from '../config/database.js';

function normalizeToken(value) {
  return String(value || '').trim();
}

function normalizeDeviceType(deviceType) {
  const value = String(deviceType || '').toLowerCase();
  if (value === 'ios' || value === 'android') return value;
  return null;
}

export async function upsertFcmToken({
  userId,
  token,
  deviceType = null,
  appVersion = null,
}) {
  const safeToken = normalizeToken(token);
  if (!userId || !safeToken) return false;

  const safeDeviceType = normalizeDeviceType(deviceType);
  const safeAppVersion = appVersion ? String(appVersion).slice(0, 30) : null;

  await pool.execute(
    `INSERT INTO fcm_tokens (user_id, token, device_type, app_version, is_active, last_used_at)
     VALUES (?, ?, ?, ?, TRUE, NOW())
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       device_type = COALESCE(VALUES(device_type), device_type),
       app_version = COALESCE(VALUES(app_version), app_version),
       is_active = TRUE,
       last_used_at = NOW(),
       updated_at = NOW()`,
    [userId, safeToken, safeDeviceType, safeAppVersion],
  );

  // 점진 이전을 위해 legacy 컬럼도 유지
  await pool.execute('UPDATE users SET fcm_token = ? WHERE id = ?', [
    safeToken,
    userId,
  ]);

  // 동일한 토큰을 가지고 있는 다른 사용자의 legacy fcm_token 컬럼은 NULL 처리
  // (한 디바이스에서 여러 계정으로 로그인했을 때 이전 사용자에게 푸시가 가지 않도록)
  await pool.execute(
    'UPDATE users SET fcm_token = NULL WHERE fcm_token = ? AND id <> ?',
    [safeToken, userId],
  );

  return true;
}

export async function getUserFcmTokens(userId) {
  if (!userId) return [];
  const [rows] = await pool.execute(
    `SELECT token
     FROM fcm_tokens
     WHERE user_id = ? AND is_active = TRUE
     ORDER BY last_used_at DESC, updated_at DESC`,
    [userId],
  );

  const tokens = rows
    .map((row) => normalizeToken(row.token))
    .filter((token) => token.length > 0);

  if (tokens.length > 0) return Array.from(new Set(tokens));

  const [legacyRows] = await pool.execute(
    'SELECT fcm_token FROM users WHERE id = ? LIMIT 1',
    [userId],
  );
  const legacyToken = normalizeToken(legacyRows?.[0]?.fcm_token);
  return legacyToken ? [legacyToken] : [];
}

export async function deactivateFcmTokens(tokens = []) {
  const clean = Array.from(
    new Set(tokens.map((token) => normalizeToken(token)).filter(Boolean)),
  );
  if (clean.length === 0) return 0;

  const placeholders = clean.map(() => '?').join(',');
  const [result] = await pool.execute(
    `UPDATE fcm_tokens
     SET is_active = FALSE, updated_at = NOW()
     WHERE token IN (${placeholders})`,
    clean,
  );
  return result?.affectedRows || 0;
}

export async function getUnreadNotificationBadge(userId) {
  if (!userId) return 0;
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS unread
     FROM notifications
     WHERE user_id = ? AND is_read = FALSE`,
    [userId],
  );
  return Number(rows?.[0]?.unread ?? 0);
}

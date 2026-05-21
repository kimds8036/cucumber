import pool from '../config/database.js';

function normalizeToken(value) {
  return String(value || '').trim();
}

function normalizeDeviceId(value) {
  const id = String(value || '').trim();
  if (!id) return null;
  return id.slice(0, 64);
}

function normalizeDeviceType(deviceType) {
  const value = String(deviceType || '').toLowerCase();
  if (value === 'ios' || value === 'android') return value;
  return null;
}

/**
 * 멀티 디바이스: (user_id, device_id)당 active 토큰 1개.
 * 토큰 갱신 시 같은 device_id 행만 교체, 다른 기기 토큰은 유지.
 */
export async function upsertFcmToken({
  userId,
  token,
  deviceId = null,
  deviceType = null,
  appVersion = null,
}) {
  const safeToken = normalizeToken(token);
  const safeDeviceId = normalizeDeviceId(deviceId);
  if (!userId || !safeToken || !safeDeviceId) return false;

  const safeDeviceType = normalizeDeviceType(deviceType);
  const safeAppVersion = appVersion ? String(appVersion).slice(0, 30) : null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE fcm_tokens
       SET is_active = FALSE, updated_at = NOW()
       WHERE token = ? AND user_id <> ?`,
      [safeToken, userId],
    );

    await connection.execute(
      `UPDATE fcm_tokens
       SET is_active = FALSE, updated_at = NOW()
       WHERE user_id = ? AND device_id = ? AND token <> ?`,
      [userId, safeDeviceId, safeToken],
    );

    const [byDevice] = await connection.execute(
      `UPDATE fcm_tokens
       SET token = ?,
           device_type = COALESCE(?, device_type),
           app_version = COALESCE(?, app_version),
           is_active = TRUE,
           last_used_at = NOW(),
           updated_at = NOW()
       WHERE user_id = ? AND device_id = ?`,
      [
        safeToken,
        safeDeviceType,
        safeAppVersion,
        userId,
        safeDeviceId,
      ],
    );

    if (byDevice.affectedRows === 0) {
      const [byToken] = await connection.execute(
        `UPDATE fcm_tokens
         SET user_id = ?,
             device_id = ?,
             device_type = COALESCE(?, device_type),
             app_version = COALESCE(?, app_version),
             is_active = TRUE,
             last_used_at = NOW(),
             updated_at = NOW()
         WHERE token = ?`,
        [
          userId,
          safeDeviceId,
          safeDeviceType,
          safeAppVersion,
          safeToken,
        ],
      );

      if (byToken.affectedRows === 0) {
        await connection.execute(
          `INSERT INTO fcm_tokens
             (user_id, device_id, token, device_type, app_version, is_active, last_used_at)
           VALUES (?, ?, ?, ?, ?, TRUE, NOW())`,
          [
            userId,
            safeDeviceId,
            safeToken,
            safeDeviceType,
            safeAppVersion,
          ],
        );
      }
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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

  return Array.from(
    new Set(
      rows
        .map((row) => normalizeToken(row.token))
        .filter((token) => token.length > 0),
    ),
  );
}

export async function userHasActiveFcmTokens(userId) {
  if (!userId) return false;
  const [rows] = await pool.execute(
    `SELECT 1
     FROM fcm_tokens
     WHERE user_id = ? AND is_active = TRUE
     LIMIT 1`,
    [userId],
  );
  return rows.length > 0;
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

/** 로그아웃: 이 기기(device_id) 및/또는 현재 FCM 토큰 비활성화 */
export async function deactivateFcmTokenForSession({
  userId,
  token = null,
  deviceId = null,
}) {
  if (!userId) return 0;
  let affected = 0;

  const safeToken = normalizeToken(token);
  if (safeToken) {
    affected += await deactivateFcmTokens([safeToken]);
  }

  const safeDeviceId = normalizeDeviceId(deviceId);
  if (safeDeviceId) {
    const [result] = await pool.execute(
      `UPDATE fcm_tokens
       SET is_active = FALSE, updated_at = NOW()
       WHERE user_id = ? AND device_id = ? AND is_active = TRUE`,
      [userId, safeDeviceId],
    );
    affected += result?.affectedRows || 0;
  }

  return affected;
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

import pool from '../config/database.js';
import { formatKstDateYmd } from './reverification.service.js';

function normalizePlatform(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (s === 'ios' || s === 'iphone' || s === 'ipad') return 'ios';
  if (s === 'android') return 'android';
  if (!s) return null;
  return 'other';
}

/**
 * 로그인 유저 인앱 마지막 접속 시각 갱신
 * @param {number} userId
 */
export async function touchUserLastSeen(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) return false;
  await pool.execute(
    `UPDATE users SET last_seen_at = NOW() WHERE id = ? AND is_deleted = FALSE`,
    [id],
  );
  return true;
}

/**
 * 로그인 전 설치·실행 기록 (미가입 퍼널)
 */
export async function recordAppInstallOpen({
  installId,
  deviceId = null,
  platform = null,
  appVersion = null,
} = {}) {
  const id = String(installId || '').trim().slice(0, 64);
  if (!id) {
    const err = new Error('installId가 필요합니다.');
    err.status = 400;
    throw err;
  }
  const device = deviceId ? String(deviceId).trim().slice(0, 128) : null;
  const plat = normalizePlatform(platform);
  const version = appVersion ? String(appVersion).trim().slice(0, 32) : null;

  await pool.execute(
    `INSERT INTO app_installs
       (install_id, device_id, platform, app_version, first_open_at, last_open_at)
     VALUES (?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       last_open_at = NOW(),
       device_id = COALESCE(VALUES(device_id), device_id),
       platform = COALESCE(VALUES(platform), platform),
       app_version = COALESCE(VALUES(app_version), app_version)`,
    [id, device || null, plat, version],
  );
  return { installId: id };
}

/**
 * 가입·로그인 성공 시 설치 → 유저 전환 (이탈 집계에서 제외)
 */
export async function convertAppInstall({
  installId = null,
  deviceId = null,
  userId,
} = {}) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) {
    const err = new Error('userId가 필요합니다.');
    err.status = 400;
    throw err;
  }
  const iid = installId ? String(installId).trim().slice(0, 64) : '';
  const device = deviceId ? String(deviceId).trim().slice(0, 128) : '';

  let affected = 0;
  if (iid) {
    const [r] = await pool.execute(
      `UPDATE app_installs
       SET converted_user_id = ?, converted_at = NOW()
       WHERE install_id = ?
         AND converted_user_id IS NULL`,
      [uid, iid],
    );
    affected += Number(r?.affectedRows || 0);
  }
  if (device && affected === 0) {
    const [r] = await pool.execute(
      `UPDATE app_installs
       SET converted_user_id = ?, converted_at = NOW()
       WHERE device_id = ?
         AND converted_user_id IS NULL`,
      [uid, device],
    );
    affected += Number(r?.affectedRows || 0);
  }
  return { converted: affected > 0, affected };
}

/**
 * 관리자: 설치 퍼널 요약
 */
export async function getAppInstallFunnelSummary() {
  const todayYmd = formatKstDateYmd(new Date());
  const dayStart = new Date(`${todayYmd}T00:00:00+09:00`);
  const dayEnd = new Date(`${todayYmd}T24:00:00+09:00`);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [[row]] = await pool.execute(
    `SELECT
       SUM(converted_user_id IS NULL) AS open_unconverted,
       SUM(
         converted_user_id IS NULL
         AND first_open_at >= ? AND first_open_at < ?
       ) AS first_open_today_unconverted,
       SUM(
         converted_user_id IS NOT NULL
         AND converted_at >= ? AND converted_at < ?
       ) AS converted_today,
       SUM(
         converted_user_id IS NOT NULL
         AND converted_at >= ?
       ) AS converted_7d,
       SUM(
         converted_user_id IS NULL
         AND first_open_at >= ?
       ) AS first_open_7d_unconverted
     FROM app_installs`,
    [dayStart, dayEnd, dayStart, dayEnd, weekAgo, weekAgo],
  );
  return {
    openUnconverted: Number(row?.open_unconverted || 0),
    firstOpenTodayUnconverted: Number(row?.first_open_today_unconverted || 0),
    convertedToday: Number(row?.converted_today || 0),
    converted7d: Number(row?.converted_7d || 0),
    firstOpen7dUnconverted: Number(row?.first_open_7d_unconverted || 0),
    todayYmd,
  };
}

import pool from '../config/database.js';
import { formatKstDateYmd } from './reverification.service.js';

function normalizePlatform(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (s === 'ios' || s === 'iphone' || s === 'ipad') return 'ios';
  if (s === 'android') return 'android';
  if (!s) return null;
  return 'other';
}

function addDaysYmd(ymd, delta) {
  const d = new Date(`${ymd}T12:00:00+09:00`);
  d.setDate(d.getDate() + delta);
  return formatKstDateYmd(d);
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
 * 관리자: 설치 퍼널 요약 + 14일 추이
 * @param {{ days?: number }} opts
 */
export async function getAppInstallFunnelSummary({ days = 14 } = {}) {
  const windowDays = Math.min(Math.max(Number(days) || 14, 7), 31);
  const todayYmd = formatKstDateYmd(new Date());
  const dayStart = new Date(`${todayYmd}T00:00:00+09:00`);
  const dayEnd = new Date(`${todayYmd}T24:00:00+09:00`);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rangeStartYmd = addDaysYmd(todayYmd, -(windowDays - 1));
  const rangeStart = new Date(`${rangeStartYmd}T00:00:00+09:00`);

  const [[row]] = await pool.execute(
    `SELECT
       COUNT(*) AS total_installs,
       SUM(converted_user_id IS NULL) AS open_unconverted,
       SUM(converted_user_id IS NOT NULL) AS converted_total,
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
       ) AS first_open_7d_unconverted,
       SUM(
         converted_user_id IS NULL
         AND first_open_at < ?
       ) AS unconverted_older_1d,
       SUM(
         converted_user_id IS NULL
         AND first_open_at < ?
       ) AS unconverted_older_3d,
       SUM(
         converted_user_id IS NULL
         AND first_open_at < ?
       ) AS unconverted_older_7d
     FROM app_installs`,
    [
      dayStart,
      dayEnd,
      dayStart,
      dayEnd,
      weekAgo,
      weekAgo,
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    ],
  );

  const [platRows] = await pool.execute(
    `SELECT COALESCE(platform, 'unknown') AS platform, COUNT(*) AS cnt
     FROM app_installs
     WHERE converted_user_id IS NULL
     GROUP BY COALESCE(platform, 'unknown')`,
  );
  const platformUnconverted = { ios: 0, android: 0, other: 0, unknown: 0 };
  for (const r of platRows) {
    const key = String(r.platform || 'unknown');
    if (key === 'ios' || key === 'android' || key === 'other') {
      platformUnconverted[key] = Number(r.cnt || 0);
    } else {
      platformUnconverted.unknown += Number(r.cnt || 0);
    }
  }

  const [openRows] = await pool.execute(
    `SELECT first_open_at, converted_user_id
     FROM app_installs
     WHERE first_open_at >= ?`,
    [rangeStart],
  );
  const [convRows] = await pool.execute(
    `SELECT converted_at
     FROM app_installs
     WHERE converted_at IS NOT NULL AND converted_at >= ?`,
    [rangeStart],
  );

  const openByDay = new Map();
  for (const r of openRows) {
    const ymd = formatKstDateYmd(r.first_open_at);
    if (!ymd) continue;
    const cur = openByDay.get(ymd) || { firstOpens: 0, stillOpen: 0 };
    cur.firstOpens += 1;
    if (r.converted_user_id == null) cur.stillOpen += 1;
    openByDay.set(ymd, cur);
  }
  const convByDay = new Map();
  for (const r of convRows) {
    const ymd = formatKstDateYmd(r.converted_at);
    if (!ymd) continue;
    convByDay.set(ymd, (convByDay.get(ymd) || 0) + 1);
  }

  const series = [];
  for (let i = 0; i < windowDays; i += 1) {
    const ymd = addDaysYmd(rangeStartYmd, i);
    const open = openByDay.get(ymd) || { firstOpens: 0, stillOpen: 0 };
    series.push({
      ymd,
      firstOpens: open.firstOpens,
      stillOpenFromDay: open.stillOpen,
      converted: convByDay.get(ymd) || 0,
    });
  }

  const totalInstalls = Number(row?.total_installs || 0);
  const convertedTotal = Number(row?.converted_total || 0);
  const openUnconverted = Number(row?.open_unconverted || 0);
  const convertRate =
    totalInstalls > 0
      ? Math.round((convertedTotal / totalInstalls) * 1000) / 10
      : 0;

  return {
    openUnconverted,
    firstOpenTodayUnconverted: Number(row?.first_open_today_unconverted || 0),
    convertedToday: Number(row?.converted_today || 0),
    converted7d: Number(row?.converted_7d || 0),
    firstOpen7dUnconverted: Number(row?.first_open_7d_unconverted || 0),
    unconvertedOlder1d: Number(row?.unconverted_older_1d || 0),
    unconvertedOlder3d: Number(row?.unconverted_older_3d || 0),
    unconvertedOlder7d: Number(row?.unconverted_older_7d || 0),
    totalInstalls,
    convertedTotal,
    convertRatePct: convertRate,
    platformUnconverted,
    series,
    days: windowDays,
    todayYmd,
  };
}

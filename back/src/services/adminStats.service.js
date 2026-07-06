import pool from '../config/database.js';
import { formatKstDateYmd, getKstNow } from './reverification.service.js';
import { getBatchRedis, isRedisConfigured } from './batchRedis.service.js';

const REDIS_SUMMARY_KEY = 'admin:stats:summary';
const REDIS_SUMMARY_TTL = 90;

function kstToday() {
  return formatKstDateYmd(getKstNow());
}

async function cacheSummary(data) {
  if (!isRedisConfigured()) return;
  try {
    const redis = await getBatchRedis();
    await redis.setex(REDIS_SUMMARY_KEY, REDIS_SUMMARY_TTL, JSON.stringify(data));
  } catch {
    // ignore
  }
}

async function readCachedSummary() {
  if (!isRedisConfigured()) return null;
  try {
    const redis = await getBatchRedis();
    const raw = await redis.get(REDIS_SUMMARY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function readSnapshot(statKey, statDate) {
  const [rows] = await pool.execute(
    `SELECT stat_value FROM admin_stats_snapshots WHERE stat_key = ? AND stat_date = ? LIMIT 1`,
    [statKey, statDate],
  );
  return Number(rows[0]?.stat_value ?? NaN);
}

async function upsertSnapshot(statKey, statDate, value) {
  await pool.execute(
    `INSERT INTO admin_stats_snapshots (stat_key, stat_date, stat_value)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE stat_value = VALUES(stat_value), updated_at = NOW()`,
    [statKey, statDate, Number(value) || 0],
  );
}

export async function reconcileAdminStats() {
  const today = kstToday();

  const queries = {
    today_new_reports: `SELECT COUNT(*) AS c FROM reports WHERE DATE(CONVERT_TZ(created_at, '+00:00', '+09:00')) = ?`,
    pending_reports: `SELECT COUNT(*) AS c FROM reports WHERE status = 'pending'`,
    pending_appeals: `SELECT COUNT(*) AS c FROM report_appeals WHERE status = 'pending'`,
    today_handled_reports: `SELECT COUNT(*) AS c FROM reports WHERE reviewed_at IS NOT NULL AND DATE(CONVERT_TZ(reviewed_at, '+00:00', '+09:00')) = ?`,
    today_new_inquiries: `SELECT COUNT(*) AS c FROM inquiries WHERE is_deleted = FALSE AND DATE(CONVERT_TZ(created_at, '+00:00', '+09:00')) = ?`,
    pending_inquiries: `SELECT COUNT(*) AS c FROM inquiries WHERE status = 'pending' AND is_deleted = FALSE`,
    today_answered_inquiries: `SELECT COUNT(*) AS c FROM inquiries WHERE answered_at IS NOT NULL AND DATE(CONVERT_TZ(answered_at, '+00:00', '+09:00')) = ?`,
    delayed_reports_3d: `SELECT COUNT(*) AS c FROM reports WHERE status = 'pending' AND created_at < DATE_SUB(NOW(), INTERVAL 3 DAY)`,
  };

  const results = {};
  for (const [key, sql] of Object.entries(queries)) {
    const params = sql.includes('= ?') ? [today] : [];
    const [rows] = await pool.execute(sql, params);
    const val = Number(rows[0]?.c || 0);
    results[key] = val;
    const dateKey = key.startsWith('pending_') || key === 'delayed_reports_3d' ? today : today;
    await upsertSnapshot(key, dateKey, val);
  }
  await cacheSummary(results);
  return results;
}

export async function getAdminDashboardStats({ refresh = false } = {}) {
  if (!refresh) {
    const cached = await readCachedSummary();
    if (cached) return cached;
  }

  const today = kstToday();
  const keys = [
    'today_new_reports',
    'pending_reports',
    'pending_appeals',
    'today_handled_reports',
    'today_new_inquiries',
    'pending_inquiries',
    'today_answered_inquiries',
    'delayed_reports_3d',
  ];

  const fromDb = {};
  let missing = false;
  for (const key of keys) {
    const v = await readSnapshot(key, today);
    if (Number.isFinite(v)) fromDb[key] = v;
    else missing = true;
  }

  if (!missing) {
    await cacheSummary(fromDb);
    return fromDb;
  }

  return reconcileAdminStats();
}

export function mapDashboardStatsToApi(stats) {
  return {
    todayNewReports: stats.today_new_reports || 0,
    pendingReports: stats.pending_reports || 0,
    pendingAppeals: stats.pending_appeals || 0,
    todayHandledReports: stats.today_handled_reports || 0,
    todayNewInquiries: stats.today_new_inquiries || 0,
    pendingInquiries: stats.pending_inquiries || 0,
    todayAnsweredInquiries: stats.today_answered_inquiries || 0,
    delayedReports3d: stats.delayed_reports_3d || 0,
  };
}

export async function bumpAdminStat(statKey, delta = 1) {
  const today = kstToday();
  await pool.execute(
    `INSERT INTO admin_stats_snapshots (stat_key, stat_date, stat_value)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE stat_value = GREATEST(0, stat_value + VALUES(stat_value))`,
    [statKey, today, Number(delta) || 0],
  );
  if (isRedisConfigured()) {
    try {
      const redis = await getBatchRedis();
      await redis.del(REDIS_SUMMARY_KEY);
    } catch {
      // ignore
    }
  }
}

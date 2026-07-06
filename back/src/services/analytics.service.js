import crypto from 'crypto';
import pool from '../config/database.js';
import { getBatchRedis, isRedisConfigured } from './batchRedis.service.js';
import { formatKstDateYmd, getKstNow } from './reverification.service.js';

const REDIS_KEY_TTL_SECONDS = Number(process.env.ANALYTICS_REDIS_TTL_SECONDS || 172800);
const MAU_ROLLING_DAYS = Number(process.env.ANALYTICS_MAU_ROLLING_DAYS || 30);
const HEATMAP_SLOT_COUNT = 7 * 24;

const VALID_EVENT_TYPES = new Set(['screen_view', 'session_ping']);
const MAX_EVENTS_PER_REQUEST = 30;

export function isAnalyticsEnabled() {
  const raw = (process.env.ANALYTICS_ENABLED ?? 'true').toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

function getAnalyticsPepper() {
  return process.env.ANALYTICS_PEPPER || process.env.JWT_SECRET || 'analytics-dev-pepper';
}

export function hashUserIdForAnalytics(userId) {
  const normalized = String(userId);
  return crypto
    .createHash('sha256')
    .update(`${normalized}:${getAnalyticsPepper()}`)
    .digest('hex');
}

export function dauRedisKey(statDate) {
  return `analytics:dau:${statDate}`;
}

export function heatmapRedisKey(statDate, dow, hour) {
  return `analytics:heatmap:${statDate}:${dow}:${hour}`;
}

export function addDaysToYmd(ymd, deltaDays) {
  const [y, m, d] = ymd.split('-').map(Number);
  const ref = new Date(
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00+09:00`,
  );
  const shifted = new Date(ref.getTime() + deltaDays * 86_400_000);
  return formatKstDateYmd(shifted);
}

export function getYesterdayKstYmd(ref = new Date()) {
  return addDaysToYmd(formatKstDateYmd(getKstNow(ref)), -1);
}

export function getRollingDateRange(endYmd, windowDays) {
  const days = Math.max(1, Math.floor(windowDays));
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    out.push(addDaysToYmd(endYmd, -i));
  }
  return out;
}

export function isValidAnalyticsEventsPayload(events) {
  if (!Array.isArray(events) || events.length === 0) return false;
  if (events.length > MAX_EVENTS_PER_REQUEST) return false;
  return events.some((event) => VALID_EVENT_TYPES.has(String(event?.type || '').trim()));
}

/**
 * 수집 hot path — MySQL 접근 없음, Redis pipeline만 사용.
 */
export async function recordAnalyticsActivity(userId) {
  if (!isAnalyticsEnabled()) {
    return { recorded: false, reason: 'disabled' };
  }
  if (!isRedisConfigured()) {
    return { recorded: false, reason: 'redis-not-configured' };
  }

  const now = getKstNow();
  const statDate = formatKstDateYmd(now);
  const dow = now.getDay();
  const hour = now.getHours();
  const hashedUser = hashUserIdForAnalytics(userId);

  try {
    const redis = await getBatchRedis();
    const pipe = redis.pipeline();
    pipe.pfadd(dauRedisKey(statDate), hashedUser);
    pipe.incr(heatmapRedisKey(statDate, dow, hour));
    pipe.expire(dauRedisKey(statDate), REDIS_KEY_TTL_SECONDS);
    pipe.expire(heatmapRedisKey(statDate, dow, hour), REDIS_KEY_TTL_SECONDS);
    await pipe.exec();
    return { recorded: true };
  } catch (error) {
    console.error('[Analytics] record failed:', error.message);
    return { recorded: false, reason: 'redis-error' };
  }
}

async function readHeatmapSlots(redis, statDate) {
  const slots = new Array(HEATMAP_SLOT_COUNT).fill(0);
  const pipe = redis.pipeline();
  for (let dow = 0; dow < 7; dow += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      pipe.get(heatmapRedisKey(statDate, dow, hour));
    }
  }
  const results = await pipe.exec();
  results.forEach((row, index) => {
    const value = Array.isArray(row) ? row[1] : 0;
    slots[index] = Number(value || 0);
  });
  return slots;
}

async function computeRollingMau(redis, endYmd, windowDays) {
  const dateRange = getRollingDateRange(endYmd, windowDays);
  const keys = dateRange.map((date) => dauRedisKey(date));
  const existsFlags = await Promise.all(keys.map((key) => redis.exists(key)));
  const sourceKeys = keys.filter((_, index) => existsFlags[index]);
  if (sourceKeys.length === 0) return 0;

  const tmpKey = `analytics:mau:tmp:${endYmd}`;
  try {
    await redis.pfmerge(tmpKey, ...sourceKeys);
    const count = await redis.pfcount(tmpKey);
    return Number(count || 0);
  } finally {
    await redis.del(tmpKey);
  }
}

async function applyPostReconcileTtl(redis, statDate) {
  const pipe = redis.pipeline();
  pipe.expire(dauRedisKey(statDate), REDIS_KEY_TTL_SECONDS);
  for (let dow = 0; dow < 7; dow += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      pipe.expire(heatmapRedisKey(statDate, dow, hour), REDIS_KEY_TTL_SECONDS);
    }
  }
  await pipe.exec();
}

async function upsertDailySnapshot({
  statDate,
  dauCount,
  mauCount,
  heatmapSlots,
}) {
  const heatmapJson = JSON.stringify({
    version: 1,
    format: 'dow*24+hour',
    dow: 7,
    hours: 24,
    slots: heatmapSlots,
  });

  await pool.execute(
    `INSERT INTO analytics_daily_snapshots
       (stat_date, dau_count, mau_rolling_30d_count, heatmap_json, reconciled_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       dau_count = VALUES(dau_count),
       mau_rolling_30d_count = VALUES(mau_rolling_30d_count),
       heatmap_json = VALUES(heatmap_json),
       reconciled_at = NOW()`,
    [statDate, Number(dauCount) || 0, Number(mauCount) || 0, heatmapJson],
  );
}

/**
 * 지정 일자(KST) Redis 집계를 MySQL 스냅샷으로 정산.
 */
export async function reconcileAnalyticsForDate(statDate) {
  if (!isRedisConfigured()) {
    throw new Error('Redis가 설정되지 않아 analytics 정산을 수행할 수 없습니다.');
  }

  const redis = await getBatchRedis();
  const dauCount = Number(await redis.pfcount(dauRedisKey(statDate)) || 0);
  const heatmapSlots = await readHeatmapSlots(redis, statDate);
  const mauCount = await computeRollingMau(redis, statDate, MAU_ROLLING_DAYS);

  await upsertDailySnapshot({
    statDate,
    dauCount,
    mauCount,
    heatmapSlots,
  });
  await applyPostReconcileTtl(redis, statDate);

  return {
    statDate,
    dauCount,
    mauCount,
    heatmapTotal: heatmapSlots.reduce((sum, n) => sum + n, 0),
  };
}

export async function reconcileYesterdayAnalytics() {
  const statDate = getYesterdayKstYmd();
  return reconcileAnalyticsForDate(statDate);
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function statDateToYmd(value) {
  if (typeof value === 'string') return value.slice(0, 10);
  const d = new Date(value);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeHeatmapSlots(rawJson) {
  try {
    const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
    const slots = Array.isArray(parsed?.slots) ? parsed.slots : [];
    const normalized = new Array(HEATMAP_SLOT_COUNT).fill(0);
    for (let i = 0; i < Math.min(slots.length, HEATMAP_SLOT_COUNT); i += 1) {
      normalized[i] = toNumber(slots[i], 0);
    }
    return normalized;
  } catch {
    return new Array(HEATMAP_SLOT_COUNT).fill(0);
  }
}

function addSlots(target, source) {
  for (let i = 0; i < HEATMAP_SLOT_COUNT; i += 1) {
    target[i] += toNumber(source[i], 0);
  }
}

async function readTodayPreview() {
  const statDate = formatKstDateYmd(getKstNow());
  const preview = {
    statDate,
    dauCount: 0,
    heatmapSlots: new Array(HEATMAP_SLOT_COUNT).fill(0),
  };

  if (!isRedisConfigured()) return preview;

  try {
    const redis = await getBatchRedis();
    preview.dauCount = toNumber(await redis.pfcount(dauRedisKey(statDate)), 0);
    preview.heatmapSlots = await readHeatmapSlots(redis, statDate);
    return preview;
  } catch {
    return preview;
  }
}

/**
 * 관리자 대시보드용 제품 분석 개요 데이터.
 */
export async function getAnalyticsOverview({ days = 14 } = {}) {
  const safeDays = Math.max(7, Math.min(60, Number(days) || 14));
  const endDate = getYesterdayKstYmd();
  const startDate = addDaysToYmd(endDate, -(safeDays - 1));

  const [rows] = await pool.execute(
    `SELECT stat_date, dau_count, mau_rolling_30d_count, heatmap_json, reconciled_at
     FROM analytics_daily_snapshots
     WHERE stat_date BETWEEN ? AND ?
     ORDER BY stat_date ASC`,
    [startDate, endDate],
  );

  const rowByDate = new Map(
    rows.map((row) => [
      statDateToYmd(row.stat_date),
      {
        date: statDateToYmd(row.stat_date),
        dauCount: toNumber(row.dau_count),
        mauRolling30dCount: toNumber(row.mau_rolling_30d_count),
        heatmapSlots: normalizeHeatmapSlots(row.heatmap_json),
        reconciledAt: row.reconciled_at || null,
      },
    ]),
  );

  const dateRange = getRollingDateRange(endDate, safeDays);
  const series = dateRange.map((date) => {
    const row = rowByDate.get(date);
    return {
      date,
      dauCount: row?.dauCount || 0,
      mauRolling30dCount: row?.mauRolling30dCount || 0,
    };
  });

  const heatmapWeekly = new Array(HEATMAP_SLOT_COUNT).fill(0);
  for (const row of rowByDate.values()) {
    addSlots(heatmapWeekly, row.heatmapSlots);
  }

  const todayPreview = await readTodayPreview();
  addSlots(heatmapWeekly, todayPreview.heatmapSlots);

  const dauValues = series.map((item) => item.dauCount);
  const latest = series[series.length - 1] || { dauCount: 0, mauRolling30dCount: 0 };
  const first = series[0] || { dauCount: 0 };
  const dauTrendPct = first.dauCount > 0
    ? Number((((latest.dauCount - first.dauCount) / first.dauCount) * 100).toFixed(1))
    : null;

  return {
    range: { startDate, endDate, days: safeDays },
    series,
    todayPreview: {
      statDate: todayPreview.statDate,
      dauCount: todayPreview.dauCount,
      heatmapTotal: todayPreview.heatmapSlots.reduce((sum, n) => sum + n, 0),
    },
    summary: {
      latestDau: latest.dauCount,
      latestMauRolling30d: latest.mauRolling30dCount,
      avgDau: Math.round(
        dauValues.reduce((sum, n) => sum + n, 0) / Math.max(1, dauValues.length),
      ),
      dauTrendPct,
    },
    heatmapWeekly,
  };
}

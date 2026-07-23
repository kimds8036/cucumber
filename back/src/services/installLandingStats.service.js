import crypto from 'crypto';
import pool from '../config/database.js';
import { addDaysToYmd } from './analytics.service.js';
import { getBatchRedis, isRedisConfigured } from './batchRedis.service.js';
import { formatKstDateYmd, getKstNow } from './reverification.service.js';

const UV_TTL_SECONDS = 60 * 60 * 24 * 45; // 45일

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function statDateToYmd(value) {
  if (typeof value === 'string') return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value || '').slice(0, 10);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizePlatform(platform) {
  const p = String(platform || '').toLowerCase();
  if (p === 'ios' || p === 'android') return p;
  return 'other';
}

function hashVisitorKey(req) {
  const ip =
    String(req.headers['x-forwarded-for'] || '')
      .split(',')[0]
      .trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    '';
  const ua = String(req.headers['user-agent'] || '').slice(0, 180);
  const pepper =
    process.env.ANALYTICS_PEPPER || process.env.JWT_SECRET || 'install-landing';
  return crypto
    .createHash('sha256')
    .update(`${ip}|${ua}|${pepper}`)
    .digest('hex');
}

function uvRedisKey(statDate, platform = null) {
  if (platform) return `install:get:uv:${statDate}:${platform}`;
  return `install:get:uv:${statDate}`;
}

/**
 * /get · /install 방문 1건 기록 (크롤러 제외, fire-and-forget 가능).
 */
export async function recordInstallLandingVisit(req, platform) {
  const safePlatform = normalizePlatform(platform);
  const statDate = formatKstDateYmd(getKstNow());
  const visitorKey = hashVisitorKey(req);

  await pool.execute(
    `INSERT INTO install_landing_daily_stats (stat_date, platform, hit_count)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE hit_count = hit_count + 1`,
    [statDate, safePlatform],
  );

  if (!isRedisConfigured()) {
    return { recorded: true, uniqueTracked: false, statDate, platform: safePlatform };
  }

  try {
    const redis = await getBatchRedis();
    const pipe = redis.pipeline();
    pipe.pfadd(uvRedisKey(statDate), visitorKey);
    pipe.expire(uvRedisKey(statDate), UV_TTL_SECONDS);
    pipe.pfadd(uvRedisKey(statDate, safePlatform), visitorKey);
    pipe.expire(uvRedisKey(statDate, safePlatform), UV_TTL_SECONDS);
    await pipe.exec();
    return { recorded: true, uniqueTracked: true, statDate, platform: safePlatform };
  } catch (error) {
    console.warn(
      '[InstallLandingStats] UV Redis 기록 실패:',
      error?.message || error,
    );
    return { recorded: true, uniqueTracked: false, statDate, platform: safePlatform };
  }
}

async function readUniqueCounts(statDates) {
  const empty = {
    byDate: Object.fromEntries(statDates.map((d) => [d, 0])),
    byDatePlatform: {},
  };
  if (!isRedisConfigured() || !statDates.length) return empty;

  try {
    const redis = await getBatchRedis();
    const byDate = {};
    const byDatePlatform = {};
    for (const date of statDates) {
      byDate[date] = toNumber(await redis.pfcount(uvRedisKey(date)), 0);
      byDatePlatform[date] = {
        ios: toNumber(await redis.pfcount(uvRedisKey(date, 'ios')), 0),
        android: toNumber(await redis.pfcount(uvRedisKey(date, 'android')), 0),
        other: toNumber(await redis.pfcount(uvRedisKey(date, 'other')), 0),
      };
    }
    return { byDate, byDatePlatform };
  } catch {
    return empty;
  }
}

/**
 * 관리자 대시보드용 /get 방문 개요.
 */
export async function getInstallLandingStatsOverview({ days = 14 } = {}) {
  const safeDays = Math.max(7, Math.min(60, Number(days) || 14));
  const today = formatKstDateYmd(getKstNow());
  const startDate = addDaysToYmd(today, -(safeDays - 1));

  const dateRange = [];
  for (let i = safeDays - 1; i >= 0; i -= 1) {
    dateRange.push(addDaysToYmd(today, -i));
  }

  let rows = [];
  try {
    const [fetched] = await pool.execute(
      `SELECT stat_date, platform, hit_count
       FROM install_landing_daily_stats
       WHERE stat_date BETWEEN ? AND ?
       ORDER BY stat_date ASC`,
      [startDate, today],
    );
    rows = fetched;
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      console.warn(
        '[InstallLandingStats] install_landing_daily_stats 테이블 없음 — migrate 필요',
      );
    } else {
      throw error;
    }
  }

  const hitByDatePlatform = {};
  for (const date of dateRange) {
    hitByDatePlatform[date] = { ios: 0, android: 0, other: 0, total: 0 };
  }
  for (const row of rows) {
    const date = statDateToYmd(row.stat_date);
    const platform = normalizePlatform(row.platform);
    const hits = toNumber(row.hit_count);
    if (!hitByDatePlatform[date]) {
      hitByDatePlatform[date] = { ios: 0, android: 0, other: 0, total: 0 };
    }
    hitByDatePlatform[date][platform] += hits;
    hitByDatePlatform[date].total += hits;
  }

  const unique = await readUniqueCounts(dateRange);
  const series = dateRange.map((date) => ({
    date,
    hits: hitByDatePlatform[date]?.total || 0,
    ios: hitByDatePlatform[date]?.ios || 0,
    android: hitByDatePlatform[date]?.android || 0,
    other: hitByDatePlatform[date]?.other || 0,
    uniqueVisitors: unique.byDate?.[date] || 0,
  }));

  const sumHits = (picker) =>
    series.reduce((sum, row) => sum + toNumber(picker(row)), 0);

  const todayRow = series[series.length - 1] || {
    hits: 0,
    ios: 0,
    android: 0,
    other: 0,
    uniqueVisitors: 0,
  };

  return {
    range: { startDate, endDate: today, days: safeDays },
    summary: {
      todayHits: todayRow.hits,
      todayUnique: todayRow.uniqueVisitors,
      todayIos: todayRow.ios,
      todayAndroid: todayRow.android,
      todayOther: todayRow.other,
      rangeHits: sumHits((r) => r.hits),
      rangeUnique: sumHits((r) => r.uniqueVisitors),
      rangeIos: sumHits((r) => r.ios),
      rangeAndroid: sumHits((r) => r.android),
      rangeOther: sumHits((r) => r.other),
      uniqueAvailable: isRedisConfigured(),
    },
    series,
  };
}

import pool from '../config/database.js';
import { getBatchRedis, isRedisConfigured } from './batchRedis.service.js';

const CACHE_KEY = 'system:flags:v1';
const CACHE_TTL_SEC = 30;

const FLAG_DEFAULTS = {
  signup_disabled: false,
  post_write_disabled: false,
  comment_write_disabled: false,
  report_submission_disabled: false,
  global_readonly: false,
  rate_limit_strict_mode: false,
  locked_school_ids: [],
  maintenance_message: '',
};

function parseFlagValue(raw) {
  if (raw == null) return null;
  if (typeof raw === 'boolean' || typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw.startsWith('[') || raw.startsWith('{')) {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    return raw;
  }
  return raw;
}

function normalizeFlags(rows) {
  const out = { ...FLAG_DEFAULTS };
  for (const row of rows || []) {
    const key = row.flag_key;
    if (!Object.prototype.hasOwnProperty.call(FLAG_DEFAULTS, key)) continue;
    const val = parseFlagValue(row.flag_value);
    out[key] = val ?? FLAG_DEFAULTS[key];
  }
  if (!Array.isArray(out.locked_school_ids)) {
    out.locked_school_ids = [];
  }
  out.locked_school_ids = out.locked_school_ids
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0);
  if (typeof out.maintenance_message !== 'string') {
    out.maintenance_message = String(out.maintenance_message || '');
  }
  return out;
}

export async function getSystemFlags({ bypassCache = false } = {}) {
  if (!bypassCache && isRedisConfigured()) {
    try {
      const redis = await getBatchRedis();
      const cached = await redis.get(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // fallback to DB
    }
  }

  const [rows] = await pool.execute(
    `SELECT flag_key, flag_value FROM system_flags`,
  );
  const flags = normalizeFlags(rows);

  if (isRedisConfigured()) {
    try {
      const redis = await getBatchRedis();
      await redis.setex(CACHE_KEY, CACHE_TTL_SEC, JSON.stringify(flags));
    } catch {
      // ignore
    }
  }
  return flags;
}

export async function invalidateSystemFlagsCache() {
  if (!isRedisConfigured()) return;
  try {
    const redis = await getBatchRedis();
    await redis.del(CACHE_KEY);
  } catch {
    // ignore
  }
}

export async function setSystemFlags(updates, { adminUserId, note } = {}) {
  const allowedKeys = Object.keys(FLAG_DEFAULTS);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const [key, value] of Object.entries(updates || {})) {
      if (!allowedKeys.includes(key)) continue;
      await connection.execute(
        `INSERT INTO system_flags (flag_key, flag_value, note, updated_by_admin_id)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           flag_value = VALUES(flag_value),
           note = VALUES(note),
           updated_by_admin_id = VALUES(updated_by_admin_id)`,
        [key, JSON.stringify(value), note || null, adminUserId || null],
      );
    }
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
  await invalidateSystemFlagsCache();
  return getSystemFlags({ bypassCache: true });
}

export function getBlockedMessage(flags) {
  const msg = flags?.maintenance_message?.trim();
  return msg || '현재 서비스 이용이 일시 제한되어 있습니다. 잠시 후 다시 시도해 주세요.';
}

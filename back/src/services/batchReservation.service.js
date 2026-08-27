import crypto from 'crypto';
import pool from '../config/database.js';

export const RESERVATION_STATUS = {
  PENDING: 'pending',
  LEASED: 'leased',
  DONE: 'done',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
};

export const JOB_KEYS = {
  SCHOOL_STATS: 'school-stats',
  PERSONAL_MAIL_RETURN: 'personal-mail-return',
  TIMER_SESSION_GUARD: 'timer-session-guard',
  CRON_MANAGER: 'cron-manager',
};

function toMysqlDateTime(input) {
  const d = input instanceof Date ? input : new Date(input || Date.now());
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

function formatMysqlDateTime(d) {
  const x = toMysqlDateTime(d);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())} ${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}.${pad(x.getMilliseconds(), 3)}`;
}

/**
 * 동일 (job_key, scope_key) 는 upsert.
 * mode:
 *  - upsert(default): 다시 pending 으로 살림 (이벤트 디바운스)
 *  - once: 이미 행이 있으면 건드리지 않음 (일일 안전망)
 */
export async function enqueueReservation({
  jobKey,
  scopeKey,
  notBefore = null,
  debounceMs = 0,
  priority = 0,
  payload = null,
  mode = 'upsert',
  connection = null,
} = {}) {
  const job = String(jobKey || '').trim();
  const scope = String(scopeKey || '').trim();
  if (!job || !scope) return null;

  let when = notBefore ? toMysqlDateTime(notBefore) : new Date();
  if (debounceMs > 0) {
    const debounced = new Date(Date.now() + debounceMs);
    if (debounced > when) when = debounced;
  }

  const payloadJson = payload == null ? null : JSON.stringify(payload);
  const db = connection || pool;
  const whenStr = formatMysqlDateTime(when);
  const prio = Number(priority) || 0;

  if (mode === 'once') {
    const [result] = await db.execute(
      `INSERT IGNORE INTO cron_reservations
         (job_key, scope_key, not_before, priority, status, payload_json, attempts)
       VALUES (?, ?, ?, ?, 'pending', ?, 0)`,
      [job, scope, whenStr, prio, payloadJson],
    );
    return result;
  }

  const [result] = await db.execute(
    `
    INSERT INTO cron_reservations
      (job_key, scope_key, not_before, priority, status, payload_json, attempts, lease_owner, leased_at, last_error)
    VALUES (?, ?, ?, ?, 'pending', ?, 0, NULL, NULL, NULL)
    ON DUPLICATE KEY UPDATE
      not_before = IF(
        status = 'pending',
        GREATEST(not_before, VALUES(not_before)),
        VALUES(not_before)
      ),
      priority = GREATEST(priority, VALUES(priority)),
      status = 'pending',
      payload_json = COALESCE(VALUES(payload_json), payload_json),
      lease_owner = NULL,
      leased_at = NULL,
      last_error = NULL,
      attempts = IF(status IN ('done', 'cancelled', 'failed'), 0, attempts),
      updated_at = CURRENT_TIMESTAMP(3)
  `,
    [job, scope, whenStr, prio, payloadJson],
  );
  return result;
}

/** fire-and-forget — API 경로에서 실패해도 본 요청을 막지 않음 */
export function enqueueReservationSafe(opts) {
  enqueueReservation(opts).catch((err) => {
    console.warn(
      '[cronReservation] enqueue failed',
      opts?.jobKey,
      opts?.scopeKey,
      err?.message || err,
    );
  });
}

export async function cancelReservation(jobKey, scopeKey, connection = null) {
  const db = connection || pool;
  const [result] = await db.execute(
    `UPDATE cron_reservations
     SET status = 'cancelled', lease_owner = NULL, leased_at = NULL, updated_at = NOW(3)
     WHERE job_key = ? AND scope_key = ? AND status IN ('pending', 'leased')`,
    [String(jobKey), String(scopeKey)],
  );
  return result?.affectedRows || 0;
}

export function cancelReservationSafe(jobKey, scopeKey) {
  cancelReservation(jobKey, scopeKey).catch((err) => {
    console.warn('[cronReservation] cancel failed', jobKey, scopeKey, err?.message || err);
  });
}

export async function claimReservations({ limit = 40, owner = null } = {}) {
  const leaseOwner = owner || `mgr-${crypto.randomBytes(4).toString('hex')}`;
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 40));
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let rows;
    try {
      const [r] = await conn.query(
        `SELECT id, job_key, scope_key, payload_json, attempts, priority, not_before
         FROM cron_reservations
         WHERE status = 'pending' AND not_before <= NOW(3)
         ORDER BY priority DESC, not_before ASC, id ASC
         LIMIT ?
         FOR UPDATE SKIP LOCKED`,
        [safeLimit],
      );
      rows = r;
    } catch (err) {
      // SKIP LOCKED 미지원 시 폴백
      if (!/SKIP LOCKED/i.test(String(err?.message || ''))) throw err;
      const [r] = await conn.query(
        `SELECT id, job_key, scope_key, payload_json, attempts, priority, not_before
         FROM cron_reservations
         WHERE status = 'pending' AND not_before <= NOW(3)
         ORDER BY priority DESC, not_before ASC, id ASC
         LIMIT ?
         FOR UPDATE`,
        [safeLimit],
      );
      rows = r;
    }

    if (!rows?.length) {
      await conn.commit();
      return { owner: leaseOwner, items: [] };
    }

    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    await conn.execute(
      `UPDATE cron_reservations
       SET status = 'leased', lease_owner = ?, leased_at = NOW(3), updated_at = CURRENT_TIMESTAMP(3)
       WHERE id IN (${placeholders})`,
      [leaseOwner, ...ids],
    );
    await conn.commit();
    return {
      owner: leaseOwner,
      items: rows.map((r) => ({
        id: r.id,
        jobKey: r.job_key,
        scopeKey: r.scope_key,
        payload: typeof r.payload_json === 'string'
          ? (() => { try { return JSON.parse(r.payload_json); } catch { return null; } })()
          : r.payload_json,
        attempts: Number(r.attempts || 0),
        priority: Number(r.priority || 0),
        notBefore: r.not_before,
      })),
    };
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // ignore
    }
    throw error;
  } finally {
    conn.release();
  }
}

export async function completeReservations(ids, { status = RESERVATION_STATUS.DONE, errorMessage = null } = {}) {
  const list = (ids || []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  if (!list.length) return 0;
  const placeholders = list.map(() => '?').join(',');
  const [result] = await pool.execute(
    `UPDATE cron_reservations
     SET status = ?,
         last_error = ?,
         lease_owner = NULL,
         leased_at = NULL,
         attempts = attempts + IF(? = 'failed', 1, 0),
         updated_at = NOW(3)
     WHERE id IN (${placeholders}) AND status = 'leased'`,
    [status, errorMessage, status, ...list],
  );
  return result?.affectedRows || 0;
}

/** 실패한 leased 를 다시 pending 으로 (재시도) */
export async function requeueReservations(ids, { delayMs = 60_000, errorMessage = null } = {}) {
  const list = (ids || []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  if (!list.length) return 0;
  const placeholders = list.map(() => '?').join(',');
  const when = formatMysqlDateTime(new Date(Date.now() + delayMs));
  const [result] = await pool.execute(
    `UPDATE cron_reservations
     SET status = 'pending',
         not_before = ?,
         last_error = ?,
         lease_owner = NULL,
         leased_at = NULL,
         attempts = attempts + 1,
         updated_at = NOW(3)
     WHERE id IN (${placeholders}) AND status = 'leased'`,
    [when, errorMessage, ...list],
  );
  return result?.affectedRows || 0;
}

/** 오래된 leased 회수 (매니저 중단 등) */
export async function reclaimStaleLeases({ olderThanSec = 900 } = {}) {
  const sec = Math.max(60, Number(olderThanSec) || 900);
  const [result] = await pool.execute(
    `UPDATE cron_reservations
     SET status = 'pending',
         lease_owner = NULL,
         leased_at = NULL,
         updated_at = NOW(3),
         last_error = COALESCE(last_error, 'stale-lease-reclaimed')
     WHERE status = 'leased'
       AND leased_at < DATE_SUB(NOW(3), INTERVAL ? SECOND)`,
    [sec],
  );
  return result?.affectedRows || 0;
}

export async function countReservationsByStatus() {
  const [rows] = await pool.execute(
    `SELECT job_key, status, COUNT(*) AS c
     FROM cron_reservations
     WHERE status IN ('pending', 'leased')
     GROUP BY job_key, status`,
  );
  return rows.map((r) => ({
    jobKey: r.job_key,
    status: r.status,
    count: Number(r.c || 0),
  }));
}

export async function listPendingReservations({ limit = 30 } = {}) {
  const safe = Math.max(1, Math.min(100, Number(limit) || 30));
  const [rows] = await pool.execute(
    `SELECT id, job_key, scope_key, not_before, priority, status, attempts, updated_at
     FROM cron_reservations
     WHERE status IN ('pending', 'leased')
     ORDER BY status ASC, not_before ASC
     LIMIT ${safe}`,
  );
  return rows;
}

export function schoolStatsScope(schoolId) {
  return `school:${String(schoolId)}`;
}

export function timerGuardScope(userId) {
  return `user:${Number(userId)}`;
}

export function personalMailScope(mailId) {
  return `mail:${Number(mailId)}`;
}

#!/usr/bin/env node
/*
 * 레거시: study_sessions.start_seconds/end_seconds 존재 시 역전 행 수정용.
 * back/src/db/migrations/032_study_sessions_started_ended_timestamps.sql 적용 후
 * 해당 컬럼이 삭제되면 이 스크립트는 사용할 수 없다.
 */
/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '../back/.env') });

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`[FATAL] ${name} 환경변수가 필요합니다.`);
  return String(v).trim();
}

const tunnelHost = process.env.DB_TUNNEL_HOST?.trim();
const dbConfig = {
  host: tunnelHost || process.env.DB_PRIVATE_HOST?.trim() || requireEnv('DB_HOST'),
  port: Number(process.env.DB_TUNNEL_PORT || process.env.DB_PRIVATE_PORT || process.env.DB_PORT) || 3306,
  user: requireEnv('DB_USER'),
  password: requireEnv('DB_PASSWORD'),
  database: requireEnv('DB_NAME'),
  timezone: 'Z',
};

const APPLY = process.argv.includes('--apply');
const TIMER_DAY_END_SECONDS = 86400;

function formatUtcDateAsYmd(dateObj) {
  const y = dateObj.getUTCFullYear();
  const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function toDayKey(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatUtcDateAsYmd(value);
  }

  const raw = String(value || '').trim();
  const ymd = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;

  // e.g. "Sun May 03 2026 ..."
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return formatUtcDateAsYmd(parsed);
  }
  return raw.slice(0, 10);
}

function getNextDayKey(dayKey) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayKey || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  d.setUTCDate(d.getUTCDate() + 1);
  const y = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

async function upsertStudyDayTotal(connection, userId, dayKey) {
  const [[schoolRow]] = await connection.execute(
    `SELECT school_id FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  const schoolId = schoolRow?.school_id ?? null;

  const [[sumRow]] = await connection.execute(
    `SELECT COALESCE(SUM(
      CASE
        WHEN end_seconds IS NULL THEN 0
        WHEN end_seconds < start_seconds THEN 0
        ELSE (LEAST(end_seconds, 86400) - start_seconds) * 1000
      END
    ), 0) AS total_ms
    FROM study_sessions
    WHERE user_id = ? AND day_key = ?`,
    [userId, dayKey],
  );
  const totalMs = Number(sumRow?.total_ms || 0);
  await connection.execute(
    `INSERT INTO study_days (user_id, day_key, total_elapsed_ms, school_id)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       total_elapsed_ms = VALUES(total_elapsed_ms),
       updated_at = CURRENT_TIMESTAMP,
       school_id = IFNULL(study_days.school_id, VALUES(school_id))`,
    [userId, dayKey, totalMs, schoolId],
  );
}

async function run() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    await connection.query("SET SESSION time_zone = '+00:00'");

    const [rows] = await connection.execute(
      `SELECT
         id,
         user_id,
         day_key,
         subject_name,
         subject_color,
         subject_id,
         start_seconds,
         end_seconds,
         created_at
       FROM study_sessions
       WHERE end_seconds IS NOT NULL
         AND end_seconds < start_seconds
       ORDER BY user_id ASC, day_key ASC, id ASC`,
    );

    if (!rows.length) {
      console.log('[INFO] inverted 세션 없음');
      return;
    }

    console.log(
      `[INFO] 대상 ${rows.length}건 (${APPLY ? 'APPLY' : 'DRY RUN'})`,
    );

    let migrated = 0;
    let skipped = 0;
    const recalcPairs = new Set();

    for (const row of rows) {
      const id = Number(row.id);
      const userId = Number(row.user_id);
      const dayKey = toDayKey(row.day_key);
      const nextDayKey = getNextDayKey(dayKey);
      const startSeconds = Number(row.start_seconds);
      const endSeconds = Number(row.end_seconds);

      if (!nextDayKey) {
        skipped += 1;
        console.log(
          `[SKIP] id=${id} user=${userId} day=${dayKey} reason=invalid_day_key`,
        );
        continue;
      }

      const segmentA = {
        dayKey,
        startSeconds,
        endSeconds: TIMER_DAY_END_SECONDS,
      };
      const segmentB = {
        dayKey: nextDayKey,
        startSeconds: 0,
        endSeconds,
      };

      if (!APPLY) {
        migrated += 1;
        recalcPairs.add(`${userId}:${segmentA.dayKey}`);
        recalcPairs.add(`${userId}:${segmentB.dayKey}`);
        console.log(
          `[PLAN] id=${id} user=${userId} ` +
            `${dayKey} (${startSeconds}->${endSeconds}) ` +
            `=> A(${segmentA.dayKey}:${segmentA.startSeconds}->${segmentA.endSeconds}), ` +
            `B(${segmentB.dayKey}:${segmentB.startSeconds}->${segmentB.endSeconds})`,
        );
        continue;
      }

      await connection.beginTransaction();
      try {
        const [[locked]] = await connection.execute(
          `SELECT id, user_id, day_key, subject_name, subject_color, subject_id, start_seconds, end_seconds, created_at
           FROM study_sessions
           WHERE id = ?
           FOR UPDATE`,
          [id],
        );
        if (!locked) {
          await connection.rollback();
          skipped += 1;
          console.log(`[SKIP] id=${id} reason=missing`);
          continue;
        }

        const currStart = Number(locked.start_seconds);
        const currEnd = Number(locked.end_seconds);
        if (!Number.isFinite(currEnd) || currEnd >= currStart) {
          await connection.rollback();
          skipped += 1;
          console.log(`[SKIP] id=${id} reason=already_normalized`);
          continue;
        }

        await connection.execute(
          `INSERT INTO study_sessions
             (user_id, day_key, subject_name, subject_color, subject_id, start_seconds, end_seconds, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            Number(locked.user_id),
            toDayKey(locked.day_key),
            locked.subject_name ?? null,
            locked.subject_color ?? null,
            locked.subject_id != null ? Number(locked.subject_id) : null,
            currStart,
            TIMER_DAY_END_SECONDS,
            locked.created_at,
          ],
        );

        if (currEnd > 0) {
          await connection.execute(
            `INSERT INTO study_sessions
               (user_id, day_key, subject_name, subject_color, subject_id, start_seconds, end_seconds, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              Number(locked.user_id),
              getNextDayKey(toDayKey(locked.day_key)),
              locked.subject_name ?? null,
              locked.subject_color ?? null,
              locked.subject_id != null ? Number(locked.subject_id) : null,
              0,
              currEnd,
              locked.created_at,
            ],
          );
        }

        await connection.execute(`DELETE FROM study_sessions WHERE id = ?`, [id]);

        await connection.commit();
        migrated += 1;
        recalcPairs.add(`${userId}:${dayKey}`);
        recalcPairs.add(`${userId}:${nextDayKey}`);
        console.log(
          `[OK] id=${id} user=${userId} ${dayKey} ${currStart}->${currEnd} split`,
        );
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }

    if (APPLY) {
      for (const pair of recalcPairs) {
        const [userIdRaw, dayKey] = pair.split(':');
        await upsertStudyDayTotal(connection, Number(userIdRaw), dayKey);
      }
    }

    console.log('--- Migration Summary ---');
    console.log(`mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
    console.log(`scanned: ${rows.length}`);
    console.log(`migrated_or_planned: ${migrated}`);
    console.log(`skipped: ${skipped}`);
    console.log(`recalc_targets: ${recalcPairs.size}`);
    if (!APPLY) {
      console.log('[NEXT] 실제 반영: node scripts/migrate-inverted-study-sessions.js --apply');
    }
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error('[FATAL]', error);
  process.exit(1);
});

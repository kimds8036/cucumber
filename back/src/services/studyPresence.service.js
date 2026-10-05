/**
 * 스터디룸·관리자 화면이 같이 쓰는 "지금 타이머가 살아 있는 세션" 조건.
 * 확인 시각이 STUDY_PRESENCE_STALE_MINUTES 를 넘기면 유령으로 보고 종료한다.
 */
import pool from '../config/database.js';
import { getTimerDayKey } from '../utils/timerDayKey.js';
import { upsertStudyDayTotalForUserKey } from '../utils/studyDayTotal.js';

export const STUDY_PRESENCE_STALE_MINUTES = 3;
export const KST_NOW_SQL = `CONVERT_TZ(UTC_TIMESTAMP(3), '+00:00', '+09:00')`;

const SWEEP_INTERVAL_MS = 30 * 1000;
let lastSweepAt = 0;
let sweepPromise = null;

/** ended_at IS NULL 인 행에 붙여 쓰는 신선도 조건. 바인드 파라미터 없음. */
export function freshSeenSql(alias = '') {
  const p = alias ? `${alias}.` : '';
  return `(
    (${p}last_seen_at IS NOT NULL AND ${p}last_seen_at >= DATE_SUB(${KST_NOW_SQL}, INTERVAL ${STUDY_PRESENCE_STALE_MINUTES} MINUTE))
    OR (${p}last_seen_at IS NULL AND ${p}started_at >= DATE_SUB(${KST_NOW_SQL}, INTERVAL ${STUDY_PRESENCE_STALE_MINUTES} MINUTE))
  )`;
}

/** 오늘, 끝나지 않은 세션, 확인 시각이 유효함. day_key 바인드 1개. */
export function liveOpenSessionSql(alias = '') {
  const p = alias ? `${alias}.` : '';
  return `(
    ${p}ended_at IS NULL
    AND ${p}day_key = ?
    AND ${freshSeenSql(alias)}
  )`;
}

export async function touchStudyPresence(userId) {
  const dayKey = getTimerDayKey();
  const [result] = await pool.execute(
    `UPDATE study_sessions
     SET last_seen_at = ${KST_NOW_SQL}
     WHERE user_id = ? AND ended_at IS NULL AND day_key = ?`,
    [userId, dayKey],
  );
  return Number(result?.affectedRows) || 0;
}

/**
 * 확인이 끊긴 열린 세션을 종료한다. 짧은 간격으로 여러 조회가 와도 한 번만 돈다.
 * @returns {Promise<number>} 종료한 세션 수
 */
export async function sweepStaleStudySessions() {
  const now = Date.now();
  if (sweepPromise) return sweepPromise;
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return 0;
  lastSweepAt = now;
  sweepPromise = (async () => {
    try {
      const [rows] = await pool.execute(
        `SELECT id, user_id, DATE_FORMAT(day_key, '%Y-%m-%d') AS day_key
         FROM study_sessions
         WHERE ended_at IS NULL
           AND (
             (last_seen_at IS NOT NULL AND last_seen_at < DATE_SUB(${KST_NOW_SQL}, INTERVAL ${STUDY_PRESENCE_STALE_MINUTES} MINUTE))
             OR (last_seen_at IS NULL AND started_at < DATE_SUB(${KST_NOW_SQL}, INTERVAL ${STUDY_PRESENCE_STALE_MINUTES} MINUTE))
           )`,
      );
      if (!rows.length) return 0;
      const ids = rows.map((row) => row.id);
      const placeholders = ids.map(() => '?').join(',');
      await pool.execute(
        `UPDATE study_sessions
         SET ended_at = COALESCE(last_seen_at, started_at)
         WHERE id IN (${placeholders}) AND ended_at IS NULL`,
        ids,
      );
      const seen = new Set();
      for (const row of rows) {
        const dayKey = String(row.day_key || '').slice(0, 10);
        const key = `${row.user_id}:${dayKey}`;
        if (!dayKey || seen.has(key)) continue;
        seen.add(key);
        try {
          await upsertStudyDayTotalForUserKey(pool, row.user_id, dayKey);
        } catch (err) {
          console.warn('[StudyPresence] 일 합계 갱신 실패', err?.message || err);
        }
      }
      console.log('[StudyPresence] 유령 세션 종료', { count: rows.length });
      return rows.length;
    } catch (err) {
      console.error('[StudyPresence] 유령 세션 정리 실패', err?.message || err);
      return 0;
    } finally {
      sweepPromise = null;
    }
  })();
  return sweepPromise;
}

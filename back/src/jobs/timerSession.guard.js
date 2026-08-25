import pool from '../config/database.js';
import { broadcastTimerStatus } from '../socket/socketService.js';
import { rebuildStudyDayTotalsForSessionPairs } from '../utils/studyDayTotal.js';
import {
  createBatchExecutionContext,
  logBatchFailure,
  logBatchSuccess,
} from '../services/batchMetric.service.js';

const DEFAULT_STALE_MINUTES = 60;

/** 앱을 켜 둔 채 너무 길게 진행중으로 남는 세션: 시작 시각 기준 최대 인정 시간(기본 15h) */
const DEFAULT_MAX_OPEN_HOURS = 15;

const KST_NOW_SQL = `CONVERT_TZ(UTC_TIMESTAMP(3), '+00:00', '+09:00')`;

function getStaleMinutes() {
  const raw = Number(process.env.CRON_TIMER_STALE_MINUTES);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_STALE_MINUTES;
  return Math.floor(raw);
}

function getMaxOpenHours() {
  const raw = Number(process.env.CRON_TIMER_MAX_OPEN_HOURS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_MAX_OPEN_HOURS;
  return Math.floor(raw);
}

function isCronEnabled(flagName) {
  const v = (process.env[flagName] ?? 'true').toLowerCase();
  return !(v === 'false' || v === '0' || v === 'no');
}

export async function runTimerSessionGuardJob() {
  const context = createBatchExecutionContext('timer-session-guard');
  const staleMinutes = getStaleMinutes();
  const maxOpenHours = getMaxOpenHours();
  const maxOpenSeconds = maxOpenHours * 3600;

  const runMarathonClamp = isCronEnabled('CRON_TIMER_MARATHON_CLAMP');
  const runStaleClose = isCronEnabled('CRON_TIMER_STALE_CLOSE');

  const notifyUserIds = new Set();

  try {
    if (runMarathonClamp && maxOpenSeconds > 0) {
      const [longRows] = await pool.execute(
        `SELECT id, user_id, DATE_FORMAT(day_key, '%Y-%m-%d') AS day_key
         FROM study_sessions
         WHERE ended_at IS NULL
           AND TIMESTAMPDIFF(SECOND, started_at, ${KST_NOW_SQL}) >= ?`,
        [maxOpenSeconds],
      );

      if (longRows.length > 0) {
        const ids = longRows.map((r) => r.id);
        const placeholders = ids.map(() => '?').join(',');
        await pool.execute(
          `UPDATE study_sessions
           SET ended_at = TIMESTAMPADD(HOUR, ?, started_at)
           WHERE id IN (${placeholders})
             AND ended_at IS NULL`,
          [maxOpenHours, ...ids],
        );

        await rebuildStudyDayTotalsForSessionPairs(pool, longRows);
        longRows.forEach((r) => {
          const uid = Number(r.user_id);
          if (Number.isFinite(uid)) notifyUserIds.add(uid);
        });

        console.log('[TimerSessionGuard] marathon-clamp open sessions', {
          maxOpenHours,
          affected: longRows.length,
        });
      }
    }

    if (runStaleClose) {
      const [staleRows] = await pool.execute(
        `SELECT id, user_id, DATE_FORMAT(day_key, '%Y-%m-%d') AS day_key
         FROM study_sessions
         WHERE ended_at IS NULL
           AND created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
        [staleMinutes],
      );

      if (staleRows.length > 0) {
        const ids = staleRows.map((r) => r.id);
        const placeholders = ids.map(() => '?').join(',');
        const [closeResult] = await pool.execute(
          `UPDATE study_sessions
           SET ended_at = ${KST_NOW_SQL}
           WHERE id IN (${placeholders})
             AND ended_at IS NULL`,
          ids,
        );

        await rebuildStudyDayTotalsForSessionPairs(pool, staleRows);
        staleRows.forEach((r) => {
          const uid = Number(r.user_id);
          if (Number.isFinite(uid)) notifyUserIds.add(uid);
        });

        console.log('[TimerSessionGuard] closed stale sessions', {
          staleMinutes,
          affectedRows: Number(closeResult?.affectedRows ?? 0),
        });
      }
    }

    for (const userId of notifyUserIds) {
      await broadcastTimerStatus({ userId, status: 'idle' });
    }
    logBatchSuccess(context, {
      notifyUsers: notifyUserIds.size,
      staleMinutes,
      maxOpenHours,
    });
  } catch (error) {
    logBatchFailure(context, error);
    console.error('[TimerSessionGuard] failed:', error?.message ?? error);
  }
}

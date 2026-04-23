import pool from '../config/database.js';
import { broadcastTimerStatus } from '../socket/socketService.js';

const DEFAULT_STALE_MINUTES = 60;

function getStaleMinutes() {
  const raw = Number(process.env.CRON_TIMER_STALE_MINUTES);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_STALE_MINUTES;
  return Math.floor(raw);
}

export async function runTimerSessionGuardJob() {
  const staleMinutes = getStaleMinutes();
  try {
    const [rows] = await pool.execute(
      `SELECT user_id
       FROM study_sessions
       WHERE end_seconds IS NULL
         AND created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)
       GROUP BY user_id`,
      [staleMinutes],
    );

    if (!rows.length) {
      return;
    }

    const [closeResult] = await pool.execute(
      `UPDATE study_sessions
       SET end_seconds = (
         (
           HOUR(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+09:00')) * 3600
           + MINUTE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+09:00')) * 60
           + SECOND(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+09:00'))
           - 21600
           + 86400
         ) % 86400
       )
       WHERE end_seconds IS NULL
         AND created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [staleMinutes],
    );

    for (const row of rows) {
      const userId = Number(row.user_id);
      if (!Number.isFinite(userId)) continue;
      await broadcastTimerStatus({ userId, status: 'idle' });
    }

    console.log('[TimerSessionGuard] closed stale sessions', {
      staleMinutes,
      affectedRows: Number(closeResult?.affectedRows ?? 0),
      users: rows.map((r) => Number(r.user_id)).filter(Number.isFinite),
    });
  } catch (error) {
    console.error('[TimerSessionGuard] failed:', error?.message ?? error);
  }
}


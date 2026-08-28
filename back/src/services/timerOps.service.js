import pool from '../config/database.js';
import { addDaysToYmd } from './analytics.service.js';
import { formatKstDateYmd } from './reverification.service.js';
import { resolveUserName } from './userPii.service.js';
import { getTimerDayKey } from '../utils/timerDayKey.js';

const KST_NOW_SQL = `CONVERT_TZ(UTC_TIMESTAMP(3), '+00:00', '+09:00')`;

function toHours(ms) {
  const n = Number(ms) || 0;
  return Math.round((n / 3_600_000) * 10) / 10;
}

function ymdOf(value) {
  if (!value) return '';
  if (value instanceof Date) return formatKstDateYmd(value);
  return String(value).slice(0, 10);
}

/** 타이머 day_key 기준 오늘 이용·시간 (종료 세션 + 진행 중 세션) */
async function getTimerDayStats(dayKey) {
  const [[row]] = await pool.execute(
    `SELECT
       COUNT(DISTINCT u.user_id) AS active_users,
       COALESCE(SUM(
         COALESCE(sd.total_elapsed_ms, 0) + COALESCE(open.open_ms, 0)
       ), 0) AS total_ms
     FROM (
       SELECT user_id FROM study_days
       WHERE day_key = ? AND total_elapsed_ms > 0
       UNION
       SELECT user_id FROM study_sessions
       WHERE day_key = ? AND ended_at IS NULL
     ) u
     LEFT JOIN study_days sd ON sd.user_id = u.user_id AND sd.day_key = ?
     LEFT JOIN (
       SELECT user_id,
         SUM(GREATEST(0, TIMESTAMPDIFF(MICROSECOND, started_at, ${KST_NOW_SQL}) DIV 1000)) AS open_ms
       FROM study_sessions
       WHERE day_key = ? AND ended_at IS NULL
       GROUP BY user_id
     ) open ON open.user_id = u.user_id`,
    [dayKey, dayKey, dayKey, dayKey],
  );
  return {
    activeUsers: Number(row?.active_users || 0),
    totalMs: Number(row?.total_ms || 0),
  };
}

/**
 * 타이머 운영 요약 + 최근 세션(학교·아이디).
 * day_key = 앱과 동일( KST 06:00 기준 ), 크론 집계 아님 · study_days/study_sessions 실시간 조회.
 */
export async function getTimerOpsOverview({ days = 14 } = {}) {
  const windowDays = Math.min(Math.max(Number(days) || 14, 1), 31);
  const timerToday = getTimerDayKey();
  const calendarToday = formatKstDateYmd();
  const fromYmd = addDaysToYmd(timerToday, -(windowDays - 1));

  const todayStats = await getTimerDayStats(timerToday);

  const [[openRow]] = await pool.execute(
    `SELECT
       COUNT(*) AS open_sessions,
       COUNT(DISTINCT user_id) AS open_users
     FROM study_sessions
     WHERE ended_at IS NULL`,
  );

  const [[rangeRow]] = await pool.execute(
    `SELECT
       COUNT(DISTINCT user_id) AS active_users,
       COALESCE(SUM(total_elapsed_ms), 0) AS total_ms
     FROM study_days
     WHERE day_key BETWEEN ? AND ?
       AND total_elapsed_ms > 0`,
    [fromYmd, timerToday],
  );

  const [dayRows] = await pool.execute(
    `SELECT
       DATE_FORMAT(day_key, '%Y-%m-%d') AS day_key,
       COUNT(DISTINCT user_id) AS active_users,
       COALESCE(SUM(total_elapsed_ms), 0) AS total_ms
     FROM study_days
     WHERE day_key BETWEEN ? AND ?
       AND total_elapsed_ms > 0
     GROUP BY day_key
     ORDER BY day_key ASC`,
    [fromYmd, timerToday],
  );

  const byDay = new Map(dayRows.map((r) => [ymdOf(r.day_key), r]));
  const series = [];
  for (let i = 0; i < windowDays; i += 1) {
    const date = addDaysToYmd(fromYmd, i);
    let activeUsers;
    let totalMs;
    if (date === timerToday) {
      activeUsers = todayStats.activeUsers;
      totalMs = todayStats.totalMs;
    } else {
      const row = byDay.get(date);
      activeUsers = Number(row?.active_users || 0);
      totalMs = Number(row?.total_ms || 0);
    }
    series.push({
      date,
      activeUsers,
      totalHours: toHours(totalMs),
      avgHoursPerUser: activeUsers > 0 ? toHours(totalMs / activeUsers) : 0,
    });
  }

  const [schoolRows] = await pool.execute(
    `SELECT
       s.name AS school_name,
       COUNT(DISTINCT sd.user_id) AS active_users,
       COALESCE(SUM(sd.total_elapsed_ms), 0) AS total_ms
     FROM study_days sd
     INNER JOIN schools s ON s.school_id = sd.school_id
     WHERE sd.day_key BETWEEN ? AND ?
       AND sd.total_elapsed_ms > 0
       AND sd.school_id IS NOT NULL
     GROUP BY sd.school_id, s.name
     ORDER BY total_ms DESC
     LIMIT 8`,
    [fromYmd, timerToday],
  );

  const [sessionRows] = await pool.execute(
    `SELECT
       ss.id,
       ss.user_id,
       u.username,
       u.name_enc,
       u.grade,
       u.class_number,
       sch.name AS school_name,
       ss.subject_name,
       ss.started_at,
       ss.ended_at,
       TIMESTAMPDIFF(
         SECOND,
         ss.started_at,
         COALESCE(ss.ended_at, ${KST_NOW_SQL})
       ) AS elapsed_sec
     FROM study_sessions ss
     INNER JOIN users u ON u.id = ss.user_id
     LEFT JOIN schools sch ON sch.school_id = u.school_id
     ORDER BY (ss.ended_at IS NULL) DESC, ss.id DESC
     LIMIT 50`,
  );

  const todayUsers = todayStats.activeUsers;
  const todayMs = todayStats.totalMs;

  return {
    summary: {
      timerDayKey: timerToday,
      calendarToday,
      todayActiveUsers: todayUsers,
      todayTotalHours: toHours(todayMs),
      todayAvgHoursPerUser: todayUsers > 0 ? toHours(todayMs / todayUsers) : 0,
      openSessions: Number(openRow?.open_sessions || 0),
      openUsers: Number(openRow?.open_users || 0),
      rangeActiveUsers: Number(rangeRow?.active_users || 0),
      rangeTotalHours: toHours(rangeRow?.total_ms || 0),
      fromYmd,
      toYmd: timerToday,
    },
    series,
    topSchools: schoolRows.map((r) => ({
      schoolName: r.school_name,
      activeUsers: Number(r.active_users || 0),
      totalHours: toHours(r.total_ms),
    })),
    recentSessions: sessionRows.map((r) => {
      const open = !r.ended_at;
      const seconds = Number(r.elapsed_sec || 0);
      return {
        id: Number(r.id),
        userId: Number(r.user_id),
        username: r.username || '-',
        displayName: resolveUserName(r) || null,
        schoolName: r.school_name || '-',
        grade: r.grade != null ? Number(r.grade) : null,
        classNumber: r.class_number != null ? Number(r.class_number) : null,
        subjectName: r.subject_name || '전체',
        startedAt: r.started_at,
        endedAt: r.ended_at,
        open,
        hours: Math.round((seconds / 3600) * 10) / 10,
      };
    }),
  };
};

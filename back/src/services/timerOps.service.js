import pool from '../config/database.js';
import { addDaysToYmd } from './analytics.service.js';
import { formatKstDateYmd } from './reverification.service.js';
import { resolveUserName } from './userPii.service.js';

function toHours(ms) {
  const n = Number(ms) || 0;
  return Math.round((n / 3_600_000) * 10) / 10;
}

function ymdOf(value) {
  if (!value) return '';
  if (value instanceof Date) return formatKstDateYmd(value);
  return String(value).slice(0, 10);
}

/**
 * 타이머 운영 요약 + 최근 세션(학교·아이디).
 */
export async function getTimerOpsOverview({ days = 14 } = {}) {
  const windowDays = Math.min(Math.max(Number(days) || 14, 1), 31);
  const today = formatKstDateYmd();
  const fromYmd = addDaysToYmd(today, -(windowDays - 1));

  const [[todayRow]] = await pool.execute(
    `SELECT
       COUNT(DISTINCT user_id) AS active_users,
       COALESCE(SUM(total_elapsed_ms), 0) AS total_ms
     FROM study_days
     WHERE day_key = ?
       AND total_elapsed_ms > 0`,
    [today],
  );

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
    [fromYmd, today],
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
    [fromYmd, today],
  );

  const byDay = new Map(dayRows.map((r) => [ymdOf(r.day_key), r]));
  const series = [];
  for (let i = 0; i < windowDays; i += 1) {
    const date = addDaysToYmd(fromYmd, i);
    const row = byDay.get(date);
    const totalMs = Number(row?.total_ms || 0);
    const activeUsers = Number(row?.active_users || 0);
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
    [fromYmd, today],
  );

  const kstNowSql = `CONVERT_TZ(UTC_TIMESTAMP(3), '+00:00', '+09:00')`;
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
         COALESCE(ss.ended_at, ${kstNowSql})
       ) AS elapsed_sec
     FROM study_sessions ss
     INNER JOIN users u ON u.id = ss.user_id
     LEFT JOIN schools sch ON sch.school_id = u.school_id
     ORDER BY (ss.ended_at IS NULL) DESC, ss.id DESC
     LIMIT 50`,
  );

  const todayUsers = Number(todayRow?.active_users || 0);
  const todayMs = Number(todayRow?.total_ms || 0);

  return {
    summary: {
      todayActiveUsers: todayUsers,
      todayTotalHours: toHours(todayMs),
      todayAvgHoursPerUser: todayUsers > 0 ? toHours(todayMs / todayUsers) : 0,
      openSessions: Number(openRow?.open_sessions || 0),
      openUsers: Number(openRow?.open_users || 0),
      rangeActiveUsers: Number(rangeRow?.active_users || 0),
      rangeTotalHours: toHours(rangeRow?.total_ms || 0),
      fromYmd,
      toYmd: today,
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
}

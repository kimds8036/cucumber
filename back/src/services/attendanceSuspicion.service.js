import pool from '../config/database.js';
import { getSuspiciousLowAttendance } from './adminAttendance.service.js';

export async function refreshAttendanceSuspicionFlags({
  days = 14,
  maxRate = 0.25,
  minAccountDays = 7,
} = {}) {
  const result = await getSuspiciousLowAttendance({
    days,
    maxRate,
    minAccountDays,
    limit: 500,
  });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `DELETE FROM attendance_suspicion_flags
       WHERE period_start = ? AND period_end = ? AND period_days = ?`,
      [result.startDate, result.endDate, result.periodDays],
    );

    for (const u of result.users) {
      await connection.execute(
        `INSERT INTO attendance_suspicion_flags
           (user_id, period_days, period_start, period_end, attendance_days, school_days, attendance_rate, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          u.id,
          result.periodDays,
          result.startDate,
          result.endDate,
          u.attendanceDays,
          u.schoolDaysInPeriod,
          u.attendanceRate,
          u.reason,
        ],
      );
    }
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }

  return {
    periodDays: result.periodDays,
    startDate: result.startDate,
    endDate: result.endDate,
    totalSuspicious: result.users.length,
  };
}

export async function getSuspiciousFromFlags({
  days = 14,
  maxRate = 0.25,
  limit = 80,
} = {}) {
  const periodDays = Math.min(Math.max(Number(days) || 14, 7), 60);
  const rowLimit = Math.min(Math.max(Number(limit) || 80, 10), 200);

  const [latest] = await pool.execute(
    `SELECT period_start, period_end, period_days, MAX(computed_at) AS computed_at
     FROM attendance_suspicion_flags
     WHERE period_days = ?
     GROUP BY period_start, period_end, period_days
     ORDER BY computed_at DESC
     LIMIT 1`,
    [periodDays],
  );

  if (!latest.length) {
    return { users: [], totalSuspicious: 0, fromCache: false, computedAt: null };
  }

  const { period_start: startDate, period_end: endDate, computed_at: computedAt } = latest[0];

  const [rows] = await pool.execute(
    `SELECT f.user_id AS id, u.username, u.name_enc, u.name, u.school_id,
            sch.name AS school_name,
            f.attendance_days, f.school_days AS schoolDaysInPeriod,
            f.attendance_rate AS attendanceRate, f.reason
     FROM attendance_suspicion_flags f
     JOIN users u ON u.id = f.user_id
     LEFT JOIN schools sch ON sch.school_id = u.school_id
     WHERE f.period_start = ? AND f.period_end = ? AND f.period_days = ?
       AND u.is_deleted = FALSE AND u.is_banned = FALSE
     ORDER BY f.attendance_rate ASC, f.attendance_days ASC
     LIMIT ?`,
    [startDate, endDate, periodDays, rowLimit],
  );

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS c FROM attendance_suspicion_flags f
     JOIN users u ON u.id = f.user_id
     WHERE f.period_start = ? AND f.period_end = ? AND f.period_days = ?
       AND u.is_deleted = FALSE AND u.is_banned = FALSE`,
    [startDate, endDate, periodDays],
  );
  const totalSuspicious = Number(countRows[0]?.c || 0);

  return {
    users: rows.map((r) => ({
      id: r.id,
      username: r.username,
      name: r.name,
      schoolId: r.school_id,
      schoolName: r.school_name,
      attendanceDays: r.attendance_days,
      schoolDaysInPeriod: r.schoolDaysInPeriod,
      attendanceRate: Number(r.attendanceRate),
      reason: r.reason,
    })),
    totalSuspicious,
    fromCache: true,
    computedAt,
    periodDays,
    startDate,
    endDate,
    maxRate,
  };
}

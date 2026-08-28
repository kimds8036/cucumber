import pool from '../config/database.js';
import { formatKstDateYmd, getKstNow } from './reverification.service.js';
import { isPublicHolidayKst } from '../utils/commuteCalendar.js';
import { resolveUserName } from './userPii.service.js';
import {
  addDaysYmd,
  countSchoolDaysInRange,
  evaluateSchoolDay,
  isWeekendYmd,
  toYmd,
} from '../utils/schoolDay.js';
import { loadTermContextsBySchoolIds } from './schoolTerms.service.js';

function holidayOnYmd(ymd) {
  return isPublicHolidayKst(new Date(`${ymd}T12:00:00+09:00`));
}

/** 폴백: 주말만 제외 (학기 데이터 없을 때) */
export function countSchoolDaysBetween(startYmd, endYmd) {
  let count = 0;
  for (let d = startYmd; d <= endYmd; d = addDaysYmd(d, 1)) {
    if (!isWeekendYmd(d) && !holidayOnYmd(d)) count += 1;
  }
  return count;
}

function schoolDaysForContext(ctx, startDate, endDate) {
  if (!ctx || !ctx.terms.length) {
    return 0;
  }
  return countSchoolDaysInRange({
    startYmd: startDate,
    endYmd: endDate,
    terms: ctx.terms,
    closureSet: ctx.closureSet,
    anniversaryMd: ctx.anniversaryMd,
    isPublicHolidayFn: holidayOnYmd,
  });
}

function clampDays(days) {
  const n = Number(days) || 14;
  return Math.min(Math.max(n, 7), 60);
}

export async function getAttendanceOverview(days = 14) {
  const periodDays = clampDays(days);
  const endDate = formatKstDateYmd(getKstNow());
  const startDate = addDaysYmd(endDate, -(periodDays - 1));

  const [dailyRows] = await pool.execute(
    `SELECT attendance_date AS date,
            COUNT(*) AS checkIns,
            COUNT(DISTINCT user_id) AS uniqueUsers
     FROM attendances
     WHERE attendance_date >= ? AND attendance_date <= ? AND status = 'present'
     GROUP BY attendance_date
     ORDER BY attendance_date ASC`,
    [startDate, endDate],
  );

  const [todayRows, todayUserRows] = await Promise.all([
    pool.execute(
      `SELECT COUNT(*) AS checkIns, COUNT(DISTINCT user_id) AS uniqueUsers
       FROM attendances
       WHERE attendance_date = ? AND status = 'present'`,
      [endDate],
    ).then(([rows]) => rows),
    pool.execute(
      `SELECT u.id, u.username, u.name_enc, sch.name AS school_name, a.checked_at
       FROM attendances a
       INNER JOIN users u ON u.id = a.user_id AND u.is_deleted = FALSE
       LEFT JOIN schools sch ON sch.school_id = u.school_id
       WHERE a.attendance_date = ? AND a.status = 'present'
       ORDER BY a.checked_at DESC
       LIMIT 100`,
      [endDate],
    ).then(([rows]) => rows),
  ]);

  const [activeRows] = await pool.execute(
    `SELECT COUNT(*) AS cnt
     FROM users
     WHERE is_deleted = FALSE
       AND student_verified = TRUE
       AND school_id IS NOT NULL
       AND is_banned = FALSE
       AND (is_suspended = FALSE OR suspended_until IS NULL OR suspended_until < NOW())`,
  );

  const activeStudents = Number(activeRows[0]?.cnt || 0);
  const todayCheckIns = Number(todayRows[0]?.checkIns || 0);
  const todayUnique = Number(todayRows[0]?.uniqueUsers || 0);

  const [schoolIdRows] = await pool.execute(
    `SELECT DISTINCT school_id FROM users
     WHERE is_deleted = FALSE AND school_id IS NOT NULL`,
  );
  const schoolIds = schoolIdRows.map((r) => r.school_id);
  const ctxMap = await loadTermContextsBySchoolIds(schoolIds);
  const anyTerms = [...ctxMap.values()].some((c) => c.terms.length > 0);

  const dailyMap = new Map(
    dailyRows.map((r) => [toYmd(r.date), r]),
  );
  const dailyChart = [];
  let schoolDays = 0;
  for (let i = 0; i < periodDays; i += 1) {
    const date = addDaysYmd(startDate, i);
    const row = dailyMap.get(date);
    let dateIsSchoolDay = false;
    if (anyTerms) {
      for (const id of schoolIds) {
        const ctx = ctxMap.get(id) || { terms: [], closureSet: new Set(), anniversaryMd: null };
        const ev = evaluateSchoolDay({
          ymd: date,
          terms: ctx.terms,
          closureSet: ctx.closureSet,
          anniversaryMd: ctx.anniversaryMd,
          isPublicHoliday: holidayOnYmd(date),
        });
        if (ev.schoolDay) {
          dateIsSchoolDay = true;
          break;
        }
      }
    } else {
      dateIsSchoolDay = !isWeekendYmd(date) && !holidayOnYmd(date);
    }
    if (dateIsSchoolDay) schoolDays += 1;
    dailyChart.push({
      date,
      weekday: dateIsSchoolDay,
      checkIns: Number(row?.checkIns || 0),
      uniqueUsers: Number(row?.uniqueUsers || 0),
    });
  }

  const maxCheckIns = Math.max(1, ...dailyChart.map((d) => d.checkIns));

  return {
    periodDays,
    startDate,
    endDate,
    schoolDays,
    activeStudents,
    todayCheckIns,
    todayUnique,
    todayCheckInUsers: (todayUserRows || []).map((r) => ({
      id: r.id,
      username: r.username,
      name: resolveUserName(r) || null,
      schoolName: r.school_name || null,
      checkedAt: r.checked_at,
    })),
    dailyChart,
    maxCheckIns,
    attendanceRate:
      activeStudents > 0 && schoolDays > 0
        ? Math.round((todayUnique / activeStudents) * 1000) / 10
        : 0,
  };
}

export async function getSuspiciousLowAttendance({
  days = 14,
  maxRate = 0.25,
  minAccountDays = 7,
  limit = 80,
} = {}) {
  const periodDays = clampDays(days);
  const endDate = formatKstDateYmd(getKstNow());
  const startDate = addDaysYmd(endDate, -(periodDays - 1));
  const rateLimit = Math.min(Math.max(Number(maxRate) || 0.25, 0.05), 0.9);
  const minDays = Math.min(Math.max(Number(minAccountDays) || 7, 1), 30);
  const rowLimit = Math.min(Math.max(Number(limit) || 80, 10), 200);

  const [rows] = await pool.execute(
    `SELECT u.id, u.username, u.name_enc, u.school_id, u.created_at,
            sch.name AS school_name,
            COALESCE(att.cnt, 0) AS attendance_days
     FROM users u
     LEFT JOIN schools sch ON u.school_id = sch.school_id
     LEFT JOIN (
       SELECT user_id, COUNT(DISTINCT attendance_date) AS cnt
       FROM attendances
       WHERE attendance_date >= ? AND attendance_date <= ? AND status = 'present'
       GROUP BY user_id
     ) att ON att.user_id = u.id
     WHERE u.is_deleted = FALSE
       AND u.student_verified = TRUE
       AND u.school_id IS NOT NULL
       AND u.is_banned = FALSE
       AND u.created_at < DATE_SUB(CURDATE(), INTERVAL ? DAY)
     ORDER BY attendance_days ASC, u.created_at ASC
     LIMIT 500`,
    [startDate, endDate, minDays],
  );

  const ctxMap = await loadTermContextsBySchoolIds(rows.map((r) => r.school_id));
  const schoolDaysCache = new Map();
  const schoolDaysFor = (schoolId) => {
    if (!schoolId) return 0;
    if (schoolDaysCache.has(schoolId)) return schoolDaysCache.get(schoolId);
    const n = schoolDaysForContext(ctxMap.get(schoolId), startDate, endDate);
    schoolDaysCache.set(schoolId, n);
    return n;
  };

  const users = rows
    .map((r) => {
      const attendanceDays = Number(r.attendance_days || 0);
      const schoolDays = schoolDaysFor(r.school_id);
      const rate =
        schoolDays > 0
          ? Math.round((attendanceDays / schoolDays) * 1000) / 10
          : 0;
      const zeroOnSchoolDays = schoolDays >= 5 && attendanceDays === 0;
      const lowRate = schoolDays > 0 && attendanceDays / schoolDays < rateLimit;
      const suspicious = zeroOnSchoolDays || lowRate;
      return {
        id: r.id,
        username: r.username,
        name: resolveUserName(r) || null,
        schoolId: r.school_id,
        schoolName: r.school_name,
        createdAt: r.created_at,
        attendanceDays,
        schoolDaysInPeriod: schoolDays,
        attendanceRate: rate,
        suspicious,
        reason:
          zeroOnSchoolDays
            ? '기간 내 등교 0회'
            : lowRate
              ? `등교율 ${rate}% (기준 ${Math.round(rateLimit * 100)}% 미만)`
              : null,
      };
    })
    .filter((u) => u.suspicious)
    .slice(0, rowLimit);

  return {
    periodDays,
    startDate,
    endDate,
    schoolDays: countSchoolDaysBetween(startDate, endDate),
    maxRate: rateLimit,
    minAccountDays: minDays,
    totalSuspicious: users.length,
    users,
  };
}

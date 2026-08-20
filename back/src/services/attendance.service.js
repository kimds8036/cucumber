import pool from '../config/database.js';
import { haversineMeters } from '../utils/geo.js';
import { getKstNow, formatKstDateYmd } from '../services/reverification.service.js';
import { getNowForDB } from '../utils/dateUtils.js';
import { getCommuteWindowBlockReason } from '../utils/commuteCalendar.js';
import { evaluateSchoolDayForSchool } from './schoolTerms.service.js';

function parseHmToMinutes(hm, fallbackMinutes) {
  const m = String(hm || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fallbackMinutes;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function isWithinAttendanceWindow(ref = new Date()) {
  const calendarReason = getCommuteWindowBlockReason(ref);
  if (calendarReason) {
    return { ok: false, reason: calendarReason };
  }

  const kst = getKstNow(ref);
  const nowMin = kst.getHours() * 60 + kst.getMinutes();
  const startMin = parseHmToMinutes(
    process.env.ATTENDANCE_WINDOW_START,
    7 * 60,
  );
  // 10:00 미포함 — end 10:00 시각부터 차단 (nowMin >= 600)
  const endMin = parseHmToMinutes(
    process.env.ATTENDANCE_WINDOW_END,
    10 * 60,
  );

  if (nowMin < startMin || nowMin >= endMin) {
    return { ok: false, reason: 'OUTSIDE_WINDOW' };
  }
  return { ok: true };
}

/** 등교 인정 반경(m) — 고정 */
export const ATTENDANCE_GEOFENCE_METERS = 300;

export function getGeofenceMeters() {
  return ATTENDANCE_GEOFENCE_METERS;
}

export async function checkInAttendance({ userId, latitude, longitude }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, status: 400, code: 'INVALID_COORDS', message: '유효한 좌표를 전송해주세요.' };
  }

  const window = isWithinAttendanceWindow();
  if (!window.ok) {
    const messages = {
      WEEKEND: '주말에는 등교 체크를 할 수 없습니다.',
      VACATION: '방학 기간에는 등교 체크를 할 수 없습니다.',
      HOLIDAY: '공휴일에는 등교 체크를 할 수 없습니다.',
      CLOSURE: '휴업일에는 등교 체크를 할 수 없습니다.',
      NO_TERM: '학사일정이 확인되지 않아 등교 체크를 할 수 없습니다.',
      OUTSIDE_WINDOW: '등교 가능 시간이 아닙니다.',
    };
    return {
      ok: false,
      status: 400,
      code: 'OUTSIDE_WINDOW',
      message: messages[window.reason] || messages.OUTSIDE_WINDOW,
    };
  }

  const [users] = await pool.execute(
    `SELECT u.school_id, s.latitude, s.longitude, s.name AS school_name
     FROM users u
     LEFT JOIN schools s ON u.school_id = s.school_id
     WHERE u.id = ? AND u.is_deleted = FALSE
     LIMIT 1`,
    [userId],
  );

  if (!users.length) {
    return { ok: false, status: 404, message: '사용자를 찾을 수 없습니다.' };
  }

  const user = users[0];
  const schoolLat = user.latitude != null ? Number(user.latitude) : null;
  const schoolLng = user.longitude != null ? Number(user.longitude) : null;

  const todayYmd = formatKstDateYmd();
  const schoolDay = await evaluateSchoolDayForSchool(user.school_id, todayYmd);
  if (!schoolDay.schoolDay) {
    const messages = {
      WEEKEND: '주말에는 등교 체크를 할 수 없습니다.',
      VACATION: '방학 기간에는 등교 체크를 할 수 없습니다.',
      HOLIDAY: '공휴일에는 등교 체크를 할 수 없습니다.',
      CLOSURE: '휴업일에는 등교 체크를 할 수 없습니다.',
      NO_TERM: '학사일정이 확인되지 않아 등교 체크를 할 수 없습니다.',
      OUTSIDE_WINDOW: '등교 가능 시간이 아닙니다.',
    };
    return {
      ok: false,
      status: 400,
      code: 'OUTSIDE_WINDOW',
      message: messages[schoolDay.reason] || messages.VACATION,
    };
  }

  if (schoolLat == null || schoolLng == null || !Number.isFinite(schoolLat) || !Number.isFinite(schoolLng)) {
    return {
      ok: false,
      status: 503,
      code: 'SCHOOL_COORDS_MISSING',
      message: '학교 위치 정보가 없어 등교 체크를 할 수 없습니다.',
    };
  }

  const distanceM = haversineMeters(lat, lng, schoolLat, schoolLng);
  const maxM = getGeofenceMeters();

  if (distanceM > maxM) {
    return {
      ok: false,
      status: 400,
      code: 'OUTSIDE_GEOFENCE',
      message: `학교 반경 ${maxM}m 밖입니다. 등교 체크할 수 없습니다.`,
    };
  }

  const attendanceDate = formatKstDateYmd();
  const checkedAt = getNowForDB();

  try {
    await pool.execute(
      `INSERT INTO attendances (user_id, school_id, attendance_date, checked_at, status)
       VALUES (?, ?, ?, ?, 'present')`,
      [userId, user.school_id, attendanceDate, checkedAt],
    );
  } catch (err) {
    if (err.errno === 1062) {
      return {
        ok: false,
        status: 409,
        code: 'ALREADY_CHECKED_IN',
        message: '오늘은 이미 등교 체크를 완료했습니다.',
      };
    }
    throw err;
  }

  return {
    ok: true,
    data: {
      schoolId: user.school_id,
      schoolName: user.school_name,
      attendanceDate,
      checkedAt,
    },
  };
}

export async function getMyAttendances(userId, month) {
  const m = String(month || '').trim();
  if (!/^\d{4}-\d{2}$/.test(m)) {
    return { ok: false, status: 400, message: 'month는 YYYY-MM 형식이어야 합니다.' };
  }

  const [rows] = await pool.execute(
    `SELECT attendance_date, status, checked_at
     FROM attendances
     WHERE user_id = ? AND attendance_date >= ? AND attendance_date < DATE_ADD(?, INTERVAL 1 MONTH)
     ORDER BY attendance_date ASC`,
    [userId, `${m}-01`, `${m}-01`],
  );

  return { ok: true, data: { month: m, attendances: rows } };
}

export async function getAttendanceStatus(userId) {
  const window = isWithinAttendanceWindow();
  const todayYmd = formatKstDateYmd();

  const [users] = await pool.execute(
    `SELECT u.school_id
     FROM users u
     WHERE u.id = ? AND u.is_deleted = FALSE
     LIMIT 1`,
    [userId],
  );
  if (!users.length) {
    return { ok: false, status: 404, message: '사용자를 찾을 수 없습니다.' };
  }

  const schoolId = users[0].school_id;
  const schoolEval = schoolId
    ? await evaluateSchoolDayForSchool(schoolId, todayYmd)
    : { schoolDay: false, reason: 'NO_TERM' };

  const [rows] = await pool.execute(
    `SELECT attendance_date FROM attendances
     WHERE user_id = ? AND attendance_date = ? LIMIT 1`,
    [userId, todayYmd],
  );
  const alreadyCheckedIn = rows.length > 0;
  const windowOk = window.ok;
  const schoolDay = Boolean(schoolEval.schoolDay);
  const canShowBanner = schoolDay && windowOk && !alreadyCheckedIn;

  return {
    ok: true,
    data: {
      schoolDay,
      windowOk,
      alreadyCheckedIn,
      canShowBanner,
      reason: !schoolDay
        ? schoolEval.reason
        : !windowOk
          ? window.reason
          : alreadyCheckedIn
            ? 'ALREADY_CHECKED_IN'
            : null,
      attendanceDate: todayYmd,
    },
  };
}

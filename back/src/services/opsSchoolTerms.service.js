import pool from '../config/database.js';
import { formatKstDateYmd } from './reverification.service.js';
import { isWithinAttendanceWindow } from './attendance.service.js';
import {
  holidayOnYmd,
  listActiveUserSchools,
  loadTermContextsBySchoolIds,
} from './schoolTerms.service.js';
import { evaluateSchoolDay, termCoversYmd, toYmd } from '../utils/schoolDay.js';

const REASON_KO = {
  WEEKEND: '주말',
  HOLIDAY: '공휴일',
  CLOSURE: '휴업',
  NO_TERM: '학기 미적재',
  VACATION: '방학',
  OUTSIDE_WINDOW: '등교 시간 아님',
};

function termSortKey(t) {
  return `${Number(t.academic_year) || 0}-${Number(t.semester) || 0}`;
}

export async function getOpsSchoolTermsOverview() {
  const todayYmd = formatKstDateYmd();
  const window = isWithinAttendanceWindow();
  const schools = await listActiveUserSchools();
  const schoolIds = schools.map((s) => s.school_id);
  if (!schoolIds.length) {
    return {
      todayYmd,
      window: {
        ok: window.ok,
        reason: window.reason || null,
        reasonLabel: window.ok ? '등교 시간대' : (REASON_KO[window.reason] || window.reason),
        start: process.env.ATTENDANCE_WINDOW_START || '07:00',
        end: process.env.ATTENDANCE_WINDOW_END || '10:00',
      },
      summary: { schools: 0, schoolDayToday: 0, inSessionToday: 0, missingTerms: 0 },
      schools: [],
    };
  }

  const placeholders = schoolIds.map(() => '?').join(',');
  const [nameRows] = await pool.execute(
    `SELECT school_id, name FROM schools WHERE school_id IN (${placeholders})`,
    schoolIds,
  );
  const nameById = new Map(nameRows.map((r) => [r.school_id, r.name]));

  const [termRows] = await pool.execute(
    `SELECT school_id, academic_year, semester, open_ymd, close_ymd, confidence, source
     FROM school_terms
     WHERE school_id IN (${placeholders})
     ORDER BY academic_year DESC, semester DESC`,
    schoolIds,
  );
  const termsBySchool = new Map();
  for (const t of termRows) {
    const list = termsBySchool.get(t.school_id) || [];
    list.push(t);
    termsBySchool.set(t.school_id, list);
  }

  const [userCounts] = await pool.execute(
    `SELECT school_id, COUNT(*) AS c
     FROM users
     WHERE is_deleted = FALSE AND school_id IN (${placeholders})
     GROUP BY school_id`,
    schoolIds,
  );
  const usersBySchool = new Map(userCounts.map((r) => [r.school_id, Number(r.c || 0)]));

  const ctxBySchool = await loadTermContextsBySchoolIds(schoolIds);
  const out = [];
  let schoolDayToday = 0;
  let inSessionToday = 0;
  let missingTerms = 0;

  for (const s of schools) {
    const ctx = ctxBySchool.get(s.school_id) || {
      terms: [],
      closureSet: new Set(),
      anniversaryMd: null,
    };
    const day = evaluateSchoolDay({
      ymd: todayYmd,
      terms: ctx.terms,
      closureSet: ctx.closureSet,
      anniversaryMd: ctx.anniversaryMd,
      isPublicHoliday: holidayOnYmd(todayYmd),
    });
    const terms = (termsBySchool.get(s.school_id) || []).slice().sort((a, b) =>
      termSortKey(b).localeCompare(termSortKey(a)),
    );
    if (!terms.length) missingTerms += 1;
    if (day.schoolDay) schoolDayToday += 1;
    const anyInSession = terms.some((t) => termCoversYmd(t, todayYmd));
    if (anyInSession) inSessionToday += 1;

    out.push({
      schoolId: s.school_id,
      schoolName: nameById.get(s.school_id) || s.school_id,
      userCount: usersBySchool.get(s.school_id) || 0,
      today: {
        schoolDay: Boolean(day.schoolDay),
        reason: day.reason,
        reasonLabel: day.schoolDay ? '등교일' : (REASON_KO[day.reason] || day.reason || '-'),
        checkInPossibleNow: Boolean(day.schoolDay && window.ok),
      },
      terms: terms.map((t) => {
        const open = toYmd(t.open_ymd);
        const close = toYmd(t.close_ymd);
        const inSession = termCoversYmd(t, todayYmd);
        return {
          academicYear: t.academic_year,
          semester: t.semester,
          openYmd: open,
          closeYmd: close,
          inSessionToday: inSession,
          confidence: t.confidence || null,
          source: t.source || null,
        };
      }),
    });
  }

  out.sort((a, b) => String(a.schoolName).localeCompare(String(b.schoolName), 'ko'));

  return {
    todayYmd,
    window: {
      ok: window.ok,
      reason: window.reason || null,
      reasonLabel: window.ok ? '등교 시간대' : (REASON_KO[window.reason] || window.reason),
      start: process.env.ATTENDANCE_WINDOW_START || '07:00',
      end: process.env.ATTENDANCE_WINDOW_END || '10:00',
    },
    summary: {
      schools: out.length,
      schoolDayToday,
      inSessionToday,
      missingTerms,
    },
    schools: out,
  };
}

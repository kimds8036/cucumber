import pool from '../config/database.js';
import { formatKstDateYmd, getKstNow } from './reverification.service.js';
import { isPublicHolidayKst } from '../utils/commuteCalendar.js';
import {
  anniversaryMdFromDate,
  evaluateSchoolDay,
  toYmd,
} from '../utils/schoolDay.js';
import {
  buildTermsFromEvents,
  fetchSchoolScheduleEvents,
  sleep,
} from './neisSchoolSchedule.service.js';

function holidayOnYmd(ymd) {
  return isPublicHolidayKst(new Date(`${ymd}T12:00:00+09:00`));
}

export async function listActiveUserSchools() {
  const [rows] = await pool.execute(
    `SELECT DISTINCT u.school_id, s.edu_office_code, s.admin_standard_code, s.anniversary_date
     FROM users u
     INNER JOIN schools s ON s.school_id = u.school_id
     WHERE u.is_deleted = FALSE
       AND u.school_id IS NOT NULL
       AND s.edu_office_code IS NOT NULL
       AND s.admin_standard_code IS NOT NULL`,
  );
  return rows;
}

export async function getSchoolTermContext(schoolId) {
  const [[school]] = await pool.execute(
    `SELECT school_id, edu_office_code, admin_standard_code, anniversary_date
     FROM schools WHERE school_id = ? LIMIT 1`,
    [schoolId],
  );
  const [terms] = await pool.execute(
    `SELECT school_id, academic_year, semester, open_ymd, close_ymd, confidence, source
     FROM school_terms WHERE school_id = ?`,
    [schoolId],
  );
  const [closures] = await pool.execute(
    `SELECT ymd FROM school_closures WHERE school_id = ?`,
    [schoolId],
  );
  const closureSet = new Set(closures.map((r) => toYmd(r.ymd)));
  return {
    school,
    terms,
    closureSet,
    anniversaryMd: anniversaryMdFromDate(school?.anniversary_date),
  };
}

export async function evaluateSchoolDayForSchool(schoolId, ymd) {
  const ctx = await getSchoolTermContext(schoolId);
  return evaluateSchoolDay({
    ymd,
    terms: ctx.terms,
    closureSet: ctx.closureSet,
    anniversaryMd: ctx.anniversaryMd,
    isPublicHoliday: holidayOnYmd(ymd),
  });
}

export async function upsertSchoolTermsAndClosures(schoolId, terms, closureEvents) {
  const fetchedAt = new Date();
  for (const t of terms) {
    await pool.execute(
      `INSERT INTO school_terms
         (school_id, academic_year, semester, open_ymd, close_ymd, source, confidence, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         open_ymd = VALUES(open_ymd),
         close_ymd = VALUES(close_ymd),
         source = VALUES(source),
         confidence = VALUES(confidence),
         fetched_at = VALUES(fetched_at)`,
      [
        schoolId,
        t.academicYear,
        t.semester,
        t.openYmd,
        t.closeYmd,
        t.source,
        t.confidence,
        fetchedAt,
      ],
    );
  }

  const ymds = closureEvents.map((e) => e.ymd).filter(Boolean);
  if (!ymds.length) return;

  for (const e of closureEvents) {
    await pool.execute(
      `INSERT INTO school_closures (school_id, ymd, reason, source)
       VALUES (?, ?, ?, 'neis_schedule')
       ON DUPLICATE KEY UPDATE reason = VALUES(reason), source = VALUES(source)`,
      [schoolId, e.ymd, e.name || '휴업'],
    );
  }
}

function scheduleRangeForNow(ref = new Date()) {
  const kst = getKstNow(ref);
  const month = kst.getMonth() + 1;
  const year = kst.getFullYear();
  const academicYear = month >= 3 ? year : year - 1;
  return {
    fromYmd: `${academicYear}-02-01`,
    toYmd: `${academicYear + 1}-02-28`,
    academicYear,
  };
}

export async function syncSchoolTermsForSchool(schoolId, schoolRow = null) {
  let row = schoolRow;
  if (!row) {
    const [[found]] = await pool.execute(
      `SELECT school_id, edu_office_code, admin_standard_code
       FROM schools WHERE school_id = ? LIMIT 1`,
      [schoolId],
    );
    row = found;
  }
  if (!row?.edu_office_code || !row?.admin_standard_code) {
    return { ok: false, skipped: true, reason: 'no-codes' };
  }

  const { fromYmd, toYmd } = scheduleRangeForNow();
  const fetched = await fetchSchoolScheduleEvents({
    eduOfficeCode: row.edu_office_code,
    schoolCode: row.admin_standard_code,
    fromYmd,
    toYmd,
  });
  if (!fetched.ok) {
    return { ok: false, code: fetched.code, eventCount: 0 };
  }

  const terms = buildTermsFromEvents(fetched.events);
  const closures = fetched.events.filter((e) => e.kind === 'closure');
  await upsertSchoolTermsAndClosures(schoolId, terms, closures);
  return {
    ok: true,
    termCount: terms.length,
    closureCount: closures.length,
    eventCount: fetched.events.length,
  };
}

export function scheduleSchoolTermSync(schoolId) {
  if (!schoolId) return;
  setImmediate(() => {
    syncSchoolTermsForSchool(schoolId).catch((err) => {
      console.warn('[schoolTerms] on-demand sync failed', schoolId, err?.message || err);
    });
  });
}

export async function loadTermContextsBySchoolIds(schoolIds) {
  const ids = [...new Set((schoolIds || []).filter(Boolean))];
  const map = new Map();
  if (!ids.length) return map;

  const placeholders = ids.map(() => '?').join(',');
  const [schools] = await pool.execute(
    `SELECT school_id, anniversary_date FROM schools WHERE school_id IN (${placeholders})`,
    ids,
  );
  const [terms] = await pool.execute(
    `SELECT school_id, academic_year, semester, open_ymd, close_ymd
     FROM school_terms WHERE school_id IN (${placeholders})`,
    ids,
  );
  const [closures] = await pool.execute(
    `SELECT school_id, ymd FROM school_closures WHERE school_id IN (${placeholders})`,
    ids,
  );

  for (const id of ids) {
    map.set(id, {
      terms: [],
      closureSet: new Set(),
      anniversaryMd: null,
    });
  }
  for (const s of schools) {
    const ctx = map.get(s.school_id) || {
      terms: [],
      closureSet: new Set(),
      anniversaryMd: null,
    };
    ctx.anniversaryMd = anniversaryMdFromDate(s.anniversary_date);
    map.set(s.school_id, ctx);
  }
  for (const t of terms) {
    const ctx = map.get(t.school_id);
    if (ctx) ctx.terms.push(t);
  }
  for (const c of closures) {
    const ctx = map.get(c.school_id);
    if (ctx) ctx.closureSet.add(toYmd(c.ymd));
  }
  return map;
}

export { holidayOnYmd, formatKstDateYmd };

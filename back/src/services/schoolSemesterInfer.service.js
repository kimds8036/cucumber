import pool from '../config/database.js';
import { formatKstDateYmd, getKstNow } from './reverification.service.js';
import { academicYearOfYmd, addDaysYmd, toYmd } from '../utils/schoolDay.js';
import { upsertSchoolTermsAndClosures } from './schoolTerms.service.js';
import { getBatchCursor, saveBatchCursor } from './batchCursor.service.js';
import { sleep } from './neisSchoolSchedule.service.js';
import {
  semester1OpenYmd,
} from './schoolSemester.service.js';

const NEIS_KEY = () => process.env.NEIS_API_KEY || process.env.NEIS_KEY || '';
const MEAL_URL = 'https://open.neis.go.kr/hub/mealServiceDietInfo';
const HIS_URL = 'https://open.neis.go.kr/hub/hisTimetable';
const MIS_URL = 'https://open.neis.go.kr/hub/misTimetable';

export const SEMESTER_INFER_JOB = 'school-semester-infer';

function compactYmd(dashYmd) {
  return String(dashYmd || '').replace(/-/g, '');
}

function dashFromCompact(raw) {
  const s = String(raw || '');
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return toYmd(s);
}

function normalizeSchoolLevel(level, schoolType, schoolName = '') {
  const bundle = `${level || ''}\u0000${schoolType || ''}\u0000${schoolName || ''}`;
  if (/고등학교/.test(bundle) || /\b고등\b/.test(bundle)) return 'high';
  if (/중학교/.test(bundle)) return 'middle';
  if ((level || '').includes('중') && !(level || '').includes('고')) return 'middle';
  return 'high';
}

function isWeekdayYmd(ymd) {
  const d = new Date(`${ymd}T12:00:00+09:00`);
  const dow = d.getDay();
  return dow >= 1 && dow <= 5;
}

function cursorKey(schoolId, academicYear) {
  return `school:${schoolId}:ay:${academicYear}`;
}

export function isSemesterInferSeason(ref = new Date()) {
  if (String(process.env.CRON_SEMESTER_INFER_FORCE || '').toLowerCase() === 'true') {
    return true;
  }
  const m = getKstNow(ref).getMonth() + 1;
  return (m >= 7 && m <= 9) || m === 12 || m === 1 || m === 2 || m === 3;
}

export async function listActiveUserSchoolsForSemesterInfer() {
  const [rows] = await pool.execute(
    `SELECT DISTINCT
       u.school_id,
       s.edu_office_code,
       s.admin_standard_code,
       s.school_level,
       s.school_type,
       s.name AS school_name
     FROM users u
     INNER JOIN schools s ON s.school_id = u.school_id
     WHERE u.is_deleted = FALSE
       AND u.school_id IS NOT NULL
       AND s.edu_office_code IS NOT NULL
       AND s.admin_standard_code IS NOT NULL`,
  );
  return rows;
}

async function fetchMealDates({ eduOfficeCode, schoolCode, fromYmd, toYmd }) {
  const key = NEIS_KEY();
  if (!key) return { ok: false, dates: [] };
  const params = new URLSearchParams({
    KEY: key,
    Type: 'json',
    pIndex: '1',
    pSize: '1000',
    ATPT_OFCDC_SC_CODE: String(eduOfficeCode),
    SD_SCHUL_CODE: String(schoolCode),
    MLSV_FROM_YMD: compactYmd(fromYmd),
    MLSV_TO_YMD: compactYmd(toYmd),
  });
  const res = await fetch(`${MEAL_URL}?${params.toString()}`);
  const json = await res.json();
  const code = json?.mealServiceDietInfo?.[0]?.head?.[1]?.RESULT?.CODE;
  if (code && code !== 'INFO-000') return { ok: true, dates: [] };
  let rows = json?.mealServiceDietInfo?.[1]?.row || [];
  if (!Array.isArray(rows)) rows = rows ? [rows] : [];
  const dates = new Set();
  for (const r of rows) {
    // 중식 위주 (MMEAL_SC_CODE 2). 조식/석식만 있어도 등교로 본다.
    const ymd = dashFromCompact(r.MLSV_YMD);
    if (ymd) dates.add(ymd);
  }
  return { ok: true, dates: [...dates].sort() };
}

async function countTimetableRows({
  eduOfficeCode,
  schoolCode,
  schoolLevel,
  grade = 1,
  semester,
  fromYmd,
  toYmd,
}) {
  const key = NEIS_KEY();
  if (!key) return 0;
  const high = schoolLevel === 'high';
  const url = high ? HIS_URL : MIS_URL;
  const root = high ? 'hisTimetable' : 'misTimetable';
  const params = new URLSearchParams({
    KEY: key,
    Type: 'json',
    pIndex: '1',
    pSize: '100',
    ATPT_OFCDC_SC_CODE: String(eduOfficeCode),
    SD_SCHUL_CODE: String(schoolCode),
    GRADE: String(grade),
    SEM: String(semester),
    TI_FROM_YMD: compactYmd(fromYmd),
    TI_TO_YMD: compactYmd(toYmd),
  });
  const res = await fetch(`${url}?${params.toString()}`);
  const json = await res.json();
  const code = json?.[root]?.[0]?.head?.[1]?.RESULT?.CODE;
  if (code && code !== 'INFO-000') return 0;
  let rows = json?.[root]?.[1]?.row || [];
  if (!Array.isArray(rows)) rows = rows ? [rows] : [];
  return rows.length;
}

/**
 * 급식 날짜 집합에서 “긴 공백 뒤 첫 평일 급식일”을 2학기 개학 후보로 본다.
 * fromProbe(기본 7/15) 이후 첫 급식 전, 직전 5일 이상 급식 공백이 있으면 개학으로 인정.
 */
export function inferOpenAfterGap(mealDatesSorted, {
  windowStart,
  windowEnd,
  gapMinDays = 5,
  probeFrom,
} = {}) {
  const set = new Set(mealDatesSorted || []);
  const start = probeFrom || windowStart;
  let cursor = start;
  for (let guard = 0; cursor <= windowEnd && guard < 120; guard += 1) {
    if (isWeekdayYmd(cursor) && set.has(cursor)) {
      let gap = 0;
      let back = addDaysYmd(cursor, -1);
      for (let g = 0; g < 21 && back >= windowStart; g += 1) {
        if (isWeekdayYmd(back) && !set.has(back)) gap += 1;
        if (isWeekdayYmd(back) && set.has(back)) break;
        back = addDaysYmd(back, -1);
      }
      if (gap >= gapMinDays) return cursor;
      // 공백 없이 이어지는 급식이면 더 이후를 보지 않고 첫 평일 급식을 반환하지 않음
    }
    cursor = addDaysYmd(cursor, 1);
  }
  return null;
}

export function inferCloseBeforeGap(mealDatesSorted, {
  windowStart,
  windowEnd,
  gapMinDays = 5,
} = {}) {
  const set = new Set(mealDatesSorted || []);
  const inWindow = (mealDatesSorted || []).filter(
    (d) => d >= windowStart && d <= windowEnd && isWeekdayYmd(d),
  );
  if (!inWindow.length) return null;
  // 뒤에서부터: 이후 gapMinDays 평일 이상 급식 없음
  for (let i = inWindow.length - 1; i >= 0; i -= 1) {
    const day = inWindow[i];
    let gap = 0;
    let fwd = addDaysYmd(day, 1);
    for (let g = 0; g < 21 && fwd <= windowEnd; g += 1) {
      if (isWeekdayYmd(fwd) && !set.has(fwd)) gap += 1;
      if (isWeekdayYmd(fwd) && set.has(fwd)) {
        gap = 0;
        break;
      }
      fwd = addDaysYmd(fwd, 1);
    }
    if (gap >= gapMinDays) return day;
  }
  return inWindow[inWindow.length - 1];
}

/** NEIS 학사일정(high)이 있으면 open을 덮어쓰지 않고 close만 보강 */
async function upsertInferredTermsPreferringSchedule(schoolId, terms) {
  const toUpsert = [];
  for (const t of terms) {
    const [[ex]] = await pool.execute(
      `SELECT source, confidence, open_ymd, close_ymd
       FROM school_terms
       WHERE school_id = ? AND academic_year = ? AND semester = ?
       LIMIT 1`,
      [schoolId, t.academicYear, t.semester],
    );
    if (
      ex?.source === 'neis_schedule' &&
      (ex.confidence === 'high' || ex.confidence === 'medium') &&
      ex.open_ymd
    ) {
      const open = toYmd(ex.open_ymd);
      const close = t.closeYmd || toYmd(ex.close_ymd);
      toUpsert.push({
        ...t,
        openYmd: open,
        closeYmd: close,
        source: 'neis_schedule',
        confidence: ex.confidence,
      });
      continue;
    }
    toUpsert.push(t);
  }
  if (toUpsert.length) {
    await upsertSchoolTermsAndClosures(schoolId, toUpsert, []);
  }
}

async function isAlreadyConfirmed(schoolId, academicYear) {
  const cur = await getBatchCursor(SEMESTER_INFER_JOB, cursorKey(schoolId, academicYear));
  return cur?.mode === 'confirmed';
}

async function markConfirmed(schoolId, academicYear, payload) {
  await saveBatchCursor(SEMESTER_INFER_JOB, cursorKey(schoolId, academicYear), {
    mode: 'confirmed',
    lastAt: new Date(),
    note: JSON.stringify(payload).slice(0, 250),
  });
}

/**
 * 한 학교에 대해 급식·시간표로 개학/방학을 유추하고 school_terms에 반영.
 */
export async function inferAndPersistSchoolSemester(schoolRow, ref = new Date()) {
  const today = formatKstDateYmd(getKstNow(ref));
  const ay = academicYearOfYmd(today);
  const schoolId = schoolRow.school_id;

  if (await isAlreadyConfirmed(schoolId, ay)) {
    return { skipped: true, reason: 'confirmed', schoolId, academicYear: ay };
  }

  const level = normalizeSchoolLevel(
    schoolRow.school_level,
    schoolRow.school_type,
    schoolRow.school_name,
  );
  const month = Number(today.slice(5, 7));
  const sources = [];
  const terms = [];

  const sem1Open = semester1OpenYmd(ay);
  let sem1Close = `${ay}-07-20`;
  let sem2Open = null;
  let sem2Close = `${ay}-12-31`;
  let confidence = 'low';

  // 여름 구간: 2학기 개학 유추 (7~9월 집중, 그 외에도 강제 시)
  if (month >= 7 && month <= 9) {
    const mealFrom = `${ay}-07-01`;
    const mealTo = `${ay}-09-30`;
    const meals = await fetchMealDates({
      eduOfficeCode: schoolRow.edu_office_code,
      schoolCode: schoolRow.admin_standard_code,
      fromYmd: mealFrom,
      toYmd: mealTo,
    });
    await sleep(80);
    if (meals.ok && meals.dates.length) {
      sources.push('meal');
      const close1 = inferCloseBeforeGap(meals.dates, {
        windowStart: mealFrom,
        windowEnd: `${ay}-08-20`,
        gapMinDays: 5,
      });
      if (close1) sem1Close = close1;
      const open2 = inferOpenAfterGap(meals.dates, {
        windowStart: mealFrom,
        windowEnd: mealTo,
        probeFrom: `${ay}-07-15`,
        gapMinDays: 5,
      });
      if (open2) sem2Open = open2;
    }

    // 시간표 SEM 확인: 이번 주 SEM1 vs SEM2
    const weekFrom = today;
    const weekTo = addDaysYmd(today, 4);
    const [c1, c2] = await Promise.all([
      countTimetableRows({
        eduOfficeCode: schoolRow.edu_office_code,
        schoolCode: schoolRow.admin_standard_code,
        schoolLevel: level,
        semester: 1,
        fromYmd: weekFrom,
        toYmd: weekTo,
      }),
      countTimetableRows({
        eduOfficeCode: schoolRow.edu_office_code,
        schoolCode: schoolRow.admin_standard_code,
        schoolLevel: level,
        semester: 2,
        fromYmd: weekFrom,
        toYmd: weekTo,
      }),
    ]);
    await sleep(80);
    if (c1 > 0 || c2 > 0) sources.push('timetable');
    if (c2 > 0 && c1 === 0 && !sem2Open) {
      // 급식으로 못 찾았지만 시간표는 2학기만 있음 → 오늘을 개학 하한으로
      sem2Open = today;
      confidence = 'medium';
    } else if (c2 > 0 && sem2Open) {
      confidence = 'high';
    } else if (sem2Open) {
      confidence = 'medium';
    }
  }

  // 겨울 구간: 2학기 종업·다음 1학기(3/1) 고정
  if (month === 12 || month <= 3) {
    const mealFrom = `${ay}-12-01`;
    const mealTo = `${ay + 1}-03-15`;
    const meals = await fetchMealDates({
      eduOfficeCode: schoolRow.edu_office_code,
      schoolCode: schoolRow.admin_standard_code,
      fromYmd: mealFrom,
      toYmd: mealTo,
    });
    await sleep(80);
    if (meals.ok && meals.dates.length) {
      sources.push('meal');
      const close2 = inferCloseBeforeGap(meals.dates, {
        windowStart: mealFrom,
        windowEnd: `${ay + 1}-02-28`,
        gapMinDays: 5,
      });
      if (close2) sem2Close = close2;
      confidence = confidence === 'low' ? 'medium' : confidence;
    }
    // 기존 2학기 open이 DB에 있으면 유지
    const [[existing2]] = await pool.execute(
      `SELECT open_ymd FROM school_terms
       WHERE school_id = ? AND academic_year = ? AND semester = 2 LIMIT 1`,
      [schoolId, ay],
    );
    if (existing2?.open_ymd) sem2Open = toYmd(existing2.open_ymd);
  }

  // 기존 NEIS 일정 학기 행이 있으면 open을 존중
  const [existingTerms] = await pool.execute(
    `SELECT semester, open_ymd, close_ymd, source, confidence
     FROM school_terms WHERE school_id = ? AND academic_year = ?`,
    [schoolId, ay],
  );
  for (const t of existingTerms) {
    if (Number(t.semester) === 2 && t.open_ymd && !sem2Open) {
      sem2Open = toYmd(t.open_ymd);
      sources.push(t.source || 'school_terms');
    }
    if (Number(t.semester) === 1 && t.close_ymd && sem1Close === `${ay}-07-20`) {
      sem1Close = toYmd(t.close_ymd);
    }
  }

  terms.push({
    academicYear: ay,
    semester: 1,
    openYmd: sem1Open,
    closeYmd: sem1Close,
    confidence: 'high',
    source: 'semester_policy',
  });

  if (sem2Open) {
    if (sem2Close < sem2Open) sem2Close = `${ay}-12-31`;
    terms.push({
      academicYear: ay,
      semester: 2,
      openYmd: sem2Open,
      closeYmd: sem2Close,
      confidence,
      source: 'meal_timetable_infer',
    });
  }

  if (!sem2Open && month >= 7 && month <= 9) {
    await saveBatchCursor(SEMESTER_INFER_JOB, cursorKey(schoolId, ay), {
      mode: 'pending',
      lastAt: new Date(),
      note: `no-sem2-open sources=${sources.join(',') || 'none'}`.slice(0, 250),
    });
    return {
      skipped: false,
      confirmed: false,
      schoolId,
      academicYear: ay,
      reason: 'no-sem2-open',
      sources,
    };
  }

  await upsertInferredTermsPreferringSchedule(schoolId, terms);

  const canConfirm =
    Boolean(sem2Open) ||
    (month <= 3 && Boolean(sem2Close));

  if (canConfirm && (confidence === 'high' || confidence === 'medium' || sources.includes('school_terms'))) {
    await markConfirmed(schoolId, ay, {
      sem1Open,
      sem1Close,
      sem2Open,
      sem2Close,
      sources,
      confidence,
    });
    return {
      skipped: false,
      confirmed: true,
      schoolId,
      academicYear: ay,
      sem2Open,
      sources,
      confidence,
    };
  }

  await saveBatchCursor(SEMESTER_INFER_JOB, cursorKey(schoolId, ay), {
    mode: 'pending',
    lastAt: new Date(),
    note: JSON.stringify({ sem1Open, sem1Close, sem2Open, sem2Close, sources }).slice(0, 250),
  });

  return {
    skipped: false,
    confirmed: false,
    schoolId,
    academicYear: ay,
    sem2Open,
    sources,
    confidence,
  };
}

/** 학기 구간 + 주말/공휴일/휴업으로 등교일 판정 (순수 함수) */

export function toYmd(value) {
  if (value == null) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw.slice(0, 10);
}

export function parseYmdKst(ymd) {
  return new Date(`${toYmd(ymd)}T12:00:00+09:00`);
}

export function addDaysYmd(ymd, deltaDays) {
  const d = parseYmdKst(ymd);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isWeekendYmd(ymd) {
  const dow = parseYmdKst(ymd).getDay();
  return dow === 0 || dow === 6;
}

export function academicYearOfYmd(ymd) {
  const m = Number(String(ymd).slice(5, 7));
  const y = Number(String(ymd).slice(0, 4));
  return m >= 3 ? y : y - 1;
}

export function semesterOfOpenYmd(ymd) {
  const m = Number(String(ymd).slice(5, 7));
  if (m >= 2 && m <= 6) return 1;
  return 2;
}

/** close 미확정이면 개학 후 140일까지 학기 중으로 본다 */
const OPEN_ONLY_SPAN_DAYS = 140;

export function termCoversYmd(term, ymd) {
  const open = toYmd(term.open_ymd);
  if (!open || ymd < open) return false;
  const close = toYmd(term.close_ymd);
  if (close) return ymd <= close;
  return ymd <= addDaysYmd(open, OPEN_ONLY_SPAN_DAYS);
}

/**
 * @returns {{ schoolDay: boolean, reason: string|null }}
 * reason: WEEKEND | HOLIDAY | CLOSURE | NO_TERM | VACATION | null
 */
export function evaluateSchoolDay({
  ymd,
  terms = [],
  closureSet = new Set(),
  anniversaryMd = null,
  isPublicHoliday = false,
}) {
  const day = toYmd(ymd);
  if (!day) {
    return { schoolDay: false, reason: 'NO_TERM' };
  }
  if (isWeekendYmd(day)) {
    return { schoolDay: false, reason: 'WEEKEND' };
  }
  if (isPublicHoliday) {
    return { schoolDay: false, reason: 'HOLIDAY' };
  }
  const md = day.slice(5);
  if (anniversaryMd && md === anniversaryMd) {
    return { schoolDay: false, reason: 'CLOSURE' };
  }
  if (closureSet.has(day)) {
    return { schoolDay: false, reason: 'CLOSURE' };
  }
  if (!terms.length) {
    return { schoolDay: false, reason: 'NO_TERM' };
  }
  if (!terms.some((t) => termCoversYmd(t, day))) {
    return { schoolDay: false, reason: 'VACATION' };
  }
  return { schoolDay: true, reason: null };
}

export function countSchoolDaysInRange({
  startYmd,
  endYmd,
  terms,
  closureSet,
  anniversaryMd,
  isPublicHolidayFn,
}) {
  let count = 0;
  const start = toYmd(startYmd);
  const end = toYmd(endYmd);
  for (let d = start; d <= end; d = addDaysYmd(d, 1)) {
    const { schoolDay } = evaluateSchoolDay({
      ymd: d,
      terms,
      closureSet,
      anniversaryMd,
      isPublicHoliday: isPublicHolidayFn(d),
    });
    if (schoolDay) count += 1;
  }
  return count;
}

export function anniversaryMdFromDate(value) {
  const ymd = toYmd(value);
  return ymd ? ymd.slice(5) : null;
}

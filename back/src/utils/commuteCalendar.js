/** 프론트 commuteUtils.js 와 동일한 등교 배너·체크인 달력 규칙 (KST) */

const KST_TIMEZONE = 'Asia/Seoul';

/** 방학: 1~2월, 7~8월 */
const VACATION_MONTHS = new Set([1, 2, 7, 8]);

const FIXED_HOLIDAY_MD = new Set([
  '01-01',
  '03-01',
  '05-05',
  '06-06',
  '08-15',
  '10-03',
  '10-09',
  '12-25',
]);

const VARIABLE_HOLIDAYS = new Set([
  '2025-01-28',
  '2025-01-29',
  '2025-01-30',
  '2025-03-03',
  '2025-05-05',
  '2025-05-06',
  '2025-06-06',
  '2025-10-05',
  '2025-10-06',
  '2025-10-07',
  '2025-10-08',
  '2026-01-01',
  '2026-02-16',
  '2026-02-17',
  '2026-02-18',
  '2026-03-02',
  '2026-05-05',
  '2026-05-24',
  '2026-06-06',
  '2026-09-24',
  '2026-09-25',
  '2026-09-26',
  '2026-10-05',
]);

export function getKstParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type)?.value || '';
  return {
    year: Number(part('year')),
    month: Number(part('month')),
    day: Number(part('day')),
    hour: Number(part('hour')),
    minute: Number(part('minute')),
    weekday: part('weekday'),
  };
}

export function isWeekdayKst(date = new Date()) {
  const { weekday } = getKstParts(date);
  return weekday !== 'Sat' && weekday !== 'Sun';
}

export function isSchoolVacationMonth(date = new Date()) {
  const { month } = getKstParts(date);
  return VACATION_MONTHS.has(month);
}

export function isPublicHolidayKst(date = new Date()) {
  const { year, month, day } = getKstParts(date);
  const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const md = ymd.slice(5);
  return FIXED_HOLIDAY_MD.has(md) || VARIABLE_HOLIDAYS.has(ymd);
}

/** 07:00 ~ 08:59 (09:00 미포함) */
export function isCommuteTimeWindowKst(date = new Date()) {
  const { hour } = getKstParts(date);
  return hour >= 7 && hour < 9;
}

export function getCommuteWindowBlockReason(date = new Date()) {
  if (!isCommuteTimeWindowKst(date)) return 'OUTSIDE_WINDOW';
  if (!isWeekdayKst(date)) return 'WEEKEND';
  if (isSchoolVacationMonth(date)) return 'VACATION';
  if (isPublicHolidayKst(date)) return 'HOLIDAY';
  return null;
}

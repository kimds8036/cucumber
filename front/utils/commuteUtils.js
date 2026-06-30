const KST_TIMEZONE = 'Asia/Seoul';

/** 방학: 1~2월, 7~8월 */
const VACATION_MONTHS = new Set([1, 2, 7, 8]);

/** 고정 공휴일 (매년 MM-DD) */
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

/** 음력·대체공휴일 등 연도별 임시 공휴일 (YYYY-MM-DD) */
const VARIABLE_HOLIDAYS = new Set([
  // 2025
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
  // 2026
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

export function getCommuteDayKey(date = new Date()) {
  const { year, month, day } = getKstParts(date);
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function isWeekdayKst(date = new Date()) {
  const { weekday } = getKstParts(date);
  return weekday !== 'Sat' && weekday !== 'Sun';
}

export function isSchoolVacationMonth(date = new Date()) {
  const { month } = getKstParts(date);
  return VACATION_MONTHS.has(month);
}

export function isPublicHoliday(date = new Date()) {
  const { year, month, day } = getKstParts(date);
  const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const md = ymd.slice(5);
  return FIXED_HOLIDAY_MD.has(md) || VARIABLE_HOLIDAYS.has(ymd);
}

/** 평일 오전 7시(포함) ~ 10시(미포함), 즉 07:00~09:59 — 백엔드 ATTENDANCE_WINDOW와 맞춤 */
export function isCommuteTimeWindow(date = new Date()) {
  const { hour } = getKstParts(date);
  return hour >= 7 && hour < 10;
}

/**
 * 등교 배너 노출 여부
 * - 가입 달 유예 유저도 동일 규칙(유예로 배너를 숨기지 않음)
 */
export function shouldShowCommuteBanner(date = new Date()) {
  if (!isCommuteTimeWindow(date)) return false;
  if (!isWeekdayKst(date)) return false;
  if (isSchoolVacationMonth(date)) return false;
  if (isPublicHoliday(date)) return false;
  return true;
}

export function roundCoord3(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Math.round(Number(value) * 1000) / 1000;
}

export function coordsMatchSchool(
  viewerLat,
  viewerLng,
  schoolLat,
  schoolLng,
) {
  const vLat = roundCoord3(viewerLat);
  const vLng = roundCoord3(viewerLng);
  const sLat = roundCoord3(schoolLat);
  const sLng = roundCoord3(schoolLng);
  if (vLat == null || vLng == null || sLat == null || sLng == null) {
    return false;
  }
  return vLat === sLat && vLng === sLng;
}

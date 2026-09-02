/** @returns {{ year: number, month: number, day: number, dayOfWeek: number }} KST, dayOfWeek: 0=일 … 6=토 */
function getKstParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(date);
  const pick = (type) =>
    Number(parts.find((p) => p.type === type)?.value || 0);
  const weekday = parts.find((p) => p.type === 'weekday')?.value || 'Sun';
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    dayOfWeek: dayMap[weekday] ?? 0,
  };
}

function addDaysYmd(year, month, day, delta) {
  const utc = Date.UTC(year, month - 1, day + delta);
  const d = new Date(utc);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function formatYmd({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** KST 기준 해당 주 월요일 YYYY-MM-DD — 주간 auto 갱신 1회 키 */
export function getKstWeekKey(date = new Date()) {
  const { year, month, day, dayOfWeek } = getKstParts(date);
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return formatYmd(addDaysYmd(year, month, day, diffToMonday));
}

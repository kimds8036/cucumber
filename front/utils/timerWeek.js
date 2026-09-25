const TIMER_TIMEZONE = 'Asia/Seoul';
const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatYmd(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function getKstDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMER_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type)?.value || '00';
  return {
    year: Number(part('year')),
    month: Number(part('month')),
    day: Number(part('day')),
    hour: Number(part('hour')),
  };
}

export function shiftYmd(ymd, deltaDays) {
  const [y, m, d] = String(ymd || '')
    .slice(0, 10)
    .split('-')
    .map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + Number(deltaDays || 0));
  return formatYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** 해당 날짜(YYYY-MM-DD)가 속한 KST 주 월요일 */
export function mondayOfYmd(ymd) {
  const key = String(ymd || '').slice(0, 10);
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  const utc = Date.UTC(y, m - 1, d);
  const dow = new Date(utc).getUTCDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  return shiftYmd(key, delta);
}

export function getKstMondayYmd(date = new Date()) {
  const { year, month, day } = getKstDateParts(date);
  return mondayOfYmd(formatYmd(year, month, day));
}

export function getKstMonthParts(date = new Date()) {
  const { year, month } = getKstDateParts(date);
  return { year, month };
}

export function shiftMonth(year, month, delta) {
  const dt = new Date(Date.UTC(Number(year), Number(month) - 1 + Number(delta || 0), 1));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1 };
}

export function monthRangeYmd(year, month) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: formatYmd(year, month, 1),
    end: formatYmd(year, month, last),
  };
}

export function weeklyRatePercent(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  if (list.length === 0) return 0;
  const done = list.filter((t) => t?.isDone === true || t?.is_done === true).length;
  return Math.round((done / list.length) * 100);
}

export { WEEKDAY_LABELS };

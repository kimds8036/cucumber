/**
 * 타이머 day_key 계산 기준
 * - 하루 경계: 오전 6시
 * - 포맷: YYYY-MM-DD
 */
const TIMER_TIMEZONE = 'Asia/Seoul';

function getKstDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMER_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type)?.value || '00';
  return {
    year: Number(part('year')),
    month: Number(part('month')),
    day: Number(part('day')),
    hour: Number(part('hour')),
    minute: Number(part('minute')),
    second: Number(part('second')),
  };
}

function formatUtcDateAsYmd(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTimerDayKey(date = new Date()) {
  const kst = getKstDateParts(date);
  const baseUtc = new Date(Date.UTC(kst.year, kst.month - 1, kst.day));
  if (kst.hour < 6) {
    baseUtc.setUTCDate(baseUtc.getUTCDate() - 1);
  }
  return formatUtcDateAsYmd(baseUtc);
}

export function getTimerSecondsFromDayStart(date = new Date()) {
  const kst = getKstDateParts(date);
  return (
    ((kst.hour * 3600 + kst.minute * 60 + kst.second) - 6 * 3600 + 24 * 3600) %
    (24 * 3600)
  );
}

/**
 * 타이머 day_key(YYYY-MM-DD)의 다음 캘린더 날.
 * 서버 세션 분할 시 익 타임머 일자 레코드를 넣기 위해 사용.
 */
export function getNextTimerDayKeyYmd(dayKeyStr) {
  const s =
    typeof dayKeyStr === 'string'
      ? String(dayKeyStr).trim().slice(0, 10)
      : '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const base = new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
  );
  base.setUTCDate(base.getUTCDate() + 1);
  return formatUtcDateAsYmd(base);
}

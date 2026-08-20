import { TIMETABLE_DAY_LABELS } from './constants.js';

/**
 * KST 기준 요일 라벨 (월~일).
 * @param {Date} [now]
 * @returns {'일'|'월'|'화'|'수'|'목'|'금'|'토'}
 */
export function getKstWeekdayLabel(now = new Date()) {
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(now);
  const map = {
    Sun: '일',
    Mon: '월',
    Tue: '화',
    Wed: '수',
    Thu: '목',
    Fri: '금',
    Sat: '토',
  };
  return map[short] || '월';
}

/**
 * flat map `{ "월-1": "수학", ... }` → `TimetableDayLite[]` (월~금 고정 5개).
 * @param {Record<string, string>|null|undefined} flat
 * @returns {{ dayLabel: string, periods: { period: number, subject: string }[] }[]}
 */
export function flatTimetableToWeek(flat) {
  const source =
    flat && typeof flat === 'object' && !Array.isArray(flat) ? flat : {};

  return TIMETABLE_DAY_LABELS.map((dayLabel) => {
    const byPeriod = new Map();
    for (const [key, value] of Object.entries(source)) {
      const subject = String(value || '').trim();
      if (!subject) continue;
      const match = String(key).match(/^([월화수목금])-(\d+)$/);
      if (!match || match[1] !== dayLabel) continue;
      const period = Number(match[2]);
      if (!Number.isFinite(period) || period < 1) continue;
      byPeriod.set(period, subject);
    }
    const periods = [...byPeriod.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([period, subject]) => ({ period, subject }));
    return { dayLabel, periods };
  });
}

/**
 * @param {Record<string, string>|null|undefined} flat
 * @param {{ generatedAt?: string, now?: Date }} [opts]
 */
export function buildTimetableWidgetPayload(flat, opts = {}) {
  const now = opts.now || new Date();
  const todayLabel = getKstWeekdayLabel(now);
  const todayDayLabel = TIMETABLE_DAY_LABELS.includes(todayLabel)
    ? todayLabel
    : null;
  const week = flatTimetableToWeek(flat);
  const hasAny = week.some((d) => d.periods.length > 0);

  return {
    generatedAt: opts.generatedAt || now.toISOString(),
    todayDayLabel,
    week,
    empty: !hasAny,
  };
}

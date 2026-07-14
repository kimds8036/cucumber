const HOLIDAY_PATTERN =
  /공휴|휴업|휴교|방학|재량|개교기념|선거|임시휴업|지진|재난|휴무|쉬는\s*날|신정|설날|구정|삼일절|어린이날|부처님오신날|석가탄신일|현충일|광복절|제헌절|개천절|한글날|성탄절|추석|한가위|대체공휴일|임시공휴일/i;

const EXAM_PATTERN =
  /시험|고사|중간|기말|수행평가|지필|모의고|학력평가|평가\s*일|진단평가|수능/i;

const EVENT_PATTERN =
  /방학식|종업식|입학식|졸업식|수련회|수학여행|체험학습|체육대회|학예회|축제|현장학습/i;

const KEY_PATTERN = /^([월화수목금])-(\d+)$/;

/**
 * @param {string} value
 * @returns {'holiday' | 'exam' | 'event' | null}
 */
export function classifyTimetableCellValue(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (EVENT_PATTERN.test(text)) return 'event';
  if (EXAM_PATTERN.test(text)) return 'exam';
  if (HOLIDAY_PATTERN.test(text)) return 'holiday';
  return null;
}

/**
 * @param {Record<string, string>} timetable
 * @returns {{
 *   hasHolidayOrExam: boolean,
 *   hasHoliday: boolean,
 *   hasExam: boolean,
 *   hasEvent: boolean,
 *   items: Array<{ key: string, day: string, period: number, value: string, type: 'holiday' | 'exam' | 'event' }>
 * }}
 */
export function detectTimetableAnomalies(timetable = {}) {
  const items = [];
  let hasHoliday = false;
  let hasExam = false;
  let hasEvent = false;

  if (!timetable || typeof timetable !== 'object' || Array.isArray(timetable)) {
    return {
      hasHolidayOrExam: false,
      hasHoliday: false,
      hasExam: false,
      hasEvent: false,
      items,
    };
  }

  Object.entries(timetable).forEach(([key, rawValue]) => {
    const value = String(rawValue || '').trim();
    if (!value) return;

    const type = classifyTimetableCellValue(value);
    if (!type) return;

    const match = key.match(KEY_PATTERN);
    items.push({
      key,
      day: match?.[1] || '',
      period: match ? Number(match[2]) : 0,
      value,
      type,
    });

    if (type === 'holiday') hasHoliday = true;
    if (type === 'exam') hasExam = true;
    if (type === 'event') hasEvent = true;
  });

  items.sort((a, b) => {
    const dayOrder = ['월', '화', '수', '목', '금'];
    const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.period - b.period;
  });

  return {
    hasHolidayOrExam: items.length > 0,
    hasHoliday,
    hasExam,
    hasEvent,
    items,
  };
}

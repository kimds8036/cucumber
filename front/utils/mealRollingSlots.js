import { getKstParts } from './commuteUtils.js';

const MEAL_ORDER = [
  { key: 'breakfast', label: '조식', untilHour: 10 },
  { key: 'lunch', label: '중식', untilHour: 14 },
  { key: 'dinner', label: '석식', untilHour: 20 },
];

const SKIP_REASONS = new Set(['WEEKEND', 'HOLIDAY', 'CLOSURE', 'NO_TERM']);
const VACATION_BANNER_TEXT = '당분간 급식 정보가 없어요';

export function getKstYmd(date = new Date()) {
  const { year, month, day } = getKstParts(date);
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}

export function addDaysToYmd(ymd, days) {
  const y = Number(String(ymd).slice(0, 4));
  const m = Number(String(ymd).slice(4, 6)) - 1;
  const d = Number(String(ymd).slice(6, 8));
  const utc = Date.UTC(y, m, d) + Number(days) * 86400000;
  const dt = new Date(utc);
  return `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, '0')}${String(dt.getUTCDate()).padStart(2, '0')}`;
}

function normalizeMenus(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((m) => String(m || '').trim()).filter(Boolean);
}

function dayHasAnyMeal(meals = {}) {
  return MEAL_ORDER.some(({ key }) => normalizeMenus(meals[key]).length > 0);
}

/** 달력 셀: 실제 메뉴가 있는 날만 true */
export function dateHasMealMenus(mealInfo) {
  return dayHasAnyMeal(mealInfo?.meals || {});
}

/** 해당 날짜·끼니가 마감됐는지 (KST). 과거 날짜는 전부 마감. */
export function isMealExpired(ymd, untilHour, date = new Date()) {
  const todayYmd = getKstYmd(date);
  if (ymd < todayYmd) return true;
  if (ymd > todayYmd) return false;
  const { hour } = getKstParts(date);
  return hour >= untilHour;
}

function getSchoolDayReason(day) {
  if (!day || typeof day !== 'object') return null;
  const reason = day.schoolDayReason;
  if (reason == null || reason === '') return null;
  return String(reason);
}

function makeMealSlot(ymd, label, key, menus) {
  return {
    type: 'meal',
    ymd,
    mealType: label,
    mealTypeKey: key,
    menus,
    isPlaceholder: false,
  };
}

function makePlaceholder(ymd) {
  return {
    type: 'placeholder',
    ymd,
    mealType: '정보 없음',
    mealTypeKey: null,
    menus: [],
    isPlaceholder: true,
  };
}

function makeVacationSlot() {
  return {
    type: 'vacation',
    ymd: '',
    mealType: '방학',
    mealTypeKey: null,
    menus: [],
    isPlaceholder: false,
  };
}

function padEmptySlots(slots, slotCount) {
  const next = [...slots];
  while (next.length < slotCount) {
    next.push(makePlaceholder(''));
  }
  return next.slice(0, slotCount);
}

function finishSlots(candidates, slotCount) {
  return {
    mode: 'slots',
    slots: padEmptySlots(candidates, slotCount),
    bannerText: null,
  };
}

function finishVacation(candidates, slotCount) {
  const actual = candidates.filter((s) => s.type === 'meal');
  if (actual.length === 0) {
    return {
      mode: 'banner',
      slots: [],
      bannerText: VACATION_BANNER_TEXT,
    };
  }
  const slots = [...actual];
  while (slots.length < slotCount) {
    slots.push(makeVacationSlot());
  }
  return {
    mode: 'slots',
    slots: slots.slice(0, slotCount),
    bannerText: null,
  };
}

/**
 * 롤링 급식 슬롯: 주말·휴업은 건너뛰고, 급식 없는 날도 건너뛴다. 방학이면 배너 또는 vacation 칸.
 * @param {Record<string, { meals?: Record<string, string[]>, schoolDayReason?: string|null }>} mealsByDate
 * @param {{ now?: Date, slotCount?: number, maxDays?: number }} [opts]
 * @returns {{ mode: 'slots'|'banner', slots: object[], bannerText: string|null }}
 */
export function buildRollingMealSlots(mealsByDate = {}, opts = {}) {
  const now = opts.now || new Date();
  const slotCount = opts.slotCount ?? 3;
  const maxDays = opts.maxDays ?? 21;
  const todayYmd = getKstYmd(now);
  const candidates = [];

  for (let d = 0; d < maxDays && candidates.length < slotCount; d += 1) {
    const ymd = addDaysToYmd(todayYmd, d);
    const day = mealsByDate?.[ymd];
    const reason = getSchoolDayReason(day);

    if (SKIP_REASONS.has(reason)) continue;
    if (reason === 'VACATION') {
      return finishVacation(candidates, slotCount);
    }

    const dayMeals = day?.meals || {};
    if (!dayHasAnyMeal(dayMeals)) {
      continue;
    }

    for (const { key, label, untilHour } of MEAL_ORDER) {
      const menus = normalizeMenus(dayMeals[key]);
      if (!menus.length) continue;
      if (isMealExpired(ymd, untilHour, now)) continue;
      candidates.push(makeMealSlot(ymd, label, key, menus));
      if (candidates.length >= slotCount) break;
    }
  }

  return finishSlots(candidates, slotCount);
}

/** 화면 슬롯 → 위젯 sync용 meals[0] 형태 */
export function slotToWidgetMealItem(slot) {
  if (!slot) {
    return { ymd: '', mealType: null, menus: [], isVacation: false };
  }
  if (
    slot.type === 'vacation' ||
    slot.type === 'vacation-banner' ||
    slot.isVacation
  ) {
    return {
      ymd: '',
      mealType: 'vacation',
      menus: [],
      isVacation: true,
      bannerText: slot.text || slot.bannerText || VACATION_BANNER_TEXT,
    };
  }
  if (slot.isPlaceholder || !slot.mealTypeKey) {
    return {
      ymd: slot.ymd || '',
      mealType: null,
      menus: [],
      isVacation: false,
    };
  }
  return {
    ymd: slot.ymd,
    mealType: slot.mealTypeKey,
    menus: slot.menus || [],
    isVacation: false,
  };
}

import { getKstParts } from './commuteUtils.js';

const MEAL_ORDER = [
  { key: 'breakfast', label: '조식', untilHour: 10 },
  { key: 'lunch', label: '중식', untilHour: 14 },
  { key: 'dinner', label: '석식', untilHour: 20 },
];

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

/** 해당 날짜·끼니가 마감됐는지 (KST). 과거 날짜는 전부 마감. */
export function isMealExpired(ymd, untilHour, date = new Date()) {
  const todayYmd = getKstYmd(date);
  if (ymd < todayYmd) return true;
  if (ymd > todayYmd) return false;
  const { hour } = getKstParts(date);
  return hour >= untilHour;
}

/**
 * 롤링 급식 슬롯: 마감 안 지난 끼니 + 빈 날짜 placeholder.
 * @param {Record<string, { meals?: Record<string, string[]> }>} mealsByDate
 * @param {{ now?: Date, slotCount?: number, maxDays?: number }} [opts]
 */
export function buildRollingMealSlots(mealsByDate = {}, opts = {}) {
  const now = opts.now || new Date();
  const slotCount = opts.slotCount ?? 3;
  const maxDays = opts.maxDays ?? 14;
  const todayYmd = getKstYmd(now);
  const candidates = [];

  for (let d = 0; d < maxDays && candidates.length < slotCount; d += 1) {
    const ymd = addDaysToYmd(todayYmd, d);
    const dayMeals = mealsByDate?.[ymd]?.meals || {};

    if (!dayHasAnyMeal(dayMeals)) {
      candidates.push({
        ymd,
        mealType: '정보 없음',
        mealTypeKey: null,
        menus: [],
        isPlaceholder: true,
      });
      continue;
    }

    for (const { key, label, untilHour } of MEAL_ORDER) {
      const menus = normalizeMenus(dayMeals[key]);
      if (!menus.length) continue;
      if (isMealExpired(ymd, untilHour, now)) continue;
      candidates.push({
        ymd,
        mealType: label,
        mealTypeKey: key,
        menus,
        isPlaceholder: false,
      });
      if (candidates.length >= slotCount) break;
    }
  }

  while (candidates.length < slotCount) {
    candidates.push({
      ymd: '',
      mealType: '정보 없음',
      mealTypeKey: null,
      menus: [],
      isPlaceholder: true,
    });
  }

  return candidates.slice(0, slotCount);
}

/** 화면 슬롯 → 위젯 sync용 meals[0] 형태 */
export function slotToWidgetMealItem(slot) {
  if (!slot || slot.isPlaceholder || !slot.mealTypeKey) {
    return {
      ymd: slot?.ymd || '',
      mealType: null,
      menus: [],
    };
  }
  return {
    ymd: slot.ymd,
    mealType: slot.mealTypeKey,
    menus: slot.menus || [],
  };
}

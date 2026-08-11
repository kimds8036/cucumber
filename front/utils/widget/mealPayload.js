/**
 * next?count=3 응답의 0번째만 MealWidgetPayload로 만든다.
 * 서버 끼니 경계를 재구현하지 않는다.
 *
 * @param {unknown[]} meals
 * @param {{ syncedAt?: string, generatedAt?: string }} [opts]
 */
export function buildMealWidgetPayload(meals, opts = {}) {
  const syncedAt = opts.syncedAt || opts.generatedAt || new Date().toISOString();
  const list = Array.isArray(meals) ? meals : [];
  const raw = list[0] ?? null;

  if (!raw || typeof raw !== 'object') {
    return { ymd: '', mealType: null, menus: [], syncedAt };
  }

  const ymd = String(raw.ymd || '');
  const menus = Array.isArray(raw.menus)
    ? raw.menus.map((m) => String(m || '').trim()).filter(Boolean)
    : [];
  const mealTypeRaw = raw.mealType == null ? null : String(raw.mealType).trim();

  // 서버 빈 슬롯 패딩(`급식`) → 통째로 빈 값
  if (
    mealTypeRaw == null ||
    mealTypeRaw === '' ||
    mealTypeRaw === '급식'
  ) {
    return { ymd, mealType: null, menus: [], syncedAt };
  }

  return {
    ymd,
    mealType: mealTypeRaw,
    menus,
    syncedAt,
  };
}

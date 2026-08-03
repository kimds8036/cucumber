/**
 * next?count=3 응답의 0번째만 MealWidgetPayload로 만든다.
 * 서버 끼니 경계를 재구현하지 않는다.
 *
 * @param {unknown[]} meals
 * @param {{ generatedAt?: string }} [opts]
 */
export function buildMealWidgetPayload(meals, opts = {}) {
  const list = Array.isArray(meals) ? meals : [];
  const raw = list[0] ?? null;
  let first = null;
  if (raw && typeof raw === 'object') {
    first = {
      ymd: String(raw.ymd || ''),
      mealCode: String(raw.mealCode || ''),
      mealType: raw.mealType ?? null,
      menus: Array.isArray(raw.menus)
        ? raw.menus.map((m) => String(m || '').trim()).filter(Boolean)
        : [],
      calories:
        raw.calories == null || raw.calories === ''
          ? null
          : String(raw.calories),
    };
    if (!first.ymd && !first.menus.length) first = null;
  }
  return {
    generatedAt: opts.generatedAt || new Date().toISOString(),
    first,
  };
}

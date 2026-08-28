/** MySQL prepared `LIMIT ?` → ER_WRONG_ARGUMENTS 회피용 정수 LIMIT */
export function clampSqlLimit(value, { def = 40, min = 1, max = 200 } = {}) {
  const n = Number(value);
  const base = Number.isFinite(n) ? n : def;
  return Math.min(Math.max(Math.trunc(base), min), max);
}

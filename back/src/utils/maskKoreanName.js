/**
 * 명예의 전당 등 표시용 이름 마스킹
 *
 * | 글자 수 | 예시 (원본 → 결과) |
 * |--------|---------------------|
 * | 1      | 길 → 길 |
 * | 2      | 김철 → 김* |
 * | 3      | 홍길동 → 홍*동 |
 * | 4      | 남궁민수 → 남**수 |
 * | 5      | 선우민지훈 → 선***훈 |
 * | 6+     | 앞글자 + 가운데 * + 끝글자 |
 *
 * 공백은 제거하고, 이미 * 가 들어 있으면 재마스킹하지 않습니다.
 *
 * @param {string} name
 * @returns {string}
 */
export function maskKoreanName(name) {
  const raw = String(name ?? '').trim().replace(/\s+/g, '');
  if (!raw) return '—';

  if (raw.includes('*')) {
    return raw.slice(0, 32);
  }

  const chars = [...raw];
  const n = chars.length;

  if (n === 1) {
    return chars[0];
  }

  if (n === 2) {
    return `${chars[0]}*`;
  }

  if (n === 3) {
    return `${chars[0]}*${chars[2]}`;
  }

  const middleMask = '*'.repeat(n - 2);
  return `${chars[0]}${middleMask}${chars[n - 1]}`;
}

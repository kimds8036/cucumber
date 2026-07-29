/**
 * 학교 가입자 수 표시용 버킷 포맷.
 * - 0~50: "50명 미만"
 * - 51~99: "50+"
 * - 100~199: "100+"
 * - 200~299: "200+" …
 * (호출부에서 추가로 "명"을 붙이지 마세요 — 저구간은 이미 "명" 포함)
 */
export function formatStudentCount(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 50) return '50명 미만';
  if (n < 100) return '50+';
  const bucket = Math.floor(n / 100) * 100;
  return `${bucket}+`;
}

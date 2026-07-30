/**
 * 학교 가입자 수 표시용 버킷 포맷.
 * - 0~50: "50명 미만"
 * - 51~99: "50명 이상"
 * - 100~199: "100명 이상"
 * - 200~299: "200명 이상" …
 */
export function formatStudentCount(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 50) return '50명 미만';
  if (n < 100) return '50명 이상';
  const bucket = Math.floor(n / 100) * 100;
  return `${bucket}명 이상`;
}

/**
 * 학교 가입자 수 표시용 버킷 포맷.
 * 0~100: 정확한 숫자, 101~200: "100+", 201~300: "200+" …
 */
export function formatStudentCount(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n <= 100) return String(Math.floor(n));
  const bucket = Math.floor((n - 1) / 100) * 100;
  return `${bucket}+`;
}

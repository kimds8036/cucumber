export function getNowForDB() {
  // 항상 UTC 기준으로 "YYYY-MM-DD HH:mm:ss" 형태의 문자열을 반환.
  // DB에는 UTC로 저장하고, 클라이언트(앱)에서는 로컬 타임존으로 변환해서 사용한다.
  const now = new Date();
  const iso = now.toISOString(); // 예: "2026-03-11T11:49:38.123Z"
  return iso.slice(0, 19).replace('T', ' '); // "YYYY-MM-DD HH:mm:ss" (UTC)
}

export function getNowForDB() {
  // 항상 UTC 기준으로 "YYYY-MM-DD HH:mm:ss" 형태의 문자열을 반환.
  // DB에는 UTC로 저장하고, 클라이언트(앱)에서는 로컬 타임존으로 변환해서 사용한다.
  const now = new Date();
  const iso = now.toISOString(); // 예: "2026-03-11T11:49:38.123Z"
  return iso.slice(0, 19).replace('T', ' '); // "YYYY-MM-DD HH:mm:ss" (UTC)
}

/** Asia/Seoul 캘린더 기준 YYYY-MM-DD에 일수를 더한 날짜(서울) */
function kstYmdAddDays(ymd, deltaDays) {
  const ref = new Date(`${ymd}T12:00:00+09:00`);
  ref.setTime(ref.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })
    .format(ref)
    .slice(0, 10);
}

function toSqlUtcFromKstDateTime(isoWithOffset) {
  const d = new Date(isoWithOffset);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * @returns {{ start: string, end: string }} MySQL DATETIME(UTC) 문자열
 * 어제 00:00:00 KST ~ 오늘 23:59:59 KST (포함) 구간. 좋아요/댓글/스크랩 시각이 이 안에 있으면 집계.
 */
export function getKstYesterday0000ThroughToday235959UtcForSql() {
  const kstYmd = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
  })
    .format(new Date())
    .slice(0, 10);
  const yestYmd = kstYmdAddDays(kstYmd, -1);
  const start = toSqlUtcFromKstDateTime(`${yestYmd}T00:00:00+09:00`);
  const end = toSqlUtcFromKstDateTime(`${kstYmd}T23:59:59+09:00`);
  return { start, end };
}

/**
 * @returns {{ start: string, end: string }} 오늘을 포함한 KST 3일(어제·그제·오늘) 00:00~오늘 23:59:59
 */
export function getKstThreeDaysThroughToday235959UtcForSql() {
  const kstYmd = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
  })
    .format(new Date())
    .slice(0, 10);
  const startYmd = kstYmdAddDays(kstYmd, -2);
  const start = toSqlUtcFromKstDateTime(`${startYmd}T00:00:00+09:00`);
  const end = toSqlUtcFromKstDateTime(`${kstYmd}T23:59:59+09:00`);
  return { start, end };
}

/**
 * @returns {{ start: string, end: string }} KST 당일 00:00:00 ~ 23:59:59의 UTC SQL 문자열
 */
export function getKstTodayRangeUtcForSql() {
  const kstYmd = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
  })
    .format(new Date())
    .slice(0, 10);
  const start = toSqlUtcFromKstDateTime(`${kstYmd}T00:00:00+09:00`);
  const end = toSqlUtcFromKstDateTime(`${kstYmd}T23:59:59+09:00`);
  return { start, end };
}

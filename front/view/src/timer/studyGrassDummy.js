/**
 * 공부 잔디 더미 데이터 — 백엔드 연결 전 임시.
 * 반환 형태는 DB 응답과 같게 { 'YYYY-MM-DD'(타이머 날짜): 공부한 초 }.
 * 백엔드 연결 시 이 파일의 fetchStudyGrassMonth만 API 호출로 바꾼다.
 */
import { getTimerDayKey } from '../../../utils/timerStorage';

/** 날짜 문자열로 항상 같은 0~1 값을 만든다 (새로고침해도 더미가 바뀌지 않게) */
function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

const pad2 = (n) => String(n).padStart(2, '0');

/**
 * @param {number} year
 * @param {number} month 0~11
 * @returns {Promise<Record<string, number>>}
 */
export async function fetchStudyGrassMonth(year, month) {
  const todayKey = getTimerDayKey(new Date());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const result = {};
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayKey = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    if (dayKey > todayKey) break;
    const r = seededRandom(dayKey);
    if (r < 0.3) continue;
    const hours = seededRandom(`${dayKey}-h`) * 14;
    result[dayKey] = Math.round(hours * 3600);
  }
  return result;
}

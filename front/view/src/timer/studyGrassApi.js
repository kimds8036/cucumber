/**
 * 공부 잔디 — study_days 집계.
 * 반환은 { 'YYYY-MM-DD': 공부한 초 }.
 */
import { api } from '../../../utils/api';
import { getTimerDayKey } from '../../../utils/timerStorage';

let memberSinceKey = null;

export function getStudyGrassMemberSince() {
  return memberSinceKey;
}

/**
 * @param {number} year
 * @param {number} month 0~11
 * @returns {Promise<Record<string, number>>}
 */
function monthDayKeys(year, month) {
  const today = getTimerDayKey(new Date());
  const count = new Date(year, month + 1, 0).getDate();
  const keys = [];
  for (let day = 1; day <= count; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (key <= today) keys.push(key);
  }
  return keys;
}

/** 월 집계 API가 아직 없을 때, 하루 조회를 모아 같은 모양으로 만든다. */
async function fetchMonthFromDayTotals(year, month) {
  const keys = monthDayKeys(year, month);
  const secondsByDay = {};
  const queue = [...keys];
  const pull = async () => {
    while (queue.length > 0) {
      const dayKey = queue.shift();
      try {
        const res = await api.get('/api/timer/day', { params: { dayKey } });
        const seconds = Math.floor(Number(res.data?.data?.totalElapsedMs) / 1000);
        if (seconds > 0) secondsByDay[dayKey] = seconds;
      } catch {
        // 하루 조회 실패는 그 칸만 비운다
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, () => pull()));
  return secondsByDay;
}

export async function fetchStudyGrassMonth(year, month) {
  try {
    const res = await api.get('/api/timer/study-grass', {
      params: { year, month: month + 1 },
    });
    const data = res.data?.data || {};
    const since = String(data.memberSince || '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(since)) memberSinceKey = since;
    const days = data.secondsByDay;
    return days && typeof days === 'object' ? days : {};
  } catch (error) {
    const status = error?.response?.status;
    if (status && status !== 404) throw error;
    return fetchMonthFromDayTotals(year, month);
  }
}

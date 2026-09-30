/**
 * 공부 잔디 — study_days 집계.
 * 반환은 { 'YYYY-MM-DD': 공부한 초 }.
 */
import { api } from '../../../utils/api';

let memberSinceKey = null;

export function getStudyGrassMemberSince() {
  return memberSinceKey;
}

/**
 * @param {number} year
 * @param {number} month 0~11
 * @returns {Promise<Record<string, number>>}
 */
export async function fetchStudyGrassMonth(year, month) {
  const res = await api.get('/api/timer/study-grass', {
    params: { year, month: month + 1 },
  });
  const data = res.data?.data || {};
  const since = String(data.memberSince || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(since)) memberSinceKey = since;
  const days = data.secondsByDay;
  return days && typeof days === 'object' ? days : {};
}

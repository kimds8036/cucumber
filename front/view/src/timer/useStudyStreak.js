/**
 * 시간 카드 「연속 공부」 — 공부 잔디 기록(1분 이상)이 끊기지 않고 이어진 일수
 * 오늘 기록이 아직 없으면 어제부터 센다 (하루가 끝나기 전에는 끊긴 것으로 보지 않음).
 * 백엔드 연결 전이라 fetchStudyGrassMonth(더미)를 쓴다.
 */
import { useEffect, useState } from 'react';
import { getTimerDayKey } from '../../../utils/timerStorage';
import { fetchStudyGrassMonth } from './studyGrassDummy';
import { hasGrassRecord, GRASS_FALLBACK_MIN_YEAR_MONTH } from './studyGrassHelpers';

const pad2 = (n) => String(n).padStart(2, '0');
const toDayKey = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

async function computeStudyStreak(todayKey) {
  const [y, m, d] = todayKey.split('-').map(Number);
  const minIndex =
    GRASS_FALLBACK_MIN_YEAR_MONTH.year * 12 + GRASS_FALLBACK_MIN_YEAR_MONTH.month;
  const monthCache = {};
  const getSeconds = async (date) => {
    const monthIndex = date.getFullYear() * 12 + date.getMonth();
    if (monthIndex < minIndex) return null;
    if (!monthCache[monthIndex]) {
      monthCache[monthIndex] = await fetchStudyGrassMonth(
        date.getFullYear(),
        date.getMonth(),
      );
    }
    return monthCache[monthIndex][toDayKey(date)];
  };

  const cursor = new Date(y, m - 1, d);
  if (!hasGrassRecord(await getSeconds(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (hasGrassRecord(await getSeconds(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function useStudyStreak() {
  const todayKey = getTimerDayKey(new Date());
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let mounted = true;
    computeStudyStreak(todayKey)
      .then((days) => {
        if (mounted) setStreak(days);
      })
      .catch(() => {
        if (mounted) setStreak(0);
      });
    return () => {
      mounted = false;
    };
  }, [todayKey]);

  return streak;
}

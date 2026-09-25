import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../../utils/api';
import {
  getKstMondayYmd,
  getKstMonthParts,
  weeklyRatePercent,
} from '../../../utils/timerWeek';

export function useTimerWeeklyAndGrass({ isFocused, isGuidePreview }) {
  const [streak, setStreak] = useState(0);
  const [grassDays, setGrassDays] = useState([]);
  const [grassMonth, setGrassMonth] = useState(() => getKstMonthParts());
  const [weekStart] = useState(() => getKstMondayYmd());
  const [weeklyTasks, setWeeklyTasks] = useState([]);

  const weeklyRate = useMemo(
    () => weeklyRatePercent(weeklyTasks),
    [weeklyTasks],
  );

  const loadStats = useCallback(async () => {
    if (isGuidePreview) {
      setStreak(0);
      setGrassDays([]);
      setWeeklyTasks([]);
      return;
    }
    try {
      const [streakRes, monthRes, weeklyRes] = await Promise.all([
        api.get('/api/timer/streak'),
        api.get('/api/timer/month', {
          params: { year: grassMonth.year, month: grassMonth.month },
        }),
        api.get('/api/timer/weekly', { params: { weekStart } }),
      ]);
      setStreak(Number(streakRes.data?.data?.streak || 0));
      setGrassDays(
        Array.isArray(monthRes.data?.data?.days) ? monthRes.data.data.days : [],
      );
      setWeeklyTasks(
        Array.isArray(weeklyRes.data?.data?.tasks)
          ? weeklyRes.data.data.tasks
          : [],
      );
    } catch (error) {
      console.warn('[Timer] 통계/위클리 조회 실패', error?.message || error);
    }
  }, [isGuidePreview, grassMonth.year, grassMonth.month, weekStart]);

  useEffect(() => {
    if (!isFocused) return undefined;
    loadStats();
    return undefined;
  }, [isFocused, loadStats]);

  const addWeeklyTask = useCallback(
    async (weekday, title) => {
      const trimmed = String(title || '').trim();
      if (!trimmed) return false;
      try {
        const res = await api.post('/api/timer/weekly', {
          weekStart,
          weekday,
          title: trimmed,
        });
        const created = res.data?.data;
        if (created?.id) {
          setWeeklyTasks((prev) => [...prev, created]);
        } else {
          await loadStats();
        }
        return true;
      } catch (error) {
        console.warn('[Timer] 위클리 추가 실패', error?.message || error);
        return false;
      }
    },
    [weekStart, loadStats],
  );

  const toggleWeeklyTask = useCallback(async (task) => {
    if (!task?.id) return;
    const nextDone = !task.isDone;
    setWeeklyTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, isDone: nextDone } : t)),
    );
    try {
      await api.patch(`/api/timer/weekly/${task.id}`, { isDone: nextDone });
    } catch (error) {
      console.warn('[Timer] 위클리 토글 실패', error?.message || error);
      setWeeklyTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, isDone: task.isDone } : t)),
      );
    }
  }, []);

  const deleteWeeklyTask = useCallback(async (task) => {
    if (!task?.id) return;
    const prev = weeklyTasks;
    setWeeklyTasks((list) => list.filter((t) => t.id !== task.id));
    try {
      await api.delete(`/api/timer/weekly/${task.id}`);
    } catch (error) {
      console.warn('[Timer] 위클리 삭제 실패', error?.message || error);
      setWeeklyTasks(prev);
    }
  }, [weeklyTasks]);

  return {
    streak,
    grassDays,
    grassMonth,
    setGrassMonth,
    weeklyTasks,
    weeklyRate,
    weekStart,
    addWeeklyTask,
    toggleWeeklyTask,
    deleteWeeklyTask,
    reloadStats: loadStats,
  };
}

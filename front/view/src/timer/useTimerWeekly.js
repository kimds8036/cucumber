/**
 * 타이머 위클리 — 주(일~토) 단위 요일별 체크리스트 + 이번 주 달성률
 * 체크 항목은 기기 캐시에 남긴다. 시간 카드의 달성률은 항상 이번 주 기준이다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTimerDayKey } from '../../../utils/timerStorage';
import { TIMER_WEEKLY_ITEM_MAX } from './timerHelpers';

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** 위클리는 2026년 7월부터. 그 달 1일이 속한 주(일요일)가 가장 이른 주다. */
export const WEEKLY_MIN_MONTH = { year: 2026, month: 6 };
export const WEEKLY_MIN_WEEK_KEY = '2026-06-28';

const STORAGE_PREFIX = 'timerWeekly:';

const pad2 = (n) => String(n).padStart(2, '0');

export const toDayKey = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

export const dateFromKey = (dayKey) => {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function getWeekStartKey(dayKey) {
  const date = dateFromKey(dayKey);
  return toDayKey(
    new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay()),
  );
}

function buildWeekDays(weekStartKey) {
  const start = dateFromKey(weekStartKey);
  return WEEKDAY_LABELS.map((label, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return {
      dayKey: toDayKey(date),
      label,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      date: date.getDate(),
    };
  });
}

function countWeek(itemsByDay) {
  let total = 0;
  let done = 0;
  Object.values(itemsByDay ?? {}).forEach((items) => {
    (items ?? []).forEach((item) => {
      total += 1;
      if (item.done) done += 1;
    });
  });
  return { total, done };
}

export function useTimerWeekly() {
  const todayKey = getTimerDayKey(new Date());
  const currentWeekKey = getWeekStartKey(todayKey);
  const [viewWeekKey, setViewWeekKey] = useState(currentWeekKey);
  const [store, setStore] = useState({});
  const storeRef = useRef({});

  useEffect(() => {
    setViewWeekKey(currentWeekKey);
  }, [currentWeekKey]);

  useEffect(() => {
    let mounted = true;
    [currentWeekKey, viewWeekKey].forEach((weekKey) => {
      if (storeRef.current[weekKey]) return;
      AsyncStorage.getItem(STORAGE_PREFIX + weekKey)
        .then((raw) => {
          try {
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' ? parsed : {};
          } catch {
            return {};
          }
        })
        .catch(() => ({}))
        .then((itemsByDay) => {
          if (!mounted || storeRef.current[weekKey]) return;
          storeRef.current = { ...storeRef.current, [weekKey]: itemsByDay };
          setStore(storeRef.current);
        });
    });
    return () => {
      mounted = false;
    };
  }, [currentWeekKey, viewWeekKey]);

  const updateDay = useCallback((dayKey, updater) => {
    const weekKey = getWeekStartKey(dayKey);
    const week = storeRef.current[weekKey];
    if (!week) return;
    const nextWeek = { ...week, [dayKey]: updater(week[dayKey] ?? []) };
    storeRef.current = { ...storeRef.current, [weekKey]: nextWeek };
    setStore(storeRef.current);
    AsyncStorage.setItem(STORAGE_PREFIX + weekKey, JSON.stringify(nextWeek)).catch(
      () => {},
    );
  }, []);

  const addItem = useCallback(
    (dayKey, content) => {
      const text = String(content || '').trim().slice(0, TIMER_WEEKLY_ITEM_MAX);
      if (!text) return;
      updateDay(dayKey, (items) => [
        ...items,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          content: text,
          done: false,
        },
      ]);
    },
    [updateDay],
  );

  const toggleItem = useCallback(
    (dayKey, itemId) => {
      updateDay(dayKey, (items) =>
        items.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)),
      );
    },
    [updateDay],
  );

  const removeItem = useCallback(
    (dayKey, itemId) => {
      updateDay(dayKey, (items) => items.filter((item) => item.id !== itemId));
    },
    [updateDay],
  );

  const shiftWeek = useCallback((delta) => {
    setViewWeekKey((prev) => {
      const start = dateFromKey(prev);
      const next = toDayKey(
        new Date(start.getFullYear(), start.getMonth(), start.getDate() + delta * 7),
      );
      if (next < WEEKLY_MIN_WEEK_KEY) return prev;
      return next;
    });
  }, []);

  const selectDate = useCallback((date) => {
    const key = getWeekStartKey(toDayKey(date));
    setViewWeekKey(key < WEEKLY_MIN_WEEK_KEY ? WEEKLY_MIN_WEEK_KEY : key);
  }, []);

  const days = useMemo(() => buildWeekDays(viewWeekKey), [viewWeekKey]);
  const { total, done } = useMemo(
    () => countWeek(store[currentWeekKey]),
    [store, currentWeekKey],
  );
  const rate = total > 0 ? Math.round((done / total) * 100) : 0;

  return {
    todayKey,
    days,
    itemsByDay: store[viewWeekKey] ?? {},
    loaded: store[viewWeekKey] != null,
    rate,
    addItem,
    toggleItem,
    removeItem,
    shiftWeek,
    selectDate,
  };
}

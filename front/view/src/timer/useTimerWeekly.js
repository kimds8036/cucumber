/**
 * 타이머 위클리 — 주(일~토) 단위 요일별 체크리스트 + 이번 주 달성률
 * 항목은 계정 DB에 남긴다. 시간 카드의 달성률은 항상 이번 주 기준이다.
 * 이전에 이 기기에만 있던 캐시는 해당 주가 서버에 없을 때 한 번 옮긴다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../../utils/api';
import { getTimerDayKey } from '../../../utils/timerStorage';
import { TIMER_WEEKLY_ITEM_MAX } from './timerHelpers';

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** 위클리는 2026년 7월부터. 그 달 1일이 속한 주(일요일)가 가장 이른 주다. */
export const WEEKLY_MIN_MONTH = { year: 2026, month: 6 };
export const WEEKLY_MIN_WEEK_KEY = '2026-06-28';

const STORAGE_PREFIX = 'timerWeekly:';

function groupWeeklyItems(items) {
  const itemsByDay = {};
  (items || []).forEach((item) => {
    const dayKey = item?.dayKey;
    if (!dayKey) return;
    if (!itemsByDay[dayKey]) itemsByDay[dayKey] = [];
    itemsByDay[dayKey].push({
      id: item.id,
      content: item.content,
      done: item.done === true,
    });
  });
  return itemsByDay;
}

async function readCachedWeek(weekKey) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PREFIX + weekKey);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function importCachedWeek(weekKey) {
  const cached = await readCachedWeek(weekKey);
  if (!cached) return null;
  const entries = Object.entries(cached).flatMap(([dayKey, items]) =>
    (Array.isArray(items) ? items : []).map((item) => ({ dayKey, item })),
  );
  if (entries.length === 0) {
    await AsyncStorage.removeItem(STORAGE_PREFIX + weekKey).catch(() => {});
    return {};
  }
  const itemsByDay = {};
  for (const { dayKey, item } of entries) {
    const content = String(item?.content || '').trim().slice(0, TIMER_WEEKLY_ITEM_MAX);
    if (!content) continue;
    const res = await api.post('/api/timer/weekly/items', {
      dayKey,
      content,
      done: item?.done === true,
    });
    const saved = res.data?.data;
    if (!saved) continue;
    if (!itemsByDay[saved.dayKey]) itemsByDay[saved.dayKey] = [];
    itemsByDay[saved.dayKey].push(saved);
  }
  await AsyncStorage.removeItem(STORAGE_PREFIX + weekKey).catch(() => {});
  return itemsByDay;
}

async function fetchWeek(weekKey) {
  const res = await api.get('/api/timer/weekly', { params: { weekStart: weekKey } });
  const items = res.data?.data?.items;
  const grouped = groupWeeklyItems(items);
  if (Object.keys(grouped).length > 0) {
    await AsyncStorage.removeItem(STORAGE_PREFIX + weekKey).catch(() => {});
    return grouped;
  }
  const imported = await importCachedWeek(weekKey);
  return imported || {};
}

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

  const loadingRef = useRef(new Set());

  const commitWeek = useCallback((weekKey, itemsByDay) => {
    storeRef.current = { ...storeRef.current, [weekKey]: itemsByDay };
    setStore(storeRef.current);
  }, []);

  useEffect(() => {
    let mounted = true;
    [currentWeekKey, viewWeekKey].forEach((weekKey) => {
      if (storeRef.current[weekKey] || loadingRef.current.has(weekKey)) return;
      loadingRef.current.add(weekKey);
      fetchWeek(weekKey)
        .then((itemsByDay) => {
          if (!mounted) return;
          commitWeek(weekKey, itemsByDay);
        })
        .catch(() => {
          if (!mounted) return;
          commitWeek(weekKey, {});
        })
        .finally(() => {
          loadingRef.current.delete(weekKey);
        });
    });
    return () => {
      mounted = false;
    };
  }, [currentWeekKey, viewWeekKey, commitWeek]);

  const updateDay = useCallback((dayKey, updater) => {
    const weekKey = getWeekStartKey(dayKey);
    const week = storeRef.current[weekKey];
    if (!week) return null;
    const nextItems = updater(week[dayKey] ?? []);
    const nextWeek = { ...week, [dayKey]: nextItems };
    storeRef.current = { ...storeRef.current, [weekKey]: nextWeek };
    setStore(storeRef.current);
    return nextItems;
  }, []);

  const addItem = useCallback(
    (dayKey, content) => {
      const text = String(content || '').trim().slice(0, TIMER_WEEKLY_ITEM_MAX);
      if (!text) return;
      const tempId = `tmp-${Date.now()}`;
      updateDay(dayKey, (items) => [
        ...items,
        { id: tempId, content: text, done: false },
      ]);
      api
        .post('/api/timer/weekly/items', { dayKey, content: text, done: false })
        .then((res) => {
          const saved = res.data?.data;
          if (!saved) return;
          updateDay(dayKey, (items) =>
            items.map((item) => (item.id === tempId ? saved : item)),
          );
        })
        .catch(() => {
          updateDay(dayKey, (items) => items.filter((item) => item.id !== tempId));
        });
    },
    [updateDay],
  );

  const toggleItem = useCallback(
    (dayKey, itemId) => {
      const nextItems = updateDay(dayKey, (items) =>
        items.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)),
      );
      const next = (nextItems || []).find((item) => item.id === itemId);
      if (!next || String(itemId).startsWith('tmp-')) return;
      api
        .patch(`/api/timer/weekly/items/${itemId}`, { done: next.done === true })
        .catch(() => {
          updateDay(dayKey, (items) =>
            items.map((item) =>
              item.id === itemId ? { ...item, done: !next.done } : item,
            ),
          );
        });
    },
    [updateDay],
  );

  const removeItem = useCallback(
    (dayKey, itemId) => {
      updateDay(dayKey, (items) => items.filter((item) => item.id !== itemId));
      if (String(itemId).startsWith('tmp-')) return;
      api.delete(`/api/timer/weekly/items/${itemId}`).catch(() => {
        fetchWeek(getWeekStartKey(dayKey))
          .then((itemsByDay) => commitWeek(getWeekStartKey(dayKey), itemsByDay))
          .catch(() => {});
      });
    },
    [updateDay, commitWeek],
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

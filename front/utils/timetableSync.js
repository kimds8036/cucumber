import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { syncTimetableWidgetFromFlat } from './widget';

/** @param {Record<string, string>} timetable */
export async function pushTimetableToServer(timetable) {
  await api.put('/api/timetable', { timetable });
}

export async function fetchSavedTimetableFromServer() {
  const res = await api.get('/api/timetable/me');
  const data = res.data?.data;
  if (!data?.timetable || typeof data.timetable !== 'object') return null;
  return {
    timetable: data.timetable,
    updatedAt: data.updatedAt || null,
  };
}

/**
 * 로컬 캐시 저장 + 위젯 반영 + 서버 PUT (실패 시 로컬만 유지)
 * @param {string} cacheKey
 * @param {Record<string, string>} timetable
 */
export async function saveTimetableLocalAndSync(cacheKey, timetable) {
  const ts = Date.now();
  await AsyncStorage.setItem(
    cacheKey,
    JSON.stringify({
      ts,
      timetable,
      clearedByUser: false,
    }),
  );
  syncTimetableWidgetFromFlat(timetable, {
    generatedAt: new Date(ts).toISOString(),
  }).catch(() => {});
  pushTimetableToServer(timetable).catch((e) => {
    console.warn('[timetableSync] 서버 저장 실패:', e?.message || e);
  });
  return ts;
}

/**
 * 서버 편집본이 더 최신이면 로컬·위젯 갱신. 로컬만 있으면 서버로 업로드.
 * @param {string} cacheKey
 * @returns {Promise<Record<string, string>|null>}
 */
export async function hydrateTimetableFromServer(cacheKey) {
  try {
    const server = await fetchSavedTimetableFromServer();
    let local = null;
    try {
      const raw = await AsyncStorage.getItem(cacheKey);
      if (raw) local = JSON.parse(raw);
    } catch {
      local = null;
    }

    const serverHasData =
      server?.timetable && Object.keys(server.timetable).length > 0;
    const localHasData =
      local?.timetable && Object.keys(local.timetable).length > 0;

    if (serverHasData) {
      const serverTs = server.updatedAt
        ? new Date(server.updatedAt).getTime()
        : 0;
      const localTs = Number(local?.ts || 0);
      if (!localHasData || serverTs >= localTs) {
        const ts = serverTs || Date.now();
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            ts,
            timetable: server.timetable,
            clearedByUser: false,
          }),
        );
        syncTimetableWidgetFromFlat(server.timetable, {
          generatedAt: server.updatedAt || new Date(ts).toISOString(),
        }).catch(() => {});
        return server.timetable;
      }
    }

    if (localHasData) {
      pushTimetableToServer(local.timetable).catch(() => {});
      return local.timetable;
    }

    return null;
  } catch (e) {
    console.warn('[timetableSync] 서버 동기화 실패:', e?.message || e);
    return null;
  }
}

/** @param {{ periodNumber: number, startTime: string, endTime: string }[]} periods */
export async function pushPeriodTimesToServer(periods) {
  await api.put('/api/timetable/period-times', { periods });
}

export async function fetchPeriodTimesFromServer() {
  const res = await api.get('/api/timetable/period-times');
  const data = res.data?.data;
  if (!data?.periods || !Array.isArray(data.periods)) return null;
  return {
    periods: data.periods,
    updatedAt: data.updatedAt || null,
  };
}

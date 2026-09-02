import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { fetchTimetableFromApi } from './timetableApi';
import { syncTimetableWidgetFromFlat } from './widget';
import { getKstWeekKey } from './timetableWeekKey';

export const TIMETABLE_CACHE_KEY = '@mypage_timetable_cache_v1';
export const TIMETABLE_CACHE_KEY_PREFIX = '@mypage_timetable_cache_v1:';

export const TIMETABLE_SOURCE_AUTO = 'auto';
export const TIMETABLE_SOURCE_MANUAL = 'manual';

function hasTimetableEntries(timetable) {
  const tt =
    timetable && typeof timetable === 'object' && !Array.isArray(timetable)
      ? timetable
      : {};
  return Object.values(tt).some((value) => String(value || '').trim());
}

/** @returns {Promise<string|null>} */
export async function resolveTimetableCacheKeyForCurrentUser() {
  try {
    const res = await api.get('/api/auth/me');
    const me = res.data?.data;
    const userScope =
      me?.id != null ? String(me.id) : me?.username || me?.email || null;
    if (!userScope) return TIMETABLE_CACHE_KEY;
    return `${TIMETABLE_CACHE_KEY_PREFIX}${userScope}`;
  } catch {
    return null;
  }
}

/** @returns {Promise<object|null>} */
export async function readTimetableCacheEntry(cacheKey) {
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

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
 * @param {{ source?: 'auto'|'manual', autoRefreshWeekKey?: string }} [opts]
 */
export async function saveTimetableLocalAndSync(cacheKey, timetable, opts = {}) {
  const ts = Date.now();
  const prev = await readTimetableCacheEntry(cacheKey);
  const source =
    opts.source === TIMETABLE_SOURCE_AUTO || opts.source === TIMETABLE_SOURCE_MANUAL
      ? opts.source
      : prev?.source;
  const autoRefreshWeekKey =
    opts.autoRefreshWeekKey ??
    (source === TIMETABLE_SOURCE_AUTO ? getKstWeekKey() : prev?.autoRefreshWeekKey);

  const payload = {
    ts,
    timetable,
    clearedByUser: false,
    ...(source ? { source } : {}),
    ...(autoRefreshWeekKey ? { autoRefreshWeekKey } : {}),
  };

  await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
  syncTimetableWidgetFromFlat(timetable, {
    generatedAt: new Date(ts).toISOString(),
  }).catch(() => {});
  pushTimetableToServer(timetable).catch((e) => {
    console.warn('[timetableSync] 서버 저장 실패:', e?.message || e);
  });
  return ts;
}

/**
 * 시간표 초기화 — 로컬·위젯·서버 override 모두 비움.
 * @param {string} cacheKey
 */
export async function clearTimetableLocalAndSync(cacheKey) {
  const ts = Date.now();
  await AsyncStorage.setItem(
    cacheKey,
    JSON.stringify({
      ts,
      timetable: null,
      clearedByUser: true,
    }),
  );
  await syncTimetableWidgetFromFlat(null).catch(() => {});
  await pushTimetableToServer({});
  return ts;
}

/**
 * auto 저장 사용자 — 새 주(월요일 기준 주) 첫 앱 실행 시 NEIS 재조회 → 캐시·위젯·서버 갱신
 * @param {string} cacheKey
 * @returns {Promise<Record<string, string>|null>}
 */
export async function maybeRefreshAutoTimetableOnAppOpen(cacheKey) {
  if (!cacheKey) return null;

  const entry = await readTimetableCacheEntry(cacheKey);
  if (!entry || entry.clearedByUser) return null;
  if (!hasTimetableEntries(entry.timetable)) return null;
  if (entry.source !== TIMETABLE_SOURCE_AUTO) return null;

  const weekKey = getKstWeekKey();
  if (entry.autoRefreshWeekKey === weekKey) return null;

  try {
    const { timetable } = await fetchTimetableFromApi({ neisOnly: true });
    if (!hasTimetableEntries(timetable)) return null;

    await saveTimetableLocalAndSync(cacheKey, timetable, {
      source: TIMETABLE_SOURCE_AUTO,
      autoRefreshWeekKey: weekKey,
    });
    return timetable;
  } catch (e) {
    console.warn('[timetableSync] auto 주간 갱신 실패:', e?.message || e);
    return null;
  }
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
      local = await readTimetableCacheEntry(cacheKey);
    } catch {
      local = null;
    }

    const serverHasData =
      server?.timetable && Object.keys(server.timetable).length > 0;
    const localHasData =
      local?.timetable && Object.keys(local.timetable).length > 0;
    const serverTs = server?.updatedAt
      ? new Date(server.updatedAt).getTime()
      : 0;
    const localTs = Number(local?.ts || 0);

    if (local?.clearedByUser && localTs > 0 && localTs >= serverTs) {
      if (serverHasData) {
        pushTimetableToServer({}).catch(() => {});
      }
      return null;
    }

    if (serverHasData) {
      if (!localHasData || serverTs >= localTs) {
        const ts = Date.now();
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            ts,
            serverUpdatedAt: server.updatedAt || null,
            timetable: server.timetable,
            clearedByUser: false,
            ...(local?.source ? { source: local.source } : {}),
            ...(local?.autoRefreshWeekKey
              ? { autoRefreshWeekKey: local.autoRefreshWeekKey }
              : {}),
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

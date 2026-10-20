import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { fetchTimetableFromApi } from './timetableApi';
import { syncTimetableWidgetFromFlat } from './widget/widgetBridge.js';
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

function isSameTerm(entry, term) {
  if (!entry || term?.academicYear == null || term?.semester == null) return false;
  if (entry.academicYear == null || entry.semester == null) return false;
  return (
    Number(entry.academicYear) === Number(term.academicYear) &&
    Number(entry.semester) === Number(term.semester)
  );
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
  const res = await api.put('/api/timetable', { timetable });
  return res.data?.data || null;
}

export async function fetchSavedTimetableFromServer() {
  const res = await api.get('/api/timetable/me');
  const data = res.data?.data;
  if (!data || typeof data !== 'object') return null;
  const timetable =
    data.timetable && typeof data.timetable === 'object' && !Array.isArray(data.timetable)
      ? data.timetable
      : {};
  const hasSavedRow =
    typeof data.hasSavedRow === 'boolean'
      ? data.hasSavedRow
      : hasTimetableEntries(timetable);
  const cleared =
    typeof data.cleared === 'boolean'
      ? data.cleared
      : hasSavedRow && !hasTimetableEntries(timetable);
  return {
    timetable,
    updatedAt: data.updatedAt || null,
    academicYear: data.academicYear ?? null,
    semester: data.semester ?? null,
    hasSavedRow,
    cleared,
  };
}

async function writeSavedCache(cacheKey, server, prev) {
  const ts = Date.now();
  const same = isSameTerm(prev, server);
  const payload = {
    ts,
    serverUpdatedAt: server.updatedAt || null,
    academicYear: server.academicYear ?? null,
    semester: server.semester ?? null,
    timetable: server.cleared ? null : server.timetable,
    clearedByUser: Boolean(server.cleared),
    pendingSync: false,
    ...(same && prev?.source ? { source: prev.source } : {}),
    ...(same && prev?.autoRefreshWeekKey
      ? { autoRefreshWeekKey: prev.autoRefreshWeekKey }
      : {}),
  };
  await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
  syncTimetableWidgetFromFlat(server.cleared ? null : server.timetable, {
    generatedAt: server.updatedAt || new Date(ts).toISOString(),
  }).catch(() => {});
}

async function writePendingCache(cacheKey, timetable, opts) {
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
    timetable: opts.clearedByUser ? null : timetable,
    clearedByUser: Boolean(opts.clearedByUser),
    pendingSync: true,
    academicYear: opts.academicYear ?? prev?.academicYear ?? null,
    semester: opts.semester ?? prev?.semester ?? null,
    ...(source ? { source } : {}),
    ...(autoRefreshWeekKey ? { autoRefreshWeekKey } : {}),
  };
  await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
  syncTimetableWidgetFromFlat(opts.clearedByUser ? null : timetable, {
    generatedAt: new Date(ts).toISOString(),
  }).catch(() => {});
  return { prev, source, autoRefreshWeekKey, ts };
}

async function markCacheSynced(cacheKey, timetable, meta, draft) {
  const savedTimetable =
    meta?.timetable && typeof meta.timetable === 'object' && !Array.isArray(meta.timetable)
      ? meta.timetable
      : timetable;
  const ts = Date.now();
  const payload = {
    ts,
    serverUpdatedAt: meta?.updatedAt || null,
    academicYear: meta?.academicYear ?? draft.academicYear ?? null,
    semester: meta?.semester ?? draft.semester ?? null,
    timetable: draft.clearedByUser ? null : savedTimetable,
    clearedByUser: Boolean(draft.clearedByUser),
    pendingSync: false,
    ...(draft.source ? { source: draft.source } : {}),
    ...(draft.autoRefreshWeekKey ? { autoRefreshWeekKey: draft.autoRefreshWeekKey } : {}),
  };
  await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
  return ts;
}

/**
 * 사용자가 자동 선택·직접 저장을 눌렀을 때만 서버에 반영한다.
 * @param {string} cacheKey
 * @param {Record<string, string>} timetable
 * @param {{ source?: 'auto'|'manual', autoRefreshWeekKey?: string }} [opts]
 */
export async function saveTimetableLocalAndSync(cacheKey, timetable, opts = {}) {
  const draft = await writePendingCache(cacheKey, timetable, {
    ...opts,
    clearedByUser: false,
  });
  try {
    const saved = await pushTimetableToServer(timetable);
    return markCacheSynced(cacheKey, timetable, saved, {
      ...draft,
      clearedByUser: false,
      academicYear: saved?.academicYear ?? draft.prev?.academicYear ?? null,
      semester: saved?.semester ?? draft.prev?.semester ?? null,
    });
  } catch (e) {
    console.warn('[timetableSync] 서버 저장 실패:', e?.message || e);
    return draft.ts;
  }
}

/**
 * 이번 학기 행을 빈 시간표로 저장한다. 지난 학기 행은 건드리지 않는다.
 * @param {string} cacheKey
 */
export async function clearTimetableLocalAndSync(cacheKey) {
  const draft = await writePendingCache(cacheKey, {}, {
    clearedByUser: true,
  });
  try {
    const saved = await pushTimetableToServer({});
    return markCacheSynced(cacheKey, {}, saved, {
      ...draft,
      clearedByUser: true,
      academicYear: saved?.academicYear ?? null,
      semester: saved?.semester ?? null,
    });
  } catch (e) {
    console.warn('[timetableSync] 시간표 비우기 저장 실패:', e?.message || e);
    return draft.ts;
  }
}

/**
 * 주간 NEIS 자동 덮어쓰기는 하지 않는다.
 * 이번 학기 행은 사용자가 다시 저장할 때만 바뀐다.
 * @returns {Promise<null>}
 */
export async function maybeRefreshAutoTimetableOnAppOpen() {
  return null;
}

async function previewNeisTimetable() {
  try {
    const { timetable } = await fetchTimetableFromApi({ neisOnly: true });
    if (!hasTimetableEntries(timetable)) return null;
    syncTimetableWidgetFromFlat(timetable, {
      generatedAt: new Date().toISOString(),
    }).catch(() => {});
    return timetable;
  } catch (e) {
    console.warn('[timetableSync] NEIS 미리보기 실패:', e?.message || e);
    return null;
  }
}

/**
 * 이번 학기 DB 행이 있으면 그 JSON을 캐시에 넣는다.
 * 행이 없으면 NEIS를 보여 주기만 하고 저장하지 않는다.
 * @param {string} cacheKey
 * @returns {Promise<Record<string, string>|null>}
 */
export async function hydrateTimetableFromServer(cacheKey) {
  if (!cacheKey) return null;

  let local = null;
  try {
    local = await readTimetableCacheEntry(cacheKey);
  } catch {
    local = null;
  }

  let server;
  try {
    server = await fetchSavedTimetableFromServer();
  } catch (e) {
    console.warn('[timetableSync] 서버 동기화 실패:', e?.message || e);
    if (local?.clearedByUser && local.academicYear != null) return null;
    if (hasTimetableEntries(local?.timetable)) return local.timetable;
    return null;
  }
  if (!server) return null;

  const pendingSameTerm =
    Boolean(local?.pendingSync) &&
    (isSameTerm(local, server) || local?.academicYear == null || local?.semester == null);

  if (pendingSameTerm) {
    try {
      await pushTimetableToServer(local.clearedByUser ? {} : local.timetable || {});
      server = (await fetchSavedTimetableFromServer()) || server;
    } catch (e) {
      console.warn('[timetableSync] 미전송 시간표 재전송 실패:', e?.message || e);
      if (local.clearedByUser) return null;
      if (hasTimetableEntries(local.timetable)) return local.timetable;
    }
  }

  if (server.hasSavedRow) {
    await writeSavedCache(cacheKey, server, local);
    if (server.cleared || !hasTimetableEntries(server.timetable)) return null;
    return server.timetable;
  }

  return previewNeisTimetable();
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

/**
 * 타이머 로컬 저장 + 하루(6시~익일 5시59분) 종료 시 DB 저장
 * - 로컬: AsyncStorage에 당일(6~6 기준) 데이터 저장
 * - DB: 하루가 끝나면(새로운 6시 도래 시) 전날 데이터를 API로 전송
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TIMER_DAY_PREFIX = '@timer_day_';
const LAST_SYNCED_DAY_KEY = '@timer_last_synced_day';

/** 6시~익일 5시59분 기준 "오늘" 날짜 키 (YYYY-MM-DD) */
export function getTimerDayKey(date = new Date()) {
  const d = new Date(date);
  if (d.getHours() < 6) {
    d.setDate(d.getDate() - 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 전날 날짜 키 (6~6 기준 하루 전) */
export function getPreviousDayKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(d.getHours() - 24);
  return getTimerDayKey(d);
}

export async function loadDayFromStorage(dayKey) {
  try {
    const raw = await AsyncStorage.getItem(TIMER_DAY_PREFIX + dayKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return normalizeLoadedPayload(data);
  } catch (e) {
    return null;
  }
}

/** 로컬에서 읽은 payload 정규화 (subjectId 등 숫자 보장, 미종료 세션은 로드 시 0분으로 종료) */
function normalizeLoadedPayload(data) {
  if (!data || typeof data !== 'object') return null;
  const sessions = Array.isArray(data.sessions)
    ? data.sessions.map((s) => {
        const start = Number(s.startMinutes) || 0;
        const end = s.endMinutes != null ? Number(s.endMinutes) : start;
        return {
          subjectId: s.subjectId != null ? Number(s.subjectId) : null,
          startMinutes: start,
          endMinutes: end,
        };
      })
    : [];
  return {
    sessions,
    totalElapsedMs: typeof data.totalElapsedMs === 'number' ? data.totalElapsedMs : 0,
    subjects: Array.isArray(data.subjects) ? data.subjects : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
  };
}

/** 당일 데이터를 로컬에 저장 (세션/누적시간/과목/할일) */
export async function saveDayToStorage(dayKey, payload) {
  try {
    await AsyncStorage.setItem(TIMER_DAY_PREFIX + dayKey, JSON.stringify(payload));
  } catch (e) {
    // ignore
  }
}

export async function getLastSyncedDayKey() {
  try {
    return await AsyncStorage.getItem(LAST_SYNCED_DAY_KEY);
  } catch (e) {
    return null;
  }
}

export async function setLastSyncedDayKey(dayKey) {
  try {
    await AsyncStorage.setItem(LAST_SYNCED_DAY_KEY, dayKey);
  } catch (e) {
    // ignore
  }
}

/**
 * 하루가 끝났을 때 DB에 저장 (6~6 기준 전날 데이터 전송)
 * 실제 API 연동 시 이 함수 내부만 수정하면 됨.
 */
export async function saveDayToDb(dayKey, payload) {
  // TODO: 실제 백엔드 연동 시 예: POST /api/timer/day { dayKey, ...payload }
  // const response = await fetch(API_BASE + '/api/timer/day', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ dayKey, ...payload }),
  // });
  if (__DEV__) {
    console.log('[Timer] saveDayToDb', dayKey, payload);
  }
  await setLastSyncedDayKey(dayKey);
}

/**
 * 앱 진입/날짜 변경 시: 아직 동기화 안 한 전날이 있으면 로컬에서 읽어 DB 저장 후, 당일 데이터 로드
 */
export async function flushPreviousDayAndLoadCurrent(currentDayKey) {
  const lastSynced = await getLastSyncedDayKey();
  const prevDayKey = getPreviousDayKey(new Date());

  if (lastSynced !== prevDayKey) {
    const prevData = await loadDayFromStorage(prevDayKey);
    if (prevData && (prevData.sessions?.length > 0 || prevData.totalElapsedMs > 0)) {
      await saveDayToDb(prevDayKey, prevData);
    } else {
      await setLastSyncedDayKey(prevDayKey);
    }
  }

  return loadDayFromStorage(currentDayKey);
}

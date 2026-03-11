/**
 * 타이머 로컬 저장 + 하루(6시~익일 5시59분) 종료 시 DB 저장
 * - 로컬: AsyncStorage에 당일(6~6 기준) 데이터 저장
 * - DB: 하루가 끝나면(새로운 6시 도래 시) 전날 데이터를 API로 전송
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

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

/** 다음날 날짜 키 (6~6 기준 하루 후) */
export function getNextDayKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(d.getHours() + 24);
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

/** 로컬에서 읽은 payload 정규화. startSeconds/endSeconds 사용, 없으면 startMinutes/endMinutes에서 변환 */
function normalizeLoadedPayload(data) {
  if (!data || typeof data !== 'object') return null;
  const sessions = Array.isArray(data.sessions)
    ? data.sessions.map((s) => {
        let startSec = s.startSeconds != null ? Number(s.startSeconds) : null;
        let endSec = s.endSeconds != null ? Number(s.endSeconds) : (s.endMinutes != null ? null : null);
        if (startSec == null && s.startMinutes != null) {
          startSec = Math.floor(Number(s.startMinutes) * 60);
          if (s.endMinutes != null) endSec = Math.floor(Number(s.endMinutes) * 60);
          else endSec = startSec;
        }
        if (startSec == null) startSec = 0;
        if (endSec == null) endSec = startSec;
        return {
          subjectId: s.subjectId != null ? Number(s.subjectId) : null,
          startSeconds: startSec,
          endSeconds: endSec,
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
  try {
    await api.post('/api/timer/day', {
      dayKey,
      sessions: payload.sessions ?? [],
      totalElapsedMs: payload.totalElapsedMs ?? 0,
      subjects: payload.subjects ?? [],
      tasks: payload.tasks ?? [],
    });
    if (__DEV__) {
      console.log('[Timer] saveDayToDb 성공', dayKey);
    }
    await setLastSyncedDayKey(dayKey);
  } catch (e) {
    console.error('[Timer] saveDayToDb 실패', e?.response?.data || e.message);
  }
}

/**
 * 전날 및 그 이전 날짜 데이터는 DB에서 조회. 오늘은 로컬만 사용.
 * dayKey가 오늘보다 이전이면 DB, 오늘이면 null(로컬에서 로드), 미래면 로컬 시도.
 */
export async function loadDayFromDb(dayKey) {
  try {
    // 토큰이 아예 없는 경우에는 서버 호출 자체를 하지 않는다.
    const token = await AsyncStorage.getItem('@auth_token');
    if (!token) {
      if (__DEV__) {
        console.log(
          '[Timer] loadDayFromDb: 토큰이 없어 서버 조회를 건너뜁니다.',
        );
      }
      return null;
    }

    const res = await api.get('/api/timer/day', { params: { dayKey } });
    const data = res.data?.data;
    if (!data) return null;
    return normalizeLoadedPayload(data);
  } catch (e) {
    // 로그인되지 않은 상태(토큰 없음)에서 타이머 화면을 볼 때는
    // 인증 오류(401)는 자연스러운 상황이므로 조용히 무시한다.
    const status = e?.response?.status;
    if (status === 401) {
      if (__DEV__) {
        console.log(
          '[Timer] loadDayFromDb: 인증 토큰 없음으로 인해 서버 기록을 불러오지 않습니다.',
        );
      }
      return null;
    }
    console.error('[Timer] loadDayFromDb 실패', e?.response?.data || e.message);
    return null;
  }
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

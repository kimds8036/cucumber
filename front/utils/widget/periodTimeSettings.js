import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadWidgets, writePeriodTimeSettings } from './widgetBridge.js';
import {
  fetchPeriodTimesFromServer,
  pushPeriodTimesToServer,
} from '../timetableSync.js';

export const PERIOD_TIME_SETTINGS_KEY_PREFIX = '@period_time_settings:';
export const PERIOD_TIME_SETTINGS_KEY = '@period_time_settings';

/**
 * @typedef {{ periodNumber: number, startTime: string, endTime: string }} PeriodTimeConfig
 * @typedef {{ periods: PeriodTimeConfig[], updatedAt: string }} UserPeriodSettings
 */

/** @param {string|number|null|undefined} userScope */
export function periodTimeSettingsStorageKey(userScope) {
  if (userScope == null || userScope === '') return PERIOD_TIME_SETTINGS_KEY;
  return `${PERIOD_TIME_SETTINGS_KEY_PREFIX}${userScope}`;
}

/** "HH:mm" → minutes from midnight */
export function hhmmToMinutes(hhmm) {
  if (typeof hhmm !== 'string' || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map((n) => Number(n));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function minutesToHhmm(total) {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * @param {PeriodTimeConfig[]} periods
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validatePeriodTimeSettings(periods) {
  if (!Array.isArray(periods) || periods.length === 0) {
    return { ok: false, message: '교시를 하나 이상 추가해 주세요.' };
  }
  const sorted = [...periods].sort((a, b) => a.periodNumber - b.periodNumber);
  for (let i = 0; i < sorted.length; i += 1) {
    const p = sorted[i];
    const start = hhmmToMinutes(p.startTime);
    const end = hhmmToMinutes(p.endTime);
    if (start == null || end == null) {
      return { ok: false, message: `${p.periodNumber}교시 시각 형식이 올바르지 않아요.` };
    }
    if (end <= start) {
      return {
        ok: false,
        message: `${p.periodNumber}교시 종료는 시작(${p.startTime})보다 늦어야 해요.`,
      };
    }
    if (i > 0) {
      const prev = sorted[i - 1];
      const prevStart = hhmmToMinutes(prev.startTime);
      const prevEnd = hhmmToMinutes(prev.endTime);
      if (prevEnd != null && start < prevEnd) {
        return {
          ok: false,
          message: `${p.periodNumber}교시는 ${prev.periodNumber}교시가 끝난 뒤(${prev.endTime})부터 시작할 수 있어요.`,
        };
      }
      if (prevStart != null && start < prevStart) {
        return {
          ok: false,
          message: `${p.periodNumber}교시 시작은 ${prev.periodNumber}교시 시작(${prev.startTime})보다 빠를 수 없어요.`,
        };
      }
    }
  }
  return { ok: true };
}

/**
 * 한 교시의 시작/종료만 바꾼 뒤 전체 순서가 맞는지 검사한다.
 * @returns {{ ok: true, periods: PeriodTimeConfig[] } | { ok: false, message: string }}
 */
export function tryUpdatePeriodTime(periods, index, field, hhmm) {
  if (!Array.isArray(periods) || index < 0 || index >= periods.length) {
    return { ok: false, message: '교시 정보를 확인할 수 없어요.' };
  }
  if (field !== 'start' && field !== 'end') {
    return { ok: false, message: '시각을 확인할 수 없어요.' };
  }
  const next = periods.map((p, i) =>
    i === index
      ? {
          ...p,
          [field === 'start' ? 'startTime' : 'endTime']: hhmm,
        }
      : p,
  );
  const validation = validatePeriodTimeSettings(next);
  if (!validation.ok) return validation;
  return { ok: true, periods: next };
}

/** @returns {PeriodTimeConfig[]} */
export function defaultPeriodTimes(count = 7) {
  const out = [];
  let cursor = 9 * 60; // 09:00
  const lesson = 50;
  const gap = 10;
  for (let i = 1; i <= count; i += 1) {
    const start = cursor;
    const end = start + lesson;
    out.push({
      periodNumber: i,
      startTime: minutesToHhmm(start),
      endTime: minutesToHhmm(end),
    });
    cursor = end + gap;
  }
  return out;
}

/**
 * @param {string|number|null|undefined} userScope
 * @returns {Promise<UserPeriodSettings|null>}
 */
export async function loadPeriodTimeSettings(userScope) {
  const key = periodTimeSettingsStorageKey(userScope);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      if (key !== PERIOD_TIME_SETTINGS_KEY) {
        const legacy = await AsyncStorage.getItem(PERIOD_TIME_SETTINGS_KEY);
        if (legacy) return JSON.parse(legacy);
      }
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * AsyncStorage + App Group 저장 후 위젯 리로드
 * @param {PeriodTimeConfig[]} periods
 * @param {string|number|null|undefined} userScope
 */
export async function savePeriodTimeSettings(periods, userScope) {
  const validation = validatePeriodTimeSettings(periods);
  if (!validation.ok) return validation;

  /** @type {UserPeriodSettings} */
  const payload = {
    periods: periods
      .map((p) => ({
        periodNumber: Number(p.periodNumber),
        startTime: p.startTime,
        endTime: p.endTime,
      }))
      .sort((a, b) => a.periodNumber - b.periodNumber),
    updatedAt: new Date().toISOString(),
  };

  const key = periodTimeSettingsStorageKey(userScope);
  await AsyncStorage.setItem(key, JSON.stringify(payload));
  await writePeriodTimeSettings(payload);
  await reloadWidgets();
  pushPeriodTimesToServer(payload.periods).catch((e) => {
    console.warn('[periodTimeSettings] 서버 저장 실패:', e?.message || e);
  });
  return { ok: true, payload };
}

/**
 * 서버 교시 시간이 더 최신이면 로컬·위젯 갱신. 로컬만 있으면 서버 업로드.
 * @param {string|number|null|undefined} userScope
 * @returns {Promise<UserPeriodSettings|null>}
 */
export async function hydratePeriodTimesFromServer(userScope) {
  const key = periodTimeSettingsStorageKey(userScope);
  try {
    const server = await fetchPeriodTimesFromServer();
    let local = null;
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) local = JSON.parse(raw);
    } catch {
      local = null;
    }

    const serverHasData =
      Array.isArray(server?.periods) && server.periods.length > 0;
    const localHasData =
      Array.isArray(local?.periods) && local.periods.length > 0;

    if (serverHasData) {
      const serverTs = server.updatedAt
        ? new Date(server.updatedAt).getTime()
        : 0;
      const localTs = local?.updatedAt
        ? new Date(local.updatedAt).getTime()
        : 0;
      if (!localHasData || serverTs >= localTs) {
        /** @type {UserPeriodSettings} */
        const payload = {
          periods: server.periods,
          updatedAt: server.updatedAt || new Date().toISOString(),
        };
        await AsyncStorage.setItem(key, JSON.stringify(payload));
        await writePeriodTimeSettings(payload);
        await reloadWidgets();
        return payload;
      }
    }

    if (localHasData) {
      pushPeriodTimesToServer(local.periods).catch(() => {});
      return local;
    }

    return null;
  } catch (e) {
    console.warn('[periodTimeSettings] 서버 동기화 실패:', e?.message || e);
    return null;
  }
}

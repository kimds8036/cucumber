/**
 * 타이머 설정 — 기기 캐시. 서버에 두지 않고 앱을 다시 열어도 남긴다.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'timerSettings:v1';

export const PHASE_END_CUES = ['sound', 'vibrate', 'popup', 'none'];

export const DEFAULT_TIMER_SETTINGS = {
  pomodoroOn: false,
  autoStart: false,
  phaseEndCue: 'popup',
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
  gender: 'random',
};

const LIMITS = {
  focusMin: { min: 5, max: 180, step: 5 },
  shortBreakMin: { min: 1, max: 30, step: 1 },
  longBreakMin: { min: 5, max: 60, step: 5 },
  longBreakEvery: { min: 2, max: 8, step: 1 },
};

let current = { ...DEFAULT_TIMER_SETTINGS };
let loaded = false;
const listeners = new Set();

function clampSetting(key, value) {
  const limit = LIMITS[key];
  const n = Math.round(Number(value));
  if (!limit || !Number.isFinite(n)) return DEFAULT_TIMER_SETTINGS[key];
  const stepped = Math.round(n / limit.step) * limit.step;
  return Math.min(limit.max, Math.max(limit.min, stepped));
}

function normalizePhaseEndCue(src) {
  if (PHASE_END_CUES.includes(src.phaseEndCue)) return src.phaseEndCue;
  if (src.phaseEndAlert === false) return 'none';
  return 'popup';
}

export function normalizeTimerSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const gender = src.gender === 'girl' || src.gender === 'boy' ? src.gender : 'random';
  return {
    pomodoroOn: src.pomodoroOn === true,
    autoStart: src.autoStart === true,
    phaseEndCue: normalizePhaseEndCue(src),
    focusMin: clampSetting('focusMin', src.focusMin),
    shortBreakMin: clampSetting('shortBreakMin', src.shortBreakMin),
    longBreakMin: clampSetting('longBreakMin', src.longBreakMin),
    longBreakEvery: clampSetting('longBreakEvery', src.longBreakEvery),
    gender,
  };
}

export function getTimerSettings() {
  return current;
}

export function timerSettingsToPomodoroConfig(settings = current) {
  return {
    focusSec: settings.focusMin * 60,
    shortBreakSec: settings.shortBreakMin * 60,
    longBreakSec: settings.longBreakMin * 60,
    longBreakEvery: settings.longBreakEvery,
    autoStartNext: settings.autoStart === true,
  };
}

function emit() {
  listeners.forEach((listener) => {
    try {
      listener(current);
    } catch {
      /* ignore */
    }
  });
}

export async function loadTimerSettings() {
  if (loaded) return current;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    current = normalizeTimerSettings(raw ? JSON.parse(raw) : null);
  } catch {
    current = { ...DEFAULT_TIMER_SETTINGS };
  }
  loaded = true;
  emit();
  return current;
}

export async function updateTimerSettings(patch) {
  if (!loaded) await loadTimerSettings();
  current = normalizeTimerSettings({ ...current, ...patch });
  emit();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* 메모리 값은 유지 */
  }
  return current;
}

export function subscribeTimerSettings(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function shiftTimerSetting(key, direction) {
  const limit = LIMITS[key];
  if (!limit) return current[key];
  return clampSetting(key, current[key] + direction * limit.step);
}

export function useTimerSettings() {
  const [settings, setSettings] = useState(current);
  const [ready, setReady] = useState(loaded);

  useEffect(() => {
    let alive = true;
    const unsubscribe = subscribeTimerSettings((next) => {
      if (alive) setSettings(next);
    });
    loadTimerSettings().then((next) => {
      if (!alive) return;
      setSettings(next);
      setReady(true);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const update = useCallback((patch) => {
    updateTimerSettings(patch);
  }, []);

  return { settings, ready, update };
}

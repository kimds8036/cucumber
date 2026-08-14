import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';
import { buildMealWidgetPayload } from './mealPayload.js';
import { buildTimetableWidgetPayload } from './timetablePayload.js';

function getNativeModule() {
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    const mod = require('youth-paper-widget');
    const api = mod?.default || mod?.YouthPaperWidget || mod;
    // stub 의 write* 가 있어도 isAvailable=false 면 미연결로 취급
    if (api && api.isAvailable === false) return null;
    if (api?.isAvailable === true) return api;
    if (api?.writeMealPayload && api.isAvailable !== false) {
      // 구버전 stub 호환: isAvailable 없으면 NativeModules 로 재확인
      if (NativeModules.YouthPaperWidget) return api;
      return null;
    }
  } catch {
    // module not linked
  }
  return NativeModules.YouthPaperWidget || null;
}

function resolveApiBaseUrl() {
  const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  const url = String(extra.apiBaseUrl || '').replace(/\/+$/, '');
  return url || null;
}

async function callNative(method, ...args) {
  const native = getNativeModule();
  if (!native || typeof native[method] !== 'function') {
    if (__DEV__) {
      console.warn(
        `[WidgetBridge] skip ${method} (native unavailable — podspec/autolink 확인)`,
      );
    }
    return false;
  }
  try {
    await native[method](...args);
    return true;
  } catch (e) {
    if (__DEV__) {
      console.warn(`[WidgetBridge] ${method} failed:`, e?.message || e);
    }
    return false;
  }
}

export function isWidgetBridgeAvailable() {
  return Boolean(getNativeModule());
}

export async function writeMealPayload(payload) {
  return callNative('writeMealPayload', JSON.stringify(payload));
}

export async function writeTimetablePayload(payload) {
  return callNative('writeTimetablePayload', JSON.stringify(payload));
}

export async function writePeriodTimeSettings(payload) {
  return callNative('writePeriodTimeSettings', JSON.stringify(payload));
}

export async function writeSchoolId(schoolId) {
  const id = schoolId == null ? '' : String(schoolId);
  const apiBaseUrl = resolveApiBaseUrl();
  if (apiBaseUrl) {
    await callNative('writeApiBaseUrl', apiBaseUrl);
  }
  return callNative('writeSchoolId', id);
}

export async function reloadWidgets() {
  return callNative('reloadWidgets');
}

/**
 * @param {{ accessToken?: string|null, refreshToken?: string|null, deviceId?: string|null, updatedAt?: number }} mirror
 */
export async function writeAuthMirror(mirror) {
  const payload = {
    accessToken: mirror?.accessToken || null,
    refreshToken: mirror?.refreshToken || null,
    deviceId: mirror?.deviceId || null,
    updatedAt: mirror?.updatedAt || Date.now(),
  };
  return callNative('writeAuthMirror', JSON.stringify(payload));
}

export async function clearAuthMirror() {
  return callNative('clearAuthMirror');
}

/** @returns {Promise<{ accessToken?: string|null, refreshToken?: string|null, deviceId?: string|null, updatedAt?: number }|null>} */
export async function readAuthMirror() {
  const native = getNativeModule();
  if (!native || typeof native.readAuthMirror !== 'function') return null;
  try {
    const raw = await native.readAuthMirror();
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

export async function scheduleWidgetBackgroundRefresh() {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  return callNative('scheduleBackgroundRefresh');
}

/** 급식 next 결과 → 위젯 동기화 */
export async function syncMealWidgetFromNext(meals, schoolId) {
  const payload = buildMealWidgetPayload(meals);
  const wrote = await writeMealPayload(payload);
  if (schoolId != null && schoolId !== '') {
    await writeSchoolId(schoolId);
  }
  await reloadWidgets();
  await scheduleWidgetBackgroundRefresh();
  return wrote;
}

/** 시간표 flat → 위젯 동기화 (null/빈 객체면 empty 안내) */
export async function syncTimetableWidgetFromFlat(flat, opts = {}) {
  const payload = buildTimetableWidgetPayload(flat, opts);
  const wrote = await writeTimetablePayload(payload);
  await reloadWidgets();
  await scheduleWidgetBackgroundRefresh();
  return wrote;
}

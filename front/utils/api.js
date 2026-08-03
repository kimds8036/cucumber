import axios from 'axios';
import { Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { API_URLS } from '../config/apiEnv.js';
import { notifySessionTerminated } from './sessionTerminate';
import { getUserFacingErrorMessage } from './userFacingError.js';

const AUTH_TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@refresh_token';
const DEVICE_ID_KEY = '@device_id';

/**
 * 자동로그인 OFF 상태에서 사용하는 인메모리 토큰.
 * 앱이 살아있는 동안만 유효하며, 종료 시 자연스럽게 사라져
 * 다음 부팅에서는 다시 로그인 화면이 나오도록 한다.
 */
let inMemoryAuthToken = null;

/** 동시 401 시 refresh 1회만 실행 */
let refreshInFlight = null;

const SESSION_TERMINATE_CODES = [
  'SESSION_REVOKED',
  'ACCOUNT_BANNED',
  'ACCOUNT_SUSPENDED',
  'ACCOUNT_DELETED',
];

/** env·extra 미설정 시 develop Railway (app.config.js가 보통 extra에 박아 둠) */
const DEFAULT_API_BASE = API_URLS.develop;

/**
 * baseURL은 항상 슬래시로 끝난다.
 * 우선순위: EXPO_PUBLIC_API_URL → expo.extra.apiBaseUrl → DEFAULT_API_BASE
 */
const getBaseURL = () => {
  const fromEnv =
    typeof process.env.EXPO_PUBLIC_API_URL === 'string'
      ? process.env.EXPO_PUBLIC_API_URL.trim()
      : '';
  const extra = Constants.expoConfig?.extra ?? {};
  const fromExtra =
    typeof extra.apiBaseUrl === 'string' ? extra.apiBaseUrl.trim() : '';

  const raw = fromEnv || fromExtra;
  if (raw) {
    const trimmed = raw.replace(/\/+$/, '');
    return `${trimmed}/`;
  }

  const fallback = DEFAULT_API_BASE.replace(/\/+$/, '');
  return `${fallback}/`;
};

/** 슬래시 없는 베이스 URL (네이티브 채팅 Intent 등) */
export function getApiBaseUrlNoSlash() {
  return getBaseURL().replace(/\/+$/, '');
}

function getAppVersionHeader() {
  return String(
    Constants.expoConfig?.version ||
      Constants.manifest2?.extra?.expoClient?.version ||
      Constants.manifest?.version ||
      '',
  ).trim();
}

export const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

/**
 * 서버가 "요청 형식/입력값" 문제로 응답할 때 쓰는 HTTP 상태.
 * - 전통적으로 400(Bad Request)을 쓰던 엔드포인트와
 * - express-validator 도입 후 422(Unprocessable Entity)를 쓰는 엔드포인트를
 *   프론트에서 동일하게 취급하기 위한 상수.
 */
export const API_INPUT_ERROR_HTTP_STATUSES = Object.freeze([400, 422]);

/**
 * @param {unknown} error — axios catch 블록의 error
 * @returns {boolean}
 */
export function isApiInputValidationHttpError(error) {
  const status = error?.response?.status;
  return API_INPUT_ERROR_HTTP_STATUSES.includes(status);
}

/**
 * 사용자에게 보여줄 한 줄 메시지.
 * - 응답 인터셉터가 400/422일 때 `error.userFacingMessage`에 복사해 둔 값을 우선 사용
 * - 그다음 `response.data.message` (백엔드 공통 포맷)
 */
export function getApiUserFacingMessage(
  error,
  fallback = '요청에 실패했습니다.',
) {
  return getUserFacingErrorMessage(error, fallback);
}

// 요청 시 저장된 토큰을 Authorization 헤더에 붙임
// (영속 토큰 → 인메모리 토큰 순서로 폴백)
api.interceptors.request.use(
  async (config) => {
    const appVersion = getAppVersionHeader();
    if (appVersion) {
      config.headers['App-Version'] = appVersion;
    }
    config.headers['App-Platform'] = Platform.OS === 'ios' ? 'ios' : 'android';
    try {
      const stored = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const token = stored || inMemoryAuthToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // 무시
    }
    return config;
  },
  (err) => Promise.reject(err),
);

function isAuthRoute(config) {
  const url = String(config?.url || '');
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/refresh') ||
    url.includes('/api/auth/logout')
  );
}

function shouldAttemptTokenRefresh(error) {
  const status = error?.response?.status;
  if (status !== 401) return false;

  const config = error?.config;
  if (!config || config.skipAuthRefresh || config._authRetry) return false;
  if (isAuthRoute(config)) return false;

  const code = error?.response?.data?.code;
  if (SESSION_TERMINATE_CODES.includes(code)) return false;
  if (code === 'INVALID_TOKEN') return false;
  if (code === 'TOKEN_EXPIRED') return true;

  const hadAuth = Boolean(
    config.headers?.Authorization || config.headers?.authorization,
  );
  return hadAuth && !code;
}

function enrichApiError(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  if (API_INPUT_ERROR_HTTP_STATUSES.includes(status)) {
    const msg =
      (data && typeof data.message === 'string' && data.message.trim()) ||
      (typeof data === 'string' && data.trim()) ||
      null;
    if (msg) {
      error.userFacingMessage = msg;
    }
  }
  if (status === 426) {
    const msg =
      (data && typeof data.message === 'string' && data.message.trim()) ||
      '앱 업데이트가 필요합니다. 스토어에서 최신 버전으로 업데이트해 주세요.';
    error.userFacingMessage = msg;
    error.isUpgradeRequired = true;
    const storeUrl = data?.data?.storeUrl;
    if (storeUrl && !error.config?.skipUpgradeAlert) {
      Alert.alert('업데이트 필요', msg, [
        { text: '스토어 열기', onPress: () => Linking.openURL(storeUrl).catch(() => {}) },
        { text: '닫기', style: 'cancel' },
      ]);
    }
  }
  if (SESSION_TERMINATE_CODES.includes(data?.code)) {
    error.isSessionTerminated = true;
    error.sessionTerminateCode = data.code;
    notifySessionTerminated({
      code: data.code,
      message:
        (typeof data?.message === 'string' && data.message.trim()) ||
        undefined,
    }).catch(() => {});
  }
  return error;
}

/**
 * 로그인 성공 시 토큰 저장.
 * @param {string|null} token
 * @param {{ persist?: boolean }} [options]
 *   - persist=true (기본): AsyncStorage 영속 저장 → 다음 부팅 자동로그인
 *   - persist=false: 인메모리만 저장 + 영속 토큰 삭제 → 이번 세션만 유지
 */
async function syncWidgetAuthMirror({ persist, accessToken, refreshToken }) {
  try {
    const {
      writeAuthMirror,
      clearAuthMirror,
    } = require('./widget/widgetBridge');
    if (!persist) {
      await clearAuthMirror();
      return;
    }
    const deviceId = await getDeviceId();
    const refresh =
      refreshToken !== undefined
        ? refreshToken
        : await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refresh || !deviceId) {
      await clearAuthMirror();
      return;
    }
    const access =
      accessToken !== undefined
        ? accessToken
        : inMemoryAuthToken || (await AsyncStorage.getItem(AUTH_TOKEN_KEY));
    await writeAuthMirror({
      accessToken: access || null,
      refreshToken: refresh,
      deviceId,
      updatedAt: Date.now(),
    });
  } catch {
    // 위젯 네이티브 미연결 시 무시
  }
}

export async function setAuthToken(token, { persist = true } = {}) {
  inMemoryAuthToken = token || null;
  if (persist) {
    if (token) {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } else {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  }
  await syncWidgetAuthMirror({ persist, accessToken: token || null });
}

/** 로그아웃 시 토큰 제거 */
export async function clearAuthToken() {
  inMemoryAuthToken = null;
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  try {
    const { clearAuthMirror } = require('./widget/widgetBridge');
    await clearAuthMirror();
  } catch {
    // ignore
  }
}

/**
 * 현재 살아있는 인증 토큰을 가져온다.
 * - 영속(AsyncStorage) → 인메모리 순서로 폴백한다.
 * - SocketContext 등 axios interceptor 외부에서 토큰을 직접 써야 할 때 사용.
 */
export async function getOrCreateDeviceId() {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return `device_${Date.now()}`;
  }
}

export async function setRefreshToken(token, { persist = true } = {}) {
  if (!persist) {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    await syncWidgetAuthMirror({ persist: false });
    return;
  }
  if (token) {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  await syncWidgetAuthMirror({ persist: true, refreshToken: token || null });
}

export async function getRefreshToken() {
  try {
    return (await AsyncStorage.getItem(REFRESH_TOKEN_KEY)) || null;
  } catch {
    return null;
  }
}

export async function getDeviceId() {
  try {
    return (await AsyncStorage.getItem(DEVICE_ID_KEY)) || null;
  } catch {
    return null;
  }
}

export async function getAuthToken() {
  try {
    const stored = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (stored) return stored;
  } catch {
    // AsyncStorage 접근 실패 시 인메모리 폴백
  }
  return inMemoryAuthToken;
}

async function tokensShouldPersist() {
  try {
    const stored = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    return Boolean(stored);
  } catch {
    return Boolean(inMemoryAuthToken);
  }
}

/**
 * Refresh Token으로 Access Token 갱신 (single-flight).
 * axios 401 인터셉터·Socket 재연결 등에서 공통 사용.
 * @returns {Promise<string|null>}
 */
export async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const [refreshToken, deviceId] = await Promise.all([
        getRefreshToken(),
        getDeviceId(),
      ]);
      if (!refreshToken || !deviceId) return null;

      const response = await api.post(
        '/api/auth/refresh',
        { refreshToken, deviceId },
        { skipAuthRefresh: true },
      );
      const nextToken =
        response?.data?.data?.token ?? response?.data?.token ?? null;
      const nextRefresh =
        response?.data?.data?.refreshToken ?? response?.data?.refreshToken;
      if (!nextToken) return null;

      const persist = await tokensShouldPersist();
      await setAuthToken(nextToken, { persist });
      if (nextRefresh) await setRefreshToken(nextRefresh, { persist });
      return nextToken;
    } catch (error) {
      if (__DEV__) {
        console.warn(
          '[API] refresh 실패:',
          error?.response?.status ?? error?.message,
        );
      }
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// 응답: 401 TOKEN_EXPIRED 시 refresh 후 1회 재시도, 그 외 에러 UX 보강
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalConfig = error?.config;

    if (shouldAttemptTokenRefresh(error)) {
      const newToken = await refreshAccessToken();
      if (newToken && originalConfig) {
        originalConfig._authRetry = true;
        originalConfig.headers = originalConfig.headers || {};
        originalConfig.headers.Authorization = `Bearer ${newToken}`;
        return api.request(originalConfig);
      }
    }

    return Promise.reject(enrichApiError(error));
  },
);

/**
 * 로그아웃 시 사용자 세션/캐시 데이터 정리
 * - `@` prefix: 앱에서 쓰는 고정 키들
 * - `_chat_cache_`: 채팅방별 동적 캐시 키
 */
export async function clearUserSessionStorage() {
  const allKeys = await AsyncStorage.getAllKeys();
  const userScopedKeys = allKeys.filter(
    (key) => key.startsWith('@') || key.includes('_chat_cache_'),
  );
  if (userScopedKeys.length > 0) {
    await AsyncStorage.multiRemove(userScopedKeys);
  }
}

if (__DEV__) {
  console.log('[API] baseURL:', api.defaults.baseURL, {
    fromEnv: Boolean(
      typeof process.env.EXPO_PUBLIC_API_URL === 'string' &&
      process.env.EXPO_PUBLIC_API_URL.trim(),
    ),
    platform: Platform.OS,
  });
}

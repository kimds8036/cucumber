import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const AUTH_TOKEN_KEY = '@auth_token';

/**
 * 자동로그인 OFF 상태에서 사용하는 인메모리 토큰.
 * 앱이 살아있는 동안만 유효하며, 종료 시 자연스럽게 사라져
 * 다음 부팅에서는 다시 로그인 화면이 나오도록 한다.
 */
let inMemoryAuthToken = null;

/** 터널/개발 기본값 — 릴리스에서도 env 미설정 시 폴백 (--no-dev 로컬 검증용) */
const DEFAULT_API_BASE = 'https://nonvenous-patriotically-bud.ngrok-free.dev';

/**
 * baseURL은 항상 슬래시로 끝난다.
 * 우선순위: EXPO_PUBLIC_API_URL → app.json extra.apiBaseUrl → DEFAULT_API_BASE
 * (__DEV__ 전용 분기 없음 — 프로덕션/미니파이에서도 동일 규칙)
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
export function getApiUserFacingMessage(error, fallback = '요청에 실패했습니다.') {
  const fromInterceptor =
    typeof error?.userFacingMessage === 'string' && error.userFacingMessage.trim();
  if (fromInterceptor) return fromInterceptor.trim();
  const data = error?.response?.data;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message.trim();
  if (typeof data === 'string' && data.trim()) return data.trim();
  return fallback;
}

// 요청 시 저장된 토큰을 Authorization 헤더에 붙임
// (영속 토큰 → 인메모리 토큰 순서로 폴백)
api.interceptors.request.use(
  async (config) => {
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

// 응답: 입력 검증 실패(400·422) 시 서버 메시지를 한곳에 심어 두어,
// `status === 400` 만 보던 구식 분기 없이도 getApiUserFacingMessage 로 동일 UX 유지
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
    return Promise.reject(error);
  },
);

/**
 * 로그인 성공 시 토큰 저장.
 * @param {string|null} token
 * @param {{ persist?: boolean }} [options]
 *   - persist=true (기본): AsyncStorage 영속 저장 → 다음 부팅 자동로그인
 *   - persist=false: 인메모리만 저장 + 영속 토큰 삭제 → 이번 세션만 유지
 */
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
}

/** 로그아웃 시 토큰 제거 */
export async function clearAuthToken() {
  inMemoryAuthToken = null;
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * 현재 살아있는 인증 토큰을 가져온다.
 * - 영속(AsyncStorage) → 인메모리 순서로 폴백한다.
 * - SocketContext 등 axios interceptor 외부에서 토큰을 직접 써야 할 때 사용.
 */
export async function getAuthToken() {
  try {
    const stored = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (stored) return stored;
  } catch {
    // AsyncStorage 접근 실패 시 인메모리 폴백
  }
  return inMemoryAuthToken;
}

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

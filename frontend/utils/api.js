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

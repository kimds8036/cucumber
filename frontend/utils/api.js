import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = '@auth_token';

const getBaseURL = () => {
  if (Platform.OS === 'web') {
    return 'https://nonvenous-patriotically-bud.ngrok-free.dev/';
  }

  if (__DEV__) {
    return 'https://nonvenous-patriotically-bud.ngrok-free.dev/';
  }

  return 'http://your-production-server.com'; // 프로덕션
};

export const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

// 요청 시 저장된 토큰을 Authorization 헤더에 붙임
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
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

/** 로그인 성공 시 토큰 저장 */
export async function setAuthToken(token) {
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

/** 로그아웃 시 토큰 제거 */
export async function clearAuthToken() {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}

// 디버깅용 (개발 중 확인)
if (__DEV__) {
  console.log('[API] baseURL:', api.defaults.baseURL);
}

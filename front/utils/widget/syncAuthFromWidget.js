import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceId, getRefreshToken, getAuthToken } from '../api';
import {
  clearAuthMirror,
  readAuthMirror,
  writeAuthMirror,
} from './widgetBridge.js';

const AUTH_TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@refresh_token';

/**
 * persist 로그인 시 보안 미러에 Refresh(+Access)·deviceId 기록.
 * rememberMe off / 로그아웃 시 미러 삭제.
 */
export async function mirrorAuthTokensToWidget({
  persist,
  accessToken,
  refreshToken,
} = {}) {
  if (!persist) {
    await clearAuthMirror();
    return;
  }
  const deviceId = await getDeviceId();
  const access =
    accessToken !== undefined ? accessToken : await getAuthToken();
  const refresh =
    refreshToken !== undefined ? refreshToken : await getRefreshToken();
  if (!refresh || !deviceId) {
    await clearAuthMirror();
    return;
  }
  await writeAuthMirror({
    accessToken: access || null,
    refreshToken: refresh,
    deviceId,
    updatedAt: Date.now(),
  });
}

/**
 * 포그라운드 복귀 시: 위젯 미러 토큰이 더 최신이면 AsyncStorage 덮어쓰기.
 * (BG에서 Refresh rotation 소비 후 앱이 낡은 토큰을 쓰지 않도록)
 */
export async function syncAuthFromWidgetMirrorIfNewer() {
  try {
    const mirror = await readAuthMirror();
    if (!mirror?.refreshToken || !mirror?.updatedAt) return false;

    const [storedRefresh, storedAccess] = await Promise.all([
      AsyncStorage.getItem(REFRESH_TOKEN_KEY),
      AsyncStorage.getItem(AUTH_TOKEN_KEY),
    ]);
    // 영속 토큰이 없으면(rememberMe off) 미러도 무시
    if (!storedRefresh && !storedAccess) return false;

    if (storedRefresh === mirror.refreshToken) {
      if (mirror.accessToken && mirror.accessToken !== storedAccess) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, mirror.accessToken);
        return true;
      }
      return false;
    }

    // refresh 가 다르면 미러를 신뢰 (BG rotation 가정)
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, mirror.refreshToken);
    if (mirror.accessToken) {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, mirror.accessToken);
    }
    return true;
  } catch (e) {
    if (__DEV__) {
      console.warn('[WidgetAuthSync] failed:', e?.message || e);
    }
    return false;
  }
}

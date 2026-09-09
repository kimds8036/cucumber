import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { api, getDeviceId, getOrCreateDeviceId } from './api';

/** @ prefix 없이 — 로그아웃 시 clearUserSessionStorage(@*)에 안 지워짐 */
const INSTALL_ID_KEY = 'yp_app_install_id';
const LAST_SEEN_AT_KEY = 'yp_last_seen_ping_at';
const LAST_SEEN_MIN_INTERVAL_MS = 5 * 60 * 1000;

function appVersion() {
  return String(
    Constants.expoConfig?.version ||
      Constants.manifest2?.extra?.expoClient?.version ||
      Constants.manifest?.version ||
      '',
  ).trim();
}

function newInstallId() {
  return `i_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export async function getOrCreateInstallId() {
  try {
    const existing = await AsyncStorage.getItem(INSTALL_ID_KEY);
    if (existing && String(existing).trim()) return String(existing).trim();
    const id = newInstallId();
    await AsyncStorage.setItem(INSTALL_ID_KEY, id);
    return id;
  } catch {
    return newInstallId();
  }
}

/** 로그인 전 가입 화면 등 — 설치·실행 기록 */
export async function reportInstallOpen() {
  try {
    const installId = await getOrCreateInstallId();
    let deviceId = await getDeviceId();
    if (!deviceId) {
      try {
        deviceId = await getOrCreateDeviceId();
      } catch {
        deviceId = null;
      }
    }
    await api.post('/api/app/install-open', {
      installId,
      deviceId: deviceId || undefined,
      platform: Platform.OS,
      appVersion: appVersion() || undefined,
    });
  } catch {
    // 퍼널 실패는 UX에 영향 없음
  }
}

/** 메인 게시판 포커스 — 로그인 유저 last_seen (5분 스로틀) */
export async function reportLastSeen() {
  try {
    const now = Date.now();
    const prevRaw = await AsyncStorage.getItem(LAST_SEEN_AT_KEY);
    const prev = prevRaw ? Number(prevRaw) : 0;
    if (prev && now - prev < LAST_SEEN_MIN_INTERVAL_MS) return;
    await api.post('/api/users/me/last-seen');
    await AsyncStorage.setItem(LAST_SEEN_AT_KEY, String(now));
  } catch {
    // ignore
  }
}

/** 로그인·가입 완료 후 미가입 퍼널에서 제외 */
export async function reportInstallConvert() {
  try {
    const installId = await getOrCreateInstallId();
    const deviceId = await getDeviceId();
    await api.post('/api/users/me/install-convert', {
      installId,
      deviceId: deviceId || undefined,
    });
  } catch {
    // ignore
  }
}

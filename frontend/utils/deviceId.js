import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = '@device_installation_id';

/**
 * 앱 설치 단위 ID (재설치 시 새로 발급). FCM 멀티 디바이스 매핑용.
 */
export async function getDeviceId() {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored && String(stored).trim()) {
      return String(stored).trim().slice(0, 64);
    }
    const generated = `${Platform.OS}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 14)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
    return generated.slice(0, 64);
  } catch {
    return `${Platform.OS}-fallback`.slice(0, 64);
  }
}

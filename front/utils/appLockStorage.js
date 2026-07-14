import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  DARK_MODE_ENABLED: 'dark_mode_enabled',
  APP_LOCK_ENABLED: 'app_lock_enabled',
  APP_LOCK_PIN: 'app_lock_pin',
  BIOMETRIC_ENABLED: 'biometric_enabled',
};

export async function getDarkModeEnabled() {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.DARK_MODE_ENABLED);
  return value === 'true';
}

export async function setDarkModeEnabled(enabled) {
  await AsyncStorage.setItem(
    STORAGE_KEYS.DARK_MODE_ENABLED,
    enabled ? 'true' : 'false',
  );
}

export async function getAppLockEnabled() {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.APP_LOCK_ENABLED);
  return value === 'true';
}

export async function setAppLockEnabled(enabled) {
  await AsyncStorage.setItem(
    STORAGE_KEYS.APP_LOCK_ENABLED,
    enabled ? 'true' : 'false',
  );
  if (!enabled) {
    await setBiometricEnabled(false);
  }
}

export async function getBiometricEnabled() {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
  return value === 'true';
}

export async function setBiometricEnabled(enabled) {
  await AsyncStorage.setItem(
    STORAGE_KEYS.BIOMETRIC_ENABLED,
    enabled ? 'true' : 'false',
  );
}

export async function getAppLockPin() {
  return AsyncStorage.getItem(STORAGE_KEYS.APP_LOCK_PIN);
}

export async function setAppLockPin(pin) {
  await AsyncStorage.setItem(STORAGE_KEYS.APP_LOCK_PIN, pin);
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@cucumber/last_viewer_location';

export async function loadLastLocation() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const lat = parsed?.latitude;
    const lng = parsed?.longitude;
    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {
      return null;
    }
    return { latitude: lat, longitude: lng };
  } catch {
    return null;
  }
}

export async function saveLastLocation(coords) {
  if (
    !coords ||
    typeof coords.latitude !== 'number' ||
    typeof coords.longitude !== 'number' ||
    Number.isNaN(coords.latitude) ||
    Number.isNaN(coords.longitude)
  ) {
    return;
  }
  try {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude,
        savedAt: Date.now(),
      }),
    );
  } catch {
    /* ignore */
  }
}

export async function clearLastLocation() {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

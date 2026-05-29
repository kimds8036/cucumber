import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCommuteDayKey } from './commuteUtils';

const STORAGE_PREFIX = '@cucumber/commute_done_v1';

function storageKey(userId) {
  const scope = userId != null ? String(userId) : 'anonymous';
  return `${STORAGE_PREFIX}:${scope}`;
}

export async function loadCommuteCompletedToday(userId, date = new Date()) {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const dayKey = getCommuteDayKey(date);
    return parsed?.dayKey === dayKey;
  } catch {
    return false;
  }
}

export async function saveCommuteCompletedToday(userId, date = new Date()) {
  const dayKey = getCommuteDayKey(date);
  await AsyncStorage.setItem(
    storageKey(userId),
    JSON.stringify({
      dayKey,
      completedAt: date.toISOString(),
    }),
  );
  return dayKey;
}

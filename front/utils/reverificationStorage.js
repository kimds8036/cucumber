import AsyncStorage from '@react-native-async-storage/async-storage';

export const REVERIFICATION_STATUS_KEY = '@reverification_status';
export const REVERIFICATION_DEADLINE_KEY = '@reverification_deadline';

export async function getCachedReverification() {
  try {
    const status = await AsyncStorage.getItem(REVERIFICATION_STATUS_KEY);
    const deadline = await AsyncStorage.getItem(REVERIFICATION_DEADLINE_KEY);
    return {
      status: status || 'none',
      deadline: deadline || null,
    };
  } catch {
    return { status: 'none', deadline: null };
  }
}

export async function setCachedReverification(status, deadline) {
  try {
    const nextStatus = status || 'none';
    await AsyncStorage.setItem(REVERIFICATION_STATUS_KEY, nextStatus);
    if (deadline) {
      await AsyncStorage.setItem(REVERIFICATION_DEADLINE_KEY, String(deadline));
    } else {
      await AsyncStorage.removeItem(REVERIFICATION_DEADLINE_KEY);
    }
  } catch {
    // ignore
  }
}

export async function clearCachedReverification() {
  try {
    await AsyncStorage.multiRemove([
      REVERIFICATION_STATUS_KEY,
      REVERIFICATION_DEADLINE_KEY,
    ]);
  } catch {
    // ignore
  }
}

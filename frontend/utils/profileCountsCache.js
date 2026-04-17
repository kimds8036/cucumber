import AsyncStorage from '@react-native-async-storage/async-storage';

export const PROFILE_COUNTS_CACHE_KEY = '@mypage_profile_counts_v1';

export async function invalidateProfileCountsCache() {
  try {
    await AsyncStorage.removeItem(PROFILE_COUNTS_CACHE_KEY);
  } catch {
    // ignore cache invalidation failures
  }
}

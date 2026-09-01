import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_SESSION_KEY = '@signup_pending_session';
const PENDING_TTL_MS = 30 * 60 * 1000;

/** @typedef {'kakao'|'apple'|'phone'} SignupProvider */

/**
 * @param {SignupProvider} provider
 * @param {object} snapshot
 */
export async function saveSignupPendingSession(provider, snapshot) {
  await AsyncStorage.setItem(
    PENDING_SESSION_KEY,
    JSON.stringify({
      provider,
      savedAt: Date.now(),
      snapshot,
    }),
  );
}

/** @returns {Promise<{ provider: SignupProvider, savedAt: number, snapshot: object }|null>} */
export async function getSignupPendingSession() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.provider || !data?.snapshot) {
      await clearSignupPendingSession();
      return null;
    }
    if (Date.now() - Number(data.savedAt || 0) > PENDING_TTL_MS) {
      await clearSignupPendingSession();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** @param {SignupProvider} [provider] — 지정 시 해당 provider만 삭제 */
export async function clearSignupPendingSession(provider) {
  if (!provider) {
    await AsyncStorage.removeItem(PENDING_SESSION_KEY);
    return;
  }
  const existing = await getSignupPendingSession();
  if (existing?.provider === provider) {
    await AsyncStorage.removeItem(PENDING_SESSION_KEY);
  }
}

import auth from '@react-native-firebase/auth';
import { ensureFirebaseApp } from './firebaseApp';
import { formatPhoneToE164, normalizeLocalKrPhone } from './phoneFormat';

/** Firebase SMS 인증 요청 → confirmation 객체 반환 */
export async function requestPhoneVerification(localPhone) {
  ensureFirebaseApp();
  const normalized = normalizeLocalKrPhone(localPhone);
  const formatted = formatPhoneToE164(normalized);
  if (!formatted || formatted.length < 12) {
    throw new Error('올바른 전화번호를 입력해 주세요.');
  }
  return auth().signInWithPhoneNumber(formatted);
}

/** 6자리 코드 확인 → idToken 반환 */
export async function confirmPhoneVerification(confirmation, code) {
  const credential = await confirmation.confirm(String(code).trim());
  const idToken = await credential.user.getIdToken();
  return {
    idToken,
    phoneE164: credential.user.phoneNumber,
  };
}

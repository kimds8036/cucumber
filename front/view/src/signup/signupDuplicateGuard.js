import { Alert } from 'react-native';
import { api } from '../../../utils/api';

const DUPLICATE_CODES = new Set([
  'PHONE_ALREADY_REGISTERED',
  'USERNAME_ALREADY_REGISTERED',
  'KAKAO_ALREADY_LINKED',
  'APPLE_ALREADY_LINKED',
]);

/**
 * 가입 API 중복 응답 → 로그인 유도 Alert
 * @returns {boolean} 중복으로 처리했으면 true
 */
export function alertSignupDuplicateAndOfferLogin(error, navigation) {
  const code = error?.response?.data?.code;
  const message =
    error?.response?.data?.message ||
    '이미 가입된 계정입니다. 로그인해주세요.';
  const looksDuplicate =
    DUPLICATE_CODES.has(code) ||
    /이미 (가입|사용)/.test(String(message));

  if (!looksDuplicate) return false;

  Alert.alert('이미 가입된 계정', message, [
    {
      text: '로그인하기',
      onPress: () => navigation?.navigate?.('Login'),
    },
    { text: '확인', style: 'cancel' },
  ]);
  return true;
}

/**
 * 전화번호가 이미 가입돼 있으면 로그인 유도.
 * @returns {Promise<boolean>} available 이면 true
 */
export async function assertPhoneAvailableForSignup(phone, navigation) {
  const normalized = String(phone || '').replace(/\D/g, '');
  if (!normalized || normalized.length < 10) return true;

  try {
    const res = await api.post('/api/auth/check-phone-available', {
      phone: normalized,
    });
    if (res.data?.data?.available !== false) return true;
  } catch {
    // 확인 실패 시 최종 signup 에서 다시 막힘
    return true;
  }

  Alert.alert(
    '이미 가입된 계정',
    '이미 가입된 전화번호입니다. 로그인해주세요.',
    [
      {
        text: '로그인하기',
        onPress: () => navigation?.navigate?.('Login'),
      },
      { text: '확인', style: 'cancel' },
    ],
  );
  return false;
}

import { Alert } from 'react-native';
import { api } from '../../../utils/api';

const DUPLICATE_CODES = new Set([
  'PHONE_ALREADY_REGISTERED',
  'USERNAME_ALREADY_REGISTERED',
  'KAKAO_ALREADY_LINKED',
  'APPLE_ALREADY_LINKED',
]);

/**
 * 가입 수단(providers)에 맞춰 로그인 방법 안내 문구 생성
 * @param {{ providers?: string[], code?: string }} opts
 */
export function buildDuplicateLoginHintMessage({ providers, code } = {}) {
  const set = new Set(
    (Array.isArray(providers) ? providers : []).map((p) =>
      String(p || '').toLowerCase(),
    ),
  );

  if (code === 'KAKAO_ALREADY_LINKED') set.add('kakao');
  if (code === 'APPLE_ALREADY_LINKED') set.add('apple');

  const methods = [];
  if (set.has('kakao')) methods.push('카카오');
  if (set.has('apple')) methods.push('Apple');
  if (methods.length === 0) {
    methods.push('아이디와 비밀번호');
  }

  if (methods.length === 1) {
    if (methods[0] === '아이디와 비밀번호') {
      return '아이디와 비밀번호로 로그인해 주세요.';
    }
    return `${methods[0]} 로그인을 이용해 주세요.`;
  }

  return `${methods.join(' 또는 ')} 로그인을 이용해 주세요.`;
}

/**
 * 중복 가입 Alert 본문
 */
export function buildDuplicateAccountAlertMessage({
  providers,
  code,
  serverMessage,
} = {}) {
  const hint = buildDuplicateLoginHintMessage({ providers, code });

  if (code === 'USERNAME_ALREADY_REGISTERED') {
    return `이미 사용 중인 아이디입니다.\n\n${hint}`;
  }
  if (code === 'KAKAO_ALREADY_LINKED') {
    return `이미 가입된 카카오 계정입니다.\n\n${hint}`;
  }
  if (code === 'APPLE_ALREADY_LINKED') {
    return `이미 가입된 Apple 계정입니다.\n\n${hint}`;
  }
  if (code === 'PHONE_ALREADY_REGISTERED') {
    return `이미 가입된 전화번호입니다.\n\n${hint}`;
  }

  // 코드 없이 providers만 온 경우(전화번호 중복 확인 API)
  if (Array.isArray(providers)) {
    return `이미 가입된 전화번호입니다.\n\n${hint}`;
  }

  const fallback = String(serverMessage || '').trim();
  if (fallback && !/로그인해주세요\.?$/.test(fallback)) {
    return fallback.includes('\n') ? fallback : `${fallback}\n\n${hint}`;
  }
  return `이미 가입된 계정입니다.\n\n${hint}`;
}

function showDuplicateLoginAlert(message, navigation) {
  Alert.alert('이미 가입된 계정', message, [
    {
      text: '로그인하기',
      onPress: () => navigation?.navigate?.('Login'),
    },
    { text: '확인', style: 'cancel' },
  ]);
}

/**
 * 가입 API 중복 응답 → 로그인 유도 Alert
 * @returns {boolean} 중복으로 처리했으면 true
 */
export function alertSignupDuplicateAndOfferLogin(error, navigation) {
  const code = error?.response?.data?.code;
  const serverMessage = error?.response?.data?.message;
  const providers = error?.response?.data?.data?.providers;
  const looksDuplicate =
    DUPLICATE_CODES.has(code) ||
    /이미 (가입|사용)/.test(String(serverMessage || ''));

  if (!looksDuplicate) return false;

  const message = buildDuplicateAccountAlertMessage({
    providers,
    code,
    serverMessage,
  });
  showDuplicateLoginAlert(message, navigation);
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

    const message = buildDuplicateAccountAlertMessage({
      providers: res.data?.data?.providers,
      code: 'PHONE_ALREADY_REGISTERED',
    });
    showDuplicateLoginAlert(message, navigation);
    return false;
  } catch {
    // 확인 실패 시 최종 signup 에서 다시 막힘
    return true;
  }
}

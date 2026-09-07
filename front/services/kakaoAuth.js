import {
  loginWithKakaoAccount,
  getProfile,
  logout as kakaoLogout,
} from '@react-native-seoul/kakao-login';

/**
 * 카카오 계정 로그인 UI를 연 뒤 프로필 조회.
 * 가입 플로우에서는 카카오톡 묵시 재로그인(창 안 뜸)을 피하기 위해
 * 로그아웃 후 loginWithKakaoAccount 만 사용한다.
 */
export async function loginWithKakao() {
  try {
    await kakaoLogout();
  } catch {
    // 미로그인 상태면 무시
  }

  let token;
  try {
    token = await loginWithKakaoAccount();
  } catch (error) {
    const msg = String(error?.message || error || '');
    if (/cancel|취소|user.?cancel|E_CANCELLED/i.test(msg)) {
      const err = new Error('CANCELLED');
      err.code = 'CANCELLED';
      throw err;
    }
    throw error;
  }

  const profile = await getProfile();
  return {
    accessToken: token?.accessToken || '',
    refreshToken: token?.refreshToken || '',
    profile,
  };
}

/**
 * 카카오 프로필 → 가입 identity 형태
 * birthday: MMDD, birthyear: YYYY (동의·심사 전이면 빈 값)
 */
export function mapKakaoProfileToIdentity(profile) {
  const name =
    String(profile?.name || profile?.nickname || '').trim() || '';
  const phoneNumber = normalizePhone(
    String(profile?.phoneNumber || '').trim(),
  );
  const birthDate = buildBirthDateFromKakao(
    profile?.birthyear,
    profile?.birthday,
  );

  return {
    name,
    birthDate,
    phoneNumber,
    kakaoId: profile?.id != null ? String(profile.id) : '',
    isVerified: false,
  };
}

function normalizePhone(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('82') && digits.length >= 11) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

function buildBirthDateFromKakao(birthyear, birthday) {
  const y = String(birthyear || '').replace(/\D/g, '');
  const md = String(birthday || '').replace(/\D/g, '');
  if (y.length === 4 && md.length === 4) {
    return `${y}-${md.slice(0, 2)}-${md.slice(2, 4)}`;
  }
  return '';
}

import {
  login as kakaoLogin,
  loginWithKakaoAccount,
  getProfile,
} from '@react-native-seoul/kakao-login';

/**
 * 카카오 네이티브 SDK 로그인 → 프로필
 * @returns {{ accessToken: string, refreshToken?: string, profile: object }}
 */
export async function loginWithKakao() {
  let token;
  try {
    token = await kakaoLogin();
  } catch (firstError) {
    const msg = String(firstError?.message || firstError || '');
    if (/cancel|취소|user.?cancel|E_CANCELLED/i.test(msg)) {
      const err = new Error('CANCELLED');
      err.code = 'CANCELLED';
      throw err;
    }
    try {
      token = await loginWithKakaoAccount();
    } catch (secondError) {
      const msg2 = String(secondError?.message || secondError || '');
      if (/cancel|취소|user.?cancel|E_CANCELLED/i.test(msg2)) {
        const err = new Error('CANCELLED');
        err.code = 'CANCELLED';
        throw err;
      }
      throw secondError;
    }
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

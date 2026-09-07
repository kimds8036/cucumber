import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  APPLE_MOCK_PROFILE,
  toAppleIdentityData,
} from '../view/src/signup/appleSignupMocks';

function isAppleAuthMockEnabled() {
  return (
    String(process.env.EXPO_PUBLIC_APPLE_AUTH_MOCK || '')
      .trim()
      .toLowerCase() === 'true'
  );
}

/**
 * iOS에서만 Sign in with Apple 사용 가능.
 * Android / 미지원 환경에서는 AVAILABLE false.
 */
export async function isAppleAuthAvailable() {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Apple 로그인 → identityToken + (최초 1회) fullName
 * 취소 시 code CANCELLED
 * 미지원 시 code APPLE_UNAVAILABLE (기본: mock 자동 진행 안 함)
 */
export async function loginWithApple() {
  const available = await isAppleAuthAvailable();
  if (!available) {
    // 명시 플래그일 때만 Android/미지원에서 mock (실 Sign In 건너뛰지 않음)
    if (__DEV__ && isAppleAuthMockEnabled()) {
      return {
        identityToken: APPLE_MOCK_PROFILE.identityToken,
        appleUserId: APPLE_MOCK_PROFILE.appleUserId,
        profile: toAppleIdentityData(APPLE_MOCK_PROFILE),
        isMock: true,
      };
    }
    const err = new Error(
      Platform.OS === 'ios'
        ? '이 기기에서는 Apple 로그인을 사용할 수 없습니다.'
        : 'Apple 로그인은 iOS에서만 사용할 수 있습니다.',
    );
    err.code = 'APPLE_UNAVAILABLE';
    throw err;
  }

  let credential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    const code = String(error?.code || '');
    const msg = String(error?.message || error || '');
    if (
      code === 'ERR_REQUEST_CANCELED' ||
      /cancel|취소|ERR_CANCELED/i.test(msg)
    ) {
      const err = new Error('CANCELLED');
      err.code = 'CANCELLED';
      throw err;
    }
    throw error;
  }

  const identityToken = String(credential?.identityToken || '').trim();
  if (!identityToken) {
    const err = new Error('Apple identityToken을 받지 못했습니다.');
    err.code = 'APPLE_TOKEN_MISSING';
    throw err;
  }

  const given = credential?.fullName?.givenName || '';
  const family = credential?.fullName?.familyName || '';
  const name = `${family}${given}`.trim() || '';

  return {
    identityToken,
    appleUserId: String(credential?.user || ''),
    authorizationCode: credential?.authorizationCode || '',
    email: credential?.email || null,
    profile: {
      name,
      appleUserId: String(credential?.user || ''),
      identityToken,
      email: credential?.email || null,
      isVerified: false,
    },
    isMock: false,
  };
}

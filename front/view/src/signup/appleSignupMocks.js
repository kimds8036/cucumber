/**
 * Apple 회원가입 프로필 헬퍼.
 * mock 토큰은 EXPO_PUBLIC_APPLE_AUTH_MOCK=true + __DEV__ 일 때만 appleAuth.js에서 사용.
 */

export const APPLE_MOCK_PROFILE = {
  name: '애플테스트',
  appleUserId: 'apple-mock-user-001',
  identityToken: 'mock-apple-identity-token',
};

export function toAppleIdentityData(profile) {
  return {
    name: profile.name,
    appleUserId: profile.appleUserId,
    identityToken: profile.identityToken,
    isVerified: false,
  };
}

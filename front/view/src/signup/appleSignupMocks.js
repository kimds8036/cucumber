/** Apple 회원가입 mock 프로필 (SDK 연동 전) */

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

/** 카카오 회원가입 mock 프로필 (SDK 연동 전) */

export const KAKAO_MOCK_PROFILE = {
  name: '카카오테스트',
  birthDate: '2010-05-15',
  phone: '01012345678',
};

export const KAKAO_MOCK_PROFILE_UNDER14 = {
  name: '카카오어린이',
  birthDate: '2015-03-01',
  phone: '01098765432',
};

export function toKakaoIdentityData(profile) {
  return {
    name: profile.name,
    birthDate: profile.birthDate,
    phoneNumber: profile.phone,
    isVerified: true,
  };
}

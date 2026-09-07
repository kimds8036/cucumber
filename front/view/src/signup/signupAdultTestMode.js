/**
 * 성인(과연령) 가입 완화 — 팀 내부 테스트용
 * __DEV__ + EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE=true 일 때만
 */
export const ALLOW_ADULT_SIGNUP_IN_DEV =
  typeof __DEV__ !== 'undefined' &&
  __DEV__ &&
  String(process.env.EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE || '')
    .toLowerCase()
    .trim() === 'true';

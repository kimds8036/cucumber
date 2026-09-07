/**
 * 성인(과연령) 가입 완화 — 팀 내부 테스트 전용
 * 명시적으로 EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE=true 이고 __DEV__ 일 때만 ON.
 * 스토어·실사용 빌드에서는 항상 OFF (만 21세 상한 유지).
 */
export const ALLOW_ADULT_SIGNUP_IN_DEV =
  typeof __DEV__ !== 'undefined' &&
  __DEV__ &&
  String(process.env.EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE || '')
    .toLowerCase()
    .trim() === 'true';

/**
 * 성인(과연령) 학적 추론 폴백 — 레거시 Sign.jsx 학교 단계용.
 * 가입 상한 해제는 상시 적용(카카오·애플·전화). 이 플래그는 학년 추정 실패 시
 * 대체값 채우기에만 쓰이며, 명시적으로 EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE=true
 * 이고 __DEV__ 일 때만 ON.
 */
export const ALLOW_ADULT_SIGNUP_IN_DEV =
  typeof __DEV__ !== 'undefined' &&
  __DEV__ &&
  String(process.env.EXPO_PUBLIC_SIGNUP_ADULT_TEST_MODE || '')
    .toLowerCase()
    .trim() === 'true';

/**
 * 성인(과연령) 가입 완화 — 팀 내부 테스트용
 * TEMP: __DEV__ 이면 환경변수 없이 성인 가입 허용 (테스트 끝나면 env 체크로 되돌릴 것)
 */
export const ALLOW_ADULT_SIGNUP_IN_DEV =
  typeof __DEV__ !== 'undefined' && __DEV__;

/**
 * 회원가입 API 개편 중 전용 — 로컬/스테이징에서만 사용.
 * Production 에서는 절대 true 로 두지 마세요.
 *
 * 사용: SIGNUP_REDESIGN_SKIP_VALIDATION=true
 * 복구: front/docs/signup-redesign-validation-checklist.md 참고
 */
export function isSignupRedesignSkipValidation() {
  return (
    String(process.env.SIGNUP_REDESIGN_SKIP_VALIDATION || '')
      .toLowerCase()
      .trim() === 'true'
  );
}

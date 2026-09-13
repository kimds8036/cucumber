// 전화번호 형식 검증 (한국 형식)
export const validatePhone = (phone) => {
  const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
  return phoneRegex.test(phone.replace(/[^0-9]/g, ''));
};

// 사용자명 검증 (영문, 숫자, 언더스코어, 3-20자)
export const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

// 비밀번호 검증 (최소 8자, 영문+숫자 조합)
export const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
};

/**
 * 중·고 학적 추론용 상한(만 나이). 가입 자체는 전 연령 허용
 * (`feat/signup-open-access`)
 */
export const SIGNUP_MAX_AGE = 21;

export function getSignupBirthDateBoundaries(ref = new Date()) {
  const Y = ref.getFullYear();
  return {
    minDate: `${Y - SIGNUP_MAX_AGE}-01-01`,
    tooYoungCutoff: `${Y - 12}-01-01`,
    minYear: Y - SIGNUP_MAX_AGE,
    maxAge: SIGNUP_MAX_AGE,
  };
}

/**
 * 가입 생년월일 검증 — 너무 어린 경우만 거부. 연장(성인)은 허용.
 * @param {string} birthDate YYYY-MM-DD
 * @param {{ allowOverMaxAge?: boolean }} [options] 하위 호환(무시, 항상 연장 허용)
 */
export const validateBirthDate = (birthDate, _options = {}) => {
  const raw = String(birthDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const [y, m, d] = raw.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return false;
  }

  const { tooYoungCutoff } = getSignupBirthDateBoundaries();
  if (raw >= tooYoungCutoff) return false;
  return true;
};

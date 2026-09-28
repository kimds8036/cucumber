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
 * 중·고 학적 추론용 상한(만 나이). 가입 자체는 상한 없음
 */
export const SIGNUP_MAX_AGE = 21;

/** 가입 하한(만 나이) — 초등 입학 연령대 */
export const SIGNUP_MIN_AGE = 6;

export function computeAge(birthDate, ref = new Date()) {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = ref.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    ref.getMonth() < birth.getMonth() ||
    (ref.getMonth() === birth.getMonth() && ref.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function getSignupBirthDateBoundaries(ref = new Date()) {
  const Y = ref.getFullYear();
  return {
    minDate: `${Y - SIGNUP_MAX_AGE}-01-01`,
    tooYoungCutoff: `${Y - SIGNUP_MIN_AGE + 1}-01-01`,
    minYear: Y - SIGNUP_MAX_AGE,
    maxAge: SIGNUP_MAX_AGE,
    minAge: SIGNUP_MIN_AGE,
  };
}

/**
 * 가입 생년월일 검증 — 만 SIGNUP_MIN_AGE 미만만 거부. 성인(연장)은 허용.
 * @param {string} birthDate YYYY-MM-DD
 * @param {{ allowOverMaxAge?: boolean }} [options] 하위 호환(무시)
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

  const age = computeAge(raw);
  if (age == null || age < SIGNUP_MIN_AGE) return false;
  return true;
};

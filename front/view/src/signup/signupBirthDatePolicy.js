/** @typedef {'A'|'B'|'C'|'D'|'invalid'} BirthDateCase */

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

export function isValidBirthDateString(birthDate) {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false;
  const [y, m, d] = birthDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

/** YYYY-MM-DD · YYYYMMDD 등을 비교용 YYYY-MM-DD 로 통일 */
export function normalizeBirthDateForCompare(value) {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return isValidBirthDateString(raw) ? raw : null;
  }
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return isValidBirthDateString(iso) ? iso : null;
}

export function birthDatesMatch(entered, verified) {
  const normalizedEntered = normalizeBirthDateForCompare(entered);
  const normalizedVerified = normalizeBirthDateForCompare(verified);
  if (!normalizedEntered || !normalizedVerified) return false;
  return normalizedEntered === normalizedVerified;
}

function formatDateParts(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * 중·고 학적 추론용 상한(만 나이). 가입 차단에는 쓰지 않음 — 전 연령(상한 없음)
 */
export const SIGNUP_MAX_AGE = 21;

/** 가입 하한(만 나이). 초등 입학 연령대부터 허용. 미만은 D */
export const SIGNUP_MIN_AGE = 6;

export function getBirthDateBoundaries(ref = new Date()) {
  const Y = ref.getFullYear();
  // 학적 추론용 전통 재학 상한 경계(가입 차단 아님)
  const minDate = formatDateParts(Y - SIGNUP_MAX_AGE, 1, 1);
  const maxDate = formatDateParts(Y - 13, 12, 31);
  // 만 SIGNUP_MIN_AGE 미만 차단용 — (Y - MIN_AGE + 1)년 1월 1일 이후 출생은 대체로 미달
  const tooYoungCutoff = formatDateParts(Y - SIGNUP_MIN_AGE + 1, 1, 1);
  return {
    Y,
    minDate,
    maxDate,
    tooYoungCutoff,
    minYear: Y - SIGNUP_MAX_AGE,
    maxYear: Y - SIGNUP_MIN_AGE,
    maxAge: SIGNUP_MAX_AGE,
    minAge: SIGNUP_MIN_AGE,
  };
}

/**
 * 생년월일 가입 케이스 판정
 * A: 전통 재학 연령 초과(가입 허용)
 * B: 만14+ / C: 만14미만(보호자) / D: 만 SIGNUP_MIN_AGE 미만(가입 불가)
 * @returns {BirthDateCase}
 */
export function classifyBirthDateCase(birthDate, ref = new Date()) {
  if (!isValidBirthDateString(birthDate)) return 'invalid';

  const age = computeAge(birthDate, ref);
  if (age == null) return 'invalid';
  // 미래 생년월일·하한 미만
  if (age < SIGNUP_MIN_AGE) return 'D';

  const { minDate } = getBirthDateBoundaries(ref);
  if (birthDate < minDate) return 'A';

  if (age < 14) return 'C';
  return 'B';
}

export const AGE_INELIGIBLE_MESSAGE =
  '해당 연령으로는 Youth Paper를 이용할 수 없습니다.';

export function getTooOldEligibilityMessage(_ref = new Date()) {
  return AGE_INELIGIBLE_MESSAGE;
}

export function getTooYoungEligibilityMessage(_ref = new Date()) {
  return AGE_INELIGIBLE_MESSAGE;
}

export function getIneligibleAgeDetailMessage(birthCase, ref = new Date()) {
  if (birthCase === 'D') return AGE_INELIGIBLE_MESSAGE;
  return '';
}

export function getTooOldAlertMessage(ref = new Date()) {
  return AGE_INELIGIBLE_MESSAGE;
}

export function getTooYoungAlertMessage(ref = new Date()) {
  return AGE_INELIGIBLE_MESSAGE;
}

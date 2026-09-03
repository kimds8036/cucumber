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

/** 가입 가능 생년월일 경계 (매년 롤링) */
export function getBirthDateBoundaries(ref = new Date()) {
  const Y = ref.getFullYear();
  const minDate = formatDateParts(Y - 18, 1, 1);
  const maxDate = formatDateParts(Y - 13, 12, 31);
  const tooYoungCutoff = formatDateParts(Y - 12, 1, 1);
  return {
    Y,
    minDate,
    maxDate,
    tooYoungCutoff,
    minYear: Y - 18,
    maxYear: Y - 13,
  };
}

/**
 * 생년월일 가입 케이스 판정
 * A: 너무 연장 / B: 만14+ / C: 만14미만(보호자) / D: 너무 어림 / invalid
 * @returns {BirthDateCase}
 */
export function classifyBirthDateCase(birthDate, ref = new Date()) {
  if (!isValidBirthDateString(birthDate)) return 'invalid';

  const { minDate, tooYoungCutoff } = getBirthDateBoundaries(ref);

  if (birthDate < minDate) return 'A';
  if (birthDate >= tooYoungCutoff) return 'D';

  const age = computeAge(birthDate, ref);
  if (age == null) return 'invalid';
  if (age < 14) return 'C';
  return 'B';
}

export function getTooOldAlertMessage(ref = new Date()) {
  const { minYear } = getBirthDateBoundaries(ref);
  return (
    `Youth Paper는 중고등학생 커뮤니티로,\n${minYear}년 01월 01일 이후 출생자부터 가입할 수 있어요.\n` +
    '현재 연령으로는 서비스를 이용하실 수 없습니다.'
  );
}

export function getTooYoungAlertMessage(ref = new Date()) {
  const { maxYear } = getBirthDateBoundaries(ref);
  return (
    `Youth Paper는 중고등학생 커뮤니티로, \n${maxYear}년 12월 31일 이전 출생자까지만 가입할 수 있어요.\n` +
    '현재 연령으로는 서비스를 이용하실 수 없습니다.'
  );
}

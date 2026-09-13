/**
 * 백엔드 signupEnrollment.js 와 동일 규칙 유지
 * 초등·중·고 학적 추론 (가입 상한 만 21은 high 클램프용)
 */
import { SIGNUP_MAX_AGE } from './signupBirthDatePolicy';

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

/** @returns {'elementary'|'middle'|'high'|null} */
export function inferExpectedSchoolLevel(birthDate, ref = new Date()) {
  const age = computeAge(birthDate, ref);
  if (age == null) return null;
  if (age >= 6 && age <= 11) return 'elementary';
  if (age >= 12 && age <= 15) return 'middle';
  if (age >= 16 && age <= SIGNUP_MAX_AGE) return 'high';
  return null;
}

export function inferGradeFromBirthDate(birthDate, schoolLevel, ref = new Date()) {
  const age = computeAge(birthDate, ref);
  if (age == null || !schoolLevel) return null;
  if (schoolLevel === 'elementary') {
    const grade = age - 5;
    return Math.min(6, Math.max(1, grade));
  }
  if (schoolLevel === 'middle') {
    const grade = age - 11;
    return Math.min(3, Math.max(1, grade));
  }
  if (schoolLevel === 'high') {
    const grade = age - 15;
    return Math.min(3, Math.max(1, grade));
  }
  return null;
}

export function pickRandomProfileColorId() {
  return Math.floor(Math.random() * 4) + 1;
}

export function buildEnrollmentFromBirthDate(birthDate, schoolLevel) {
  const level = schoolLevel || inferExpectedSchoolLevel(birthDate);
  const grade = inferGradeFromBirthDate(birthDate, level);
  return { schoolLevel: level, grade };
}

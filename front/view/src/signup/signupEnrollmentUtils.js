/**
 * 백엔드 signupEnrollment.js 와 동일 규칙 유지
 * 가입 상한(만 21)과 OCR 학교급 추론을 맞춘다.
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

export function inferExpectedSchoolLevel(birthDate, ref = new Date()) {
  const age = computeAge(birthDate, ref);
  if (age == null) return null;
  if (age >= 12 && age <= 15) return 'middle';
  // 고등·가입 상한(만 21)까지 high 로 취급 (19~21은 3학년으로 클램프)
  if (age >= 16 && age <= SIGNUP_MAX_AGE) return 'high';
  return null;
}

export function inferGradeFromBirthDate(birthDate, schoolLevel, ref = new Date()) {
  const age = computeAge(birthDate, ref);
  if (age == null || !schoolLevel) return null;
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

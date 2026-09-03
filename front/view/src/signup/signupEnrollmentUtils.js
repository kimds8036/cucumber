/**
 * 백엔드 signupEnrollment.js 와 동일 규칙 유지
 */

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
  if (age >= 16 && age <= 19) return 'high';
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

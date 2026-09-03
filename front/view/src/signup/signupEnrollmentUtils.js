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

export function getAcademicYearStart(ref = new Date()) {
  return ref.getMonth() >= 2 ? ref.getFullYear() : ref.getFullYear() - 1;
}

export function inferGraduationYear(birthDate, schoolLevel, grade, ref = new Date()) {
  const g = Number(grade);
  if (!schoolLevel || !Number.isFinite(g) || g < 1 || g > 3) return null;
  const academicStart = getAcademicYearStart(ref);
  const yearsLeft = 3 - g + 1;
  return academicStart + yearsLeft;
}

export function pickRandomProfileColorId() {
  return Math.floor(Math.random() * 4) + 1;
}

export function buildEnrollmentFromBirthDate(birthDate, schoolLevel) {
  const level = schoolLevel || inferExpectedSchoolLevel(birthDate);
  const grade = inferGradeFromBirthDate(birthDate, level);
  const graduationYear = inferGraduationYear(birthDate, level, grade);
  return { schoolLevel: level, grade, graduationYear };
}

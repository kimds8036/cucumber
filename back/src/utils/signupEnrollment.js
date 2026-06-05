/**
 * 생년월일·학교급 기반 재학 정보 유추 (한국 중·고, 3월 학년도 기준 단순 모델).
 * 늦·조기 진학 등 예외는 앱 안내 문구 + 마이페이지 문의로 처리.
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

/** @returns {'middle'|'high'|null} */
export function inferExpectedSchoolLevel(birthDate, ref = new Date()) {
  const age = computeAge(birthDate, ref);
  if (age == null) return null;
  if (age < 14) return null;
  if (age >= 12 && age <= 15) return 'middle';
  if (age >= 16 && age <= 19) return 'high';
  return null;
}

/**
 * 생년월일·학교급으로 학년(1~3) 유추.
 * middle: age 12→1 … 15→3 / high: age 16→1 … 19→3
 */
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

/** 한국식 학년도 시작 연도 (3월 기준) */
export function getAcademicYearStart(ref = new Date()) {
  return ref.getMonth() >= 2 ? ref.getFullYear() : ref.getFullYear() - 1;
}

/** DB 필수 graduation_year — 해당 학교급 졸업 예정 연도(단순 추정) */
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

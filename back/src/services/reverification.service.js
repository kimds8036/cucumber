import {
  computeAge,
  getAcademicYearStart,
  inferExpectedSchoolLevel,
  inferGradeFromBirthDate,
} from '../utils/signupEnrollment.js';

const KST = 'Asia/Seoul';

/** @returns {Date} KST 시각을 나타내는 Date (로컬 Date 메서드로 시·분 읽기 가능) */
export function getKstNow(ref = new Date()) {
  return new Date(ref.toLocaleString('en-US', { timeZone: KST }));
}

export function formatKstDateYmd(ref = new Date()) {
  const kst = getKstNow(ref);
  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, '0');
  const d = String(kst.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 만 나이 기준 성인 (기본 19세) */
export function isLegalAdult(birthDate, ref = new Date()) {
  const age = computeAge(birthDate, ref);
  const threshold = Number(process.env.ADULT_AGE_THRESHOLD || 19);
  return age != null && age >= threshold;
}

/**
 * 생년월일·학교급으로 기대 학년 추정 (grade_exception=false 일 때 참고)
 */
export function getExpectedGrade(birthDate, schoolLevel, ref = new Date()) {
  return inferGradeFromBirthDate(birthDate, schoolLevel, ref);
}

export function getExpectedSchoolLevel(birthDate, ref = new Date()) {
  return inferExpectedSchoolLevel(birthDate, ref);
}

/** 고3 졸업 예정 — graduation_year가 올해 이하이고 3/1 이후 */
export function shouldGraduateBlock({ graduationYear, grade, ref = new Date() }) {
  const kst = getKstNow(ref);
  const month = kst.getMonth();
  const day = kst.getDate();
  const inMarchOrLater = month > 2 || (month === 2 && day >= 1);
  if (!inMarchOrLater) return false;
  const academicYear = getAcademicYearStart(kst);
  const gy = Number(graduationYear);
  const g = Number(grade);
  return Number.isFinite(gy) && gy <= academicYear && g >= 3;
}

export function isReverificationGracePeriod(ref = new Date()) {
  const kst = getKstNow(ref);
  if (kst.getMonth() !== 2) return false;
  const day = kst.getDate();
  return day >= 1 && day <= 7;
}

export function getReverificationDeadlineForYear(year) {
  return `${year}-03-08`;
}

export const BLOCKED_REVERIFICATION_STATUSES = new Set([
  'restricted',
  'graduated_blocked',
  'adult_blocked',
]);

export function getReverificationBlockCode(status) {
  if (status === 'graduated_blocked') return 'GRADUATED_BLOCKED';
  if (status === 'adult_blocked') return 'ADULT_BLOCKED';
  if (status === 'restricted') return 'REVERIFICATION_RESTRICTED';
  return null;
}

/**
 * 중→고 전환 시 previous_school_id 설정 여부 판단 (학교 ID 변경)
 */
export function shouldSetPreviousSchool(oldSchoolId, newSchoolId) {
  if (!oldSchoolId || !newSchoolId) return false;
  return String(oldSchoolId) !== String(newSchoolId);
}

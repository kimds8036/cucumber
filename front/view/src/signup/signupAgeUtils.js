import { computeAge } from './signupBirthDatePolicy';

/** @returns {'middle'|'high'|null} */
export function inferExpectedSchoolLevel(birthDate) {
  const age = computeAge(birthDate);
  if (age == null) return null;
  if (age >= 12 && age <= 15) return 'middle';
  if (age >= 16 && age <= 19) return 'high';
  return null;
}

/** @returns {'ok'|'under14'|'ineligible'|'invalid'} */
export function getSignupEligibility(birthDate) {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return 'invalid';
  const age = computeAge(birthDate);
  if (age == null) return 'invalid';
  if (age < 14) return 'under14';
  if (inferExpectedSchoolLevel(birthDate) == null) return 'ineligible';
  return 'ok';
}

export { computeAge } from './signupBirthDatePolicy';

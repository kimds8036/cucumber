import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyBirthDateCase,
  computeAge,
  getBirthDateBoundaries,
  isValidBirthDateString,
  SIGNUP_MAX_AGE,
  SIGNUP_MIN_AGE,
} from './signupBirthDatePolicy.js';

const REF_2026_07_08 = new Date(2026, 6, 8);

test('SIGNUP_MIN_AGE is 6 (elementary)', () => {
  assert.equal(SIGNUP_MIN_AGE, 6);
});

test('SIGNUP_MAX_AGE is 21 (enrollment bound)', () => {
  assert.equal(SIGNUP_MAX_AGE, 21);
});

test('getBirthDateBoundaries rolls yearly', () => {
  const b = getBirthDateBoundaries(REF_2026_07_08);
  assert.equal(b.minDate, '2005-01-01');
  assert.equal(b.tooYoungCutoff, '2021-01-01');
  assert.equal(b.minAge, 6);
  assert.equal(b.maxAge, 21);
});

test('classifyBirthDateCase — 2026-07-08 기준', () => {
  assert.equal(classifyBirthDateCase('2004-12-31', REF_2026_07_08), 'A');
  assert.equal(classifyBirthDateCase('2005-01-01', REF_2026_07_08), 'B');
  assert.equal(classifyBirthDateCase('2010-05-15', REF_2026_07_08), 'B');
  // 만 13세 → 보호자(C)
  assert.equal(classifyBirthDateCase('2013-01-01', REF_2026_07_08), 'C');
  // 초등(만 10세) → 보호자(C), 가입 가능
  assert.equal(classifyBirthDateCase('2016-03-01', REF_2026_07_08), 'C');
  // 만 6세 당일 허용
  assert.equal(classifyBirthDateCase('2020-07-08', REF_2026_07_08), 'C');
  // 만 5세 → D
  assert.equal(classifyBirthDateCase('2021-07-08', REF_2026_07_08), 'D');
  assert.equal(classifyBirthDateCase('2026-02-30', REF_2026_07_08), 'invalid');
  assert.equal(classifyBirthDateCase('', REF_2026_07_08), 'invalid');
});

test('isValidBirthDateString rejects impossible dates', () => {
  assert.equal(isValidBirthDateString('2010-02-29'), false);
  assert.equal(isValidBirthDateString('2012-02-29'), true);
});

test('classifyBirthDateCase — 2027 롤링', () => {
  const ref = new Date(2027, 0, 1);
  assert.equal(classifyBirthDateCase('2005-12-31', ref), 'A');
  assert.equal(classifyBirthDateCase('2006-01-01', ref), 'B');
  assert.equal(classifyBirthDateCase('2014-12-31', ref), 'C');
  assert.equal(classifyBirthDateCase('2021-01-01', ref), 'C');
  assert.equal(classifyBirthDateCase('2022-01-01', ref), 'D');
});

test('computeAge smoke', () => {
  assert.equal(computeAge('2005-01-01', REF_2026_07_08), 21);
  assert.equal(computeAge('2016-07-08', REF_2026_07_08), 10);
});

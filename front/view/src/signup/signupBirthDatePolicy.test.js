import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyBirthDateCase,
  computeAge,
  getBirthDateBoundaries,
  isValidBirthDateString,
} from './signupBirthDatePolicy.js';

const REF_2026_07_08 = new Date(2026, 6, 8);

test('getBirthDateBoundaries rolls yearly', () => {
  const b = getBirthDateBoundaries(REF_2026_07_08);
  assert.equal(b.minDate, '2008-01-01');
  assert.equal(b.maxDate, '2013-12-31');
  assert.equal(b.tooYoungCutoff, '2014-01-01');
});

test('classifyBirthDateCase — 2026-07-08 기준', () => {
  assert.equal(classifyBirthDateCase('2007-12-31', REF_2026_07_08), 'A');
  assert.equal(classifyBirthDateCase('2008-01-01', REF_2026_07_08), 'B');
  assert.equal(classifyBirthDateCase('2010-05-15', REF_2026_07_08), 'B');
  assert.equal(classifyBirthDateCase('2013-01-01', REF_2026_07_08), 'C');
  assert.equal(classifyBirthDateCase('2014-01-01', REF_2026_07_08), 'D');
  assert.equal(classifyBirthDateCase('2026-02-30', REF_2026_07_08), 'invalid');
  assert.equal(classifyBirthDateCase('', REF_2026_07_08), 'invalid');
});

test('isValidBirthDateString rejects impossible dates', () => {
  assert.equal(isValidBirthDateString('2010-02-29'), false);
  assert.equal(isValidBirthDateString('2012-02-29'), true);
});

test('classifyBirthDateCase — 2027 롤링', () => {
  const ref = new Date(2027, 0, 1);
  assert.equal(classifyBirthDateCase('2008-12-31', ref), 'A');
  assert.equal(classifyBirthDateCase('2009-01-01', ref), 'B');
  assert.equal(classifyBirthDateCase('2012-06-01', ref), 'B');
  assert.equal(classifyBirthDateCase('2014-12-31', ref), 'C');
  assert.equal(classifyBirthDateCase('2015-01-01', ref), 'D');
});

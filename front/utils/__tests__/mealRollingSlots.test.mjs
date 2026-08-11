import assert from 'node:assert/strict';
import {
  buildRollingMealSlots,
  slotToWidgetMealItem,
} from '../mealRollingSlots.js';

/** 고정 "현재 시각"으로 검증 — Date를 KST처럼 쓰려면 로컬이 KST라는 가정 대신 getKstParts 우회가 어려우므로
 *  mealsByDate만으로 날짜 순회·placeholder·패딩을 검증하고,
 *  마감은 untilHour와 비교되는 hour를 조작하기 위해 opts.now에 실제 Date를 넣는다.
 */

// 2026-08-11 08:00 KST ≈ 2026-08-10 23:00 UTC
const aug11_08 = new Date('2026-08-10T23:00:00.000Z');
// 2026-08-11 14:00 KST
const aug11_14 = new Date('2026-08-11T05:00:00.000Z');
// 2026-08-11 20:00 KST
const aug11_20 = new Date('2026-08-11T11:00:00.000Z');

const mealsByDate = {
  '20260811': {
    meals: {
      lunch: ['중식A'],
      dinner: ['석식A'],
    },
  },
  // 12일: 데이터 없음
  '20260813': {
    meals: {
      breakfast: ['조식B'],
    },
  },
  '20260814': {
    meals: {
      lunch: ['중식C'],
      dinner: ['석식C'],
    },
  },
};

const s0800 = buildRollingMealSlots(mealsByDate, { now: aug11_08 });
assert.equal(s0800.length, 3);
assert.deepEqual(
  s0800.map((s) => [s.ymd, s.mealType, s.isPlaceholder]),
  [
    ['20260811', '중식', false],
    ['20260811', '석식', false],
    ['20260812', '정보 없음', true],
  ],
);

const s1400 = buildRollingMealSlots(mealsByDate, { now: aug11_14 });
assert.deepEqual(
  s1400.map((s) => [s.ymd, s.mealType, s.isPlaceholder]),
  [
    ['20260811', '석식', false],
    ['20260812', '정보 없음', true],
    ['20260813', '조식', false],
  ],
);

const s2000 = buildRollingMealSlots(mealsByDate, { now: aug11_20 });
assert.deepEqual(
  s2000.map((s) => [s.ymd, s.mealType, s.isPlaceholder]),
  [
    ['20260812', '정보 없음', true],
    ['20260813', '조식', false],
    ['20260814', '중식', false],
  ],
);

assert.equal(slotToWidgetMealItem(s0800[0]).mealType, 'lunch');
assert.equal(slotToWidgetMealItem(s0800[2]).mealType, null);

console.log('mealRollingSlots tests: ok');

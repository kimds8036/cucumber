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
// 2026-08-10 08:00 KST
const aug10_08 = new Date('2026-08-09T23:00:00.000Z');
// 2026-08-12 14:00 KST (중식 마감, 석식 남음)
const aug12_14 = new Date('2026-08-12T05:00:00.000Z');
// 2026-08-12 20:00 KST (모든 끼니 마감)
const aug12_20 = new Date('2026-08-12T11:00:00.000Z');
// 2026-08-15 08:00 KST (토요일)
const aug15_sat_08 = new Date('2026-08-14T23:00:00.000Z');

function schoolDay(meals) {
  return { meals, schoolDay: true, schoolDayReason: null };
}

function day(reason, meals = {}) {
  return { meals, schoolDay: false, schoolDayReason: reason };
}

const mealsByDate = {
  '20260811': schoolDay({
    lunch: ['중식A'],
    dinner: ['석식A'],
  }),
  // 12일: 데이터 없음 (등교일)
  '20260812': schoolDay({}),
  '20260813': schoolDay({
    breakfast: ['조식B'],
  }),
  '20260814': schoolDay({
    lunch: ['중식C'],
    dinner: ['석식C'],
  }),
};

const s0800 = buildRollingMealSlots(mealsByDate, { now: aug11_08 });
assert.equal(s0800.mode, 'slots');
assert.equal(s0800.bannerText, null);
assert.equal(s0800.slots.length, 3);
assert.deepEqual(
  s0800.slots.map((s) => [s.ymd, s.mealType, s.isPlaceholder, s.type]),
  [
    ['20260811', '중식', false, 'meal'],
    ['20260811', '석식', false, 'meal'],
    ['20260812', '정보 없음', true, 'placeholder'],
  ],
);

const s1400 = buildRollingMealSlots(mealsByDate, { now: aug11_14 });
assert.deepEqual(
  s1400.slots.map((s) => [s.ymd, s.mealType, s.isPlaceholder]),
  [
    ['20260811', '석식', false],
    ['20260812', '정보 없음', true],
    ['20260813', '조식', false],
  ],
);

const s2000 = buildRollingMealSlots(mealsByDate, { now: aug11_20 });
assert.deepEqual(
  s2000.slots.map((s) => [s.ymd, s.mealType, s.isPlaceholder]),
  [
    ['20260812', '정보 없음', true],
    ['20260813', '조식', false],
    ['20260814', '중식', false],
  ],
);

assert.equal(slotToWidgetMealItem(s0800.slots[0]).mealType, 'lunch');
assert.equal(slotToWidgetMealItem(s0800.slots[0]).isVacation, false);
assert.equal(slotToWidgetMealItem(s0800.slots[2]).mealType, null);

// 11일만 공휴일, 10/12일 급식 있음, 13일부터 방학
const holidayThenVacation = {
  '20260810': schoolDay({ lunch: ['10일중식'] }),
  '20260811': day('HOLIDAY'),
  '20260812': schoolDay({ lunch: ['12일중식'] }),
  '20260813': day('VACATION'),
};
const holidaySlots = buildRollingMealSlots(holidayThenVacation, { now: aug10_08 });
assert.equal(holidaySlots.mode, 'slots');
assert.deepEqual(
  holidaySlots.slots.map((s) => [s.type, s.ymd, s.mealType]),
  [
    ['meal', '20260810', '중식'],
    ['meal', '20260812', '중식'],
    ['vacation', '', '방학'],
  ],
);

// 12일 석식만 남고 13일부터 방학
const dinnerThenVacation = {
  '20260812': schoolDay({
    lunch: ['중식'],
    dinner: ['석식'],
  }),
  '20260813': day('VACATION'),
};
const dinnerVac = buildRollingMealSlots(dinnerThenVacation, { now: aug12_14 });
assert.equal(dinnerVac.mode, 'slots');
assert.deepEqual(
  dinnerVac.slots.map((s) => s.type),
  ['meal', 'vacation', 'vacation'],
);
assert.equal(dinnerVac.slots[0].ymd, '20260812');
assert.equal(dinnerVac.slots[0].mealType, '석식');

// 오늘부터 바로 방학
const fromTodayVacation = {
  '20260811': day('VACATION'),
};
const todayVac = buildRollingMealSlots(fromTodayVacation, { now: aug11_08 });
assert.equal(todayVac.mode, 'banner');
assert.deepEqual(todayVac.slots, []);
assert.equal(todayVac.bannerText, '당분간 급식 정보가 없어요');

assert.equal(
  slotToWidgetMealItem({ type: 'vacation-banner', text: todayVac.bannerText }).isVacation,
  true,
);
assert.equal(slotToWidgetMealItem({ type: 'vacation' }).mealType, 'vacation');

// 오늘 모든 끼니 마감 + 내일부터 방학
const expiredThenVacation = {
  '20260812': schoolDay({
    breakfast: ['조식'],
    lunch: ['중식'],
    dinner: ['석식'],
  }),
  '20260813': day('VACATION'),
};
const expiredVac = buildRollingMealSlots(expiredThenVacation, { now: aug12_20 });
assert.equal(expiredVac.mode, 'banner');
assert.equal(expiredVac.bannerText, '당분간 급식 정보가 없어요');

// 토·일 + 월요일부터 방학
const weekendThenVacation = {
  '20260815': day('WEEKEND'),
  '20260816': day('WEEKEND'),
  '20260817': day('VACATION'),
};
const weekendVac = buildRollingMealSlots(weekendThenVacation, { now: aug15_sat_08 });
assert.equal(weekendVac.mode, 'banner');
assert.deepEqual(weekendVac.slots, []);

console.log('mealRollingSlots tests: ok');

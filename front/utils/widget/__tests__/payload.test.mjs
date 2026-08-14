import assert from 'node:assert/strict';
import {
  flatTimetableToWeek,
  buildTimetableWidgetPayload,
} from '../timetablePayload.js';
import { buildMealWidgetPayload } from '../mealPayload.js';

const week = flatTimetableToWeek({
  '월-1': '수학',
  '월-2': '영어',
  '화-3': '체육',
  '금-7': '자율',
  '토-1': '무시',
  '월-x': '무시',
});

assert.equal(week.length, 5);
assert.deepEqual(week[0], {
  dayLabel: '월',
  periods: [
    { period: 1, subject: '수학' },
    { period: 2, subject: '영어' },
  ],
});
assert.deepEqual(week[1].periods, [{ period: 3, subject: '체육' }]);
assert.deepEqual(week[4].periods, [{ period: 7, subject: '자율' }]);
assert.deepEqual(week[2].periods, []);

const emptyPayload = buildTimetableWidgetPayload(null, {
  generatedAt: '2026-08-03T00:00:00.000Z',
  now: new Date('2026-08-03T01:00:00+09:00'), // 월요일
});
assert.equal(emptyPayload.empty, true);
assert.equal(emptyPayload.todayDayLabel, '월');
assert.equal(emptyPayload.week.length, 5);

const weekendPayload = buildTimetableWidgetPayload(
  { '월-1': '수학' },
  {
    generatedAt: '2026-08-01T00:00:00.000Z',
    now: new Date('2026-08-01T12:00:00+09:00'), // 토요일
  },
);
assert.equal(weekendPayload.todayDayLabel, null);
assert.equal(weekendPayload.empty, false);

const meal = buildMealWidgetPayload([
  {
    ymd: '20260804',
    mealCode: '2',
    mealType: 'lunch',
    menus: ['밥', '국'],
    calories: '800 Kcal',
  },
  { ymd: '20260804', mealCode: '3', mealType: 'dinner', menus: ['면'] },
]);
assert.equal(meal.ymd, '20260804');
assert.equal(meal.mealType, 'lunch');
assert.deepEqual(meal.menus, ['밥', '국']);
assert.ok(meal.syncedAt);
assert.equal(buildMealWidgetPayload([]).mealType, null);

const padded = buildMealWidgetPayload([
  { ymd: '20260804', mealType: '급식', menus: [] },
]);
assert.equal(padded.mealType, null);
assert.deepEqual(padded.menus, []);
assert.equal(padded.isVacation, false);

const vacation = buildMealWidgetPayload([
  { ymd: '', mealType: 'vacation', menus: [], isVacation: true, bannerText: '당분간 급식 정보가 없어요' },
]);
assert.equal(vacation.isVacation, true);
assert.equal(vacation.mealType, 'vacation');
assert.equal(vacation.bannerText, '당분간 급식 정보가 없어요');

console.log('widget payload tests: ok');

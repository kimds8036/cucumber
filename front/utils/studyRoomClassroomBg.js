/** 스터디룸 교실 배경 — 로컬 시각 구간 [start, end) */

const CLASSROOM_1 = require('../assets/timer_ani/classroom1.png'); // 06–17
const CLASSROOM_2 = require('../assets/timer_ani/classroom2.png'); // 17–22
const CLASSROOM_3 = require('../assets/timer_ani/classroom3.png'); // 22–06

/**
 * @param {Date} [now]
 * @returns {number} require() 이미지 소스
 */
export function getClassroomBgForDate(now = new Date()) {
  const h = now.getHours();
  // 06:00–17:00 → classroom1
  if (h >= 6 && h < 17) return CLASSROOM_1;
  // 17:00–22:00 → classroom2
  if (h >= 17 && h < 22) return CLASSROOM_2;
  // 22:00–06:00 → classroom3
  return CLASSROOM_3;
}

/** 배경 구간이 바뀌는 다음 Date (폴링 보완용) */
export function nextClassroomBgChangeAt(now = new Date()) {
  const boundaries = [6, 17, 22, 30]; // 30 = 다음날 06시
  const h = now.getHours();
  const nextH = boundaries.find((b) => b > h) ?? 30;
  const d = new Date(now);
  if (nextH >= 24) {
    d.setDate(d.getDate() + 1);
    d.setHours(nextH - 24, 0, 0, 0);
  } else {
    d.setHours(nextH, 0, 0, 0);
  }
  return d;
}

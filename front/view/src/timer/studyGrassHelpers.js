/**
 * 공부 잔디 — 색 단계 · 시간 표시
 */
import { colors } from '../../../styles/colors';

/** 시간(h) 이상이면 해당 색. 1분 미만은 기록 없음(흰색) */
export const GRASS_LEVELS = [
  { minHours: 12, label: '12+', color: colors.primaryDark },
  { minHours: 10, label: '10+', color: colors.primaryMid },
  { minHours: 7, label: '7+', color: colors.primary },
  { minHours: 4, label: '4+', color: colors.primaryLight5 },
  { minHours: 0, label: '0+', color: colors.primaryLight3 },
];

/** 범례용 — 0+ → 12+ 순서 */
export const GRASS_LEGEND = [...GRASS_LEVELS].reverse();

export const GRASS_MIN_RECORD_SECONDS = 60;

export function hasGrassRecord(seconds) {
  return typeof seconds === 'number' && seconds >= GRASS_MIN_RECORD_SECONDS;
}

/** 칸 배경색 — 기록 없으면 null */
export function getGrassColor(seconds) {
  if (!hasGrassRecord(seconds)) return null;
  const hours = seconds / 3600;
  const level = GRASS_LEVELS.find((l) => hours >= l.minHours);
  return level ? level.color : null;
}

/** 날짜 칸용 `04:00`(시:분) — 기록 없으면 빈 문자열 */
export function formatGrassDuration(seconds) {
  if (!hasGrassRecord(seconds)) return '';
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 기록 시트 제목용 `4h 00m` — 기록 없으면 빈 문자열 */
export function formatGrassDurationHm(seconds) {
  if (!hasGrassRecord(seconds)) return '';
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

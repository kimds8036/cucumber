// 공부 잔디 Redis 키 TTL — 학기 단위 조회·폴백 캐시에 맞춰 기본 30일 (배치/API 동일)
const DEFAULT_STUDY_GRASS_REDIS_TTL_SECONDS = 60 * 60 * 24 * 30;

const parsed = Number(process.env.STUDY_GRASS_REDIS_TTL_SECONDS);
export const STUDY_GRASS_REDIS_TTL_SECONDS =
  Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : DEFAULT_STUDY_GRASS_REDIS_TTL_SECONDS;

/**
 * 공부잔디 API에 내려주는 "평균 공부시간(ms)" 완화 계수.
 * 계산: (총 공부시간 / 학생수) × 이 값.
 * - 너무 빡세면 올리기 (예: 2)
 * - 너무 쉬우면 내리기 (예: 1)
 * - 환경변수 STUDY_GRASS_AVG_MULTIPLIER 로 런타임 변경 가능 (숫자, 0보다 커야 함)
 */
const DEFAULT_STUDY_GRASS_AVG_MULTIPLIER = 1.5;
const avgMultParsed = Number(process.env.STUDY_GRASS_AVG_MULTIPLIER);
export const STUDY_GRASS_AVG_MULTIPLIER =
  Number.isFinite(avgMultParsed) && avgMultParsed > 0
    ? avgMultParsed
    : DEFAULT_STUDY_GRASS_AVG_MULTIPLIER;

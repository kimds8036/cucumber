// 공부 잔디 Redis 키 TTL — 학기 단위 조회·폴백 캐시에 맞춰 기본 30일 (배치/API 동일)
const DEFAULT_STUDY_GRASS_REDIS_TTL_SECONDS = 60 * 60 * 24 * 30;

const parsed = Number(process.env.STUDY_GRASS_REDIS_TTL_SECONDS);
export const STUDY_GRASS_REDIS_TTL_SECONDS =
  Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : DEFAULT_STUDY_GRASS_REDIS_TTL_SECONDS;

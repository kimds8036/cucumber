import { RedisStore } from 'rate-limit-redis';
import {
  getRedisClient,
  isRedisConfigured,
} from '../services/batchRedis.service.js';

/**
 * Redis rate limit store 사용 여부.
 * - RATE_LIMIT_REDIS_ENABLED=false → 항상 in-memory
 * - RATE_LIMIT_REDIS_ENABLED=true → 항상 Redis (로컬 Redis 필요)
 * - 미설정 → REDIS_URL / Railway REDIS_HOST 등이 있으면 Redis, 아니면 in-memory
 */
export function isRedisRateLimitEnabled() {
  const flag = process.env.RATE_LIMIT_REDIS_ENABLED;
  if (flag === 'false') return false;
  if (flag === 'true') return true;
  return isRedisConfigured();
}

/**
 * express-rate-limit용 RedisStore (기존 ioredis 싱글톤 재사용).
 * @param {string} prefix - Redis 키 prefix (예: signup-phone)
 * @returns {RedisStore | undefined}
 */
export function createRedisRateLimitStore(prefix) {
  if (!isRedisRateLimitEnabled()) return undefined;
  const client = getRedisClient();
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (command, ...args) => client.call(command, ...args),
  });
}

export function logRateLimitStoreMode() {
  const mode = isRedisRateLimitEnabled() ? 'redis' : 'memory';
  console.log(`[RateLimit] store=${mode}`);
}

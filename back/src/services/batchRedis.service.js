import Redis from 'ioredis';

const redisCommonOptions = {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
};

function resolveRedisHost() {
  return process.env.REDIS_HOST || process.env.REDISHOST || '127.0.0.1';
}

function resolveRedisPort() {
  return parseInt(
    process.env.REDIS_PORT || process.env.REDISPORT || '6379',
    10,
  );
}

function resolveRedisPassword() {
  return process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || undefined;
}

const redisUrl =
  process.env.REDIS_URL || process.env.REDIS_PUBLIC_URL || undefined;

const redis = redisUrl
  ? new Redis(redisUrl, redisCommonOptions)
  : new Redis({
      host: resolveRedisHost(),
      port: resolveRedisPort(),
      password: resolveRedisPassword(),
      ...redisCommonOptions,
    });

/** Railway 등에서 Redis가 명시적으로 설정됐는지 (로컬 기본 127.0.0.1 단독은 false) */
export function isRedisConfigured() {
  if (redisUrl) return true;
  if (resolveRedisPassword()) return true;
  const host = resolveRedisHost();
  return Boolean(host && host !== '127.0.0.1' && host !== 'localhost');
}

/** rate-limit-redis 등 동기 초기화용 싱글톤 클라이언트 */
export function getRedisClient() {
  return redis;
}

async function ensureConnected() {
  if (redis.status === 'ready') return;
  if (redis.status === 'connecting') return;
  await redis.connect();
}

export async function getBatchRedis() {
  await ensureConnected();
  return redis;
}

export async function closeBatchRedis() {
  try {
    if (redis.status === 'ready' || redis.status === 'connecting') {
      await redis.quit();
    }
  } catch (error) {
    console.error('[BatchRedis] Redis 종료 실패', error.message);
  }
}

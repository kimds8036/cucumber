import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});

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

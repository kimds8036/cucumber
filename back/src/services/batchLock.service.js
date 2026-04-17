import { closeBatchRedis, getBatchRedis } from './batchRedis.service.js';

export async function acquireBatchLock(lockKey, ttlSeconds = 300) {
  try {
    const redis = await getBatchRedis();
    const owner = `${process.pid}:${Date.now()}`;
    const result = await redis.set(lockKey, owner, 'EX', ttlSeconds, 'NX');
    return { acquired: result === 'OK', owner };
  } catch (error) {
    console.error(`[BatchLock] lock 획득 실패 key=${lockKey}`, error.message);
    return { acquired: false, owner: null };
  }
}

export async function releaseBatchLock(lockKey, owner) {
  if (!owner) return;

  const releaseScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  try {
    const redis = await getBatchRedis();
    await redis.eval(releaseScript, 1, lockKey, owner);
  } catch (error) {
    console.error(`[BatchLock] lock 해제 실패 key=${lockKey}`, error.message);
  }
}

export async function closeBatchLockRedis() {
  await closeBatchRedis();
}

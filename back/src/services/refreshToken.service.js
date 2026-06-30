import crypto from 'crypto';
import { getBatchRedis, isRedisConfigured } from './batchRedis.service.js';

const REFRESH_PREFIX = 'refresh:';
const DEFAULT_TTL_SEC = 90 * 24 * 60 * 60;

/** Redis 미설정 로컬 개발용 (프로세스 메모리) */
const devMemoryStore = new Map();

function hashToken(plain) {
  return crypto.createHash('sha256').update(String(plain)).digest('hex');
}

function redisKey(userId, deviceId) {
  return `${REFRESH_PREFIX}${userId}:${deviceId}`;
}

function resolveTtlSec() {
  const n = Number(process.env.REFRESH_TOKEN_TTL_SEC);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_SEC;
}

export function generateRefreshTokenPlain() {
  return crypto.randomBytes(48).toString('base64url');
}

export async function storeRefreshToken({ userId, deviceId, plainToken, tokenVersion }) {
  const hashed = hashToken(plainToken);
  const payload = JSON.stringify({ hash: hashed, tv: Number(tokenVersion) || 0 });
  const key = redisKey(userId, deviceId);
  const ttl = resolveTtlSec();

  if (isRedisConfigured()) {
    const redis = await getBatchRedis();
    await redis.set(key, payload, 'EX', ttl);
    return;
  }

  devMemoryStore.set(key, {
    payload,
    expiresAt: Date.now() + ttl * 1000,
  });
}

export async function verifyRefreshToken({ userId, deviceId, plainToken }) {
  const key = redisKey(userId, deviceId);
  let stored = null;

  if (isRedisConfigured()) {
    const redis = await getBatchRedis();
    stored = await redis.get(key);
  } else {
    const row = devMemoryStore.get(key);
    if (row && row.expiresAt > Date.now()) stored = row.payload;
    else devMemoryStore.delete(key);
  }

  if (!stored) return null;

  let parsed;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return null;
  }

  const hashed = hashToken(plainToken);
  if (parsed.hash !== hashed) return null;

  return { tokenVersion: Number(parsed.tv) || 0 };
}

export async function revokeRefreshToken(userId, deviceId) {
  const key = redisKey(userId, deviceId);
  if (isRedisConfigured()) {
    const redis = await getBatchRedis();
    await redis.del(key);
    return;
  }
  devMemoryStore.delete(key);
}

export async function revokeAllRefreshTokens(userId) {
  if (isRedisConfigured()) {
    const redis = await getBatchRedis();
    const pattern = `${REFRESH_PREFIX}${userId}:*`;
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== '0');
    return;
  }

  const prefix = `${REFRESH_PREFIX}${userId}:`;
  for (const key of [...devMemoryStore.keys()]) {
    if (key.startsWith(prefix)) devMemoryStore.delete(key);
  }
}

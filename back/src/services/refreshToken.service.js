import crypto from 'crypto';
import { getBatchRedis, isRedisConfigured } from './batchRedis.service.js';

const REFRESH_PREFIX = 'refresh:';
const DEFAULT_TTL_SEC = 90 * 24 * 60 * 60;

/** Redis 미설정 로컬 개발용 (프로세스 메모리) */
const devMemoryStore = new Map();

/** 동시 refresh 요청 직렬화 (메모리 스토어 race 방지) */
const refreshLocks = new Map();

async function withRefreshLock(key, fn) {
  const prev = refreshLocks.get(key) ?? Promise.resolve();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const chain = prev.then(() => gate);
  refreshLocks.set(key, chain);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (refreshLocks.get(key) === chain) {
      refreshLocks.delete(key);
    }
  }
}

/** GET·해시 검증·DEL을 원자적으로 수행 (Refresh Token rotation race 방지) */
const CONSUME_REFRESH_LUA = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return nil
end
local ok, parsed = pcall(cjson.decode, raw)
if not ok or type(parsed) ~= 'table' or parsed.hash ~= ARGV[1] then
  return '-1'
end
redis.call('DEL', KEYS[1])
return tostring(parsed.tv or '0')
`;

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

/**
 * Refresh 토큰을 검증한 뒤 즉시 폐기한다 (rotation 1회용).
 * 동시 요청 시 첫 요청만 성공하고 나머지는 null을 반환한다.
 */
export async function consumeRefreshToken({ userId, deviceId, plainToken }) {
  const key = redisKey(userId, deviceId);
  const hashed = hashToken(plainToken);

  if (isRedisConfigured()) {
    const redis = await getBatchRedis();
    try {
      const tv = await redis.eval(CONSUME_REFRESH_LUA, 1, key, hashed);
      if (tv == null || tv === false || tv === '-1') return null;
      return { tokenVersion: Number(tv) || 0 };
    } catch {
      return null;
    }
  }

  return withRefreshLock(key, async () => {
    const row = devMemoryStore.get(key);
    if (!row || row.expiresAt <= Date.now()) {
      devMemoryStore.delete(key);
      return null;
    }

    let parsed;
    try {
      parsed = JSON.parse(row.payload);
    } catch {
      return null;
    }

    if (parsed.hash !== hashed) return null;

    devMemoryStore.delete(key);
    return { tokenVersion: Number(parsed.tv) || 0 };
  });
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

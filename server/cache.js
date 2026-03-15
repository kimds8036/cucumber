/**
 * Map 기반 메모리 캐시 (TTL 지원)
 * DB 없이 서버 메모리만 사용.
 */

const store = new Map();

/**
 * @param {string} key
 * @param {unknown} value
 * @param {number} ttlMs - 만료 시간(밀리초). 0이면 만료 없음.
 */
export function setCache(key, value, ttlMs = 0) {
  const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : null;
  store.set(key, { value, expiresAt });
}

/**
 * @param {string} key
 * @returns {unknown | null} 만료되었거나 없으면 null
 */
export function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * @param {string} key
 */
export function clearCache(key) {
  store.delete(key);
}

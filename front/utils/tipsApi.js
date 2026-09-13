/**
 * 인앱 팁 — 서버 활성 풀 + 고정 1개. 실패 시 tipMessages 폴백.
 */
import { api } from './api';
import TIP_MESSAGES from '../constants/tipMessages';

/** @type {{ pinned: { id: number, body: string } | null, items: { id: number, body: string }[] } | null} */
let cache = null;
/** @type {Promise<typeof cache> | null} */
let inflight = null;

function fallbackPayload() {
  return {
    pinned: null,
    items: TIP_MESSAGES.map((body, i) => ({ id: -(i + 1), body })),
  };
}

export async function loadTips({ force = false } = {}) {
  if (!force && cache) return cache;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await api.get('/api/tips');
      const pinned = res.data?.data?.pinned ?? null;
      const items = Array.isArray(res.data?.data?.items)
        ? res.data.data.items
        : [];
      cache =
        items.length > 0 || pinned
          ? { pinned, items: items.length ? items : pinned ? [pinned] : [] }
          : fallbackPayload();
    } catch {
      cache = fallbackPayload();
    } finally {
      inflight = null;
    }
    return cache;
  })();

  return inflight;
}

export function getCachedTips() {
  return cache;
}

/**
 * @param {{ refreshKey?: number, lastBody?: string | null }} opts
 * @returns {Promise<string>}
 */
export async function pickTipBody({ refreshKey = 0, lastBody = null } = {}) {
  const data = await loadTips();
  if (data.pinned?.body) return data.pinned.body;

  const pool = (data.items || []).map((t) => t.body).filter(Boolean);
  const source = pool.length ? pool : TIP_MESSAGES;
  if (!source.length) return '';
  if (source.length === 1) return source[0];

  let next = source[Math.floor(Math.random() * source.length)];
  if (refreshKey > 0 && lastBody && next === lastBody) {
    const others = source.filter((m) => m !== lastBody);
    if (others.length) {
      next = others[Math.floor(Math.random() * others.length)];
    }
  }
  return next;
}

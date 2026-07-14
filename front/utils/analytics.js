import { api, getAuthToken } from './api';
import { normalizeAnalyticsScreen } from '../constants/analyticsScreens';

const FLUSH_INTERVAL_MS = 8_000;
const MIN_SCREEN_INTERVAL_MS = 30_000;
const MAX_BATCH = 20;

let pendingEvents = [];
let flushTimer = null;
let flushing = false;
const lastSentAt = new Map();

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushAnalyticsEvents();
  }, FLUSH_INTERVAL_MS);
}

/**
 * 화면 진입 집계 (익명·서버 집계만, 실패해도 앱 흐름 무관)
 */
export function trackScreenView(screen) {
  const key = normalizeAnalyticsScreen(screen);
  if (!key) return;

  const now = Date.now();
  const prev = lastSentAt.get(key) || 0;
  if (now - prev < MIN_SCREEN_INTERVAL_MS) return;
  lastSentAt.set(key, now);

  pendingEvents.push({ type: 'screen_view', screen: key });
  if (pendingEvents.length >= MAX_BATCH) {
    flushAnalyticsEvents();
    return;
  }
  scheduleFlush();
}

export async function flushAnalyticsEvents() {
  if (flushing || pendingEvents.length === 0) return;
  const token = await getAuthToken();
  if (!token) {
    pendingEvents = [];
    return;
  }

  flushing = true;
  const batch = pendingEvents.splice(0, MAX_BATCH);
  try {
    await api.post(
      '/api/analytics/events',
      { events: batch },
      { validateStatus: (status) => status === 202 || status === 204 },
    );
  } catch {
    // 조용히 드롭
  } finally {
    flushing = false;
    if (pendingEvents.length > 0) scheduleFlush();
  }
}

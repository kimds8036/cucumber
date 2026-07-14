import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { createRedisRateLimitStore } from '../middleware/rateLimitStore.js';
import {
  isValidAnalyticsEventsPayload,
  recordAnalyticsActivity,
} from '../services/analytics.service.js';

const router = express.Router();

const analyticsRateLimitStore = createRedisRateLimitStore('analytics');
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_ANALYTICS_PER_MIN || 120),
  standardHeaders: true,
  legacyHeaders: false,
  ...(analyticsRateLimitStore ? { store: analyticsRateLimitStore } : {}),
  handler: (_req, res) => res.status(202).end(),
});

/**
 * POST /api/analytics/events
 * 익명 집계 수집 — Redis pipeline 후 항상 202 (수집 실패·레이트리밋도 앱 흐름 방해 없음)
 */
router.post('/events', authenticate, analyticsLimiter, async (req, res) => {
  try {
    if (req.user?.type === 'admin_session') {
      return res.status(202).end();
    }

    const events = req.body?.events;
    if (!isValidAnalyticsEventsPayload(events)) {
      return res.status(202).end();
    }

    const userId = Number(req.user?.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(202).end();
    }

    await recordAnalyticsActivity(userId, events);
    return res.status(202).end();
  } catch (error) {
    console.error('[Analytics] ingest route error:', error.message);
    return res.status(202).end();
  }
});

export default router;

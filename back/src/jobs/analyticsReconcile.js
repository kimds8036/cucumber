import {
  acquireBatchLock,
  releaseBatchLock,
} from '../services/batchLock.service.js';
import {
  createBatchExecutionContext,
  logBatchFailure,
  logBatchSkip,
  logBatchSuccess,
} from '../services/batchMetric.service.js';
import { isAnalyticsEnabled, reconcileYesterdayAnalytics } from '../services/analytics.service.js';
import { isRedisConfigured } from '../services/batchRedis.service.js';

const JOB_NAME = 'analytics-reconcile';
const LOCK_KEY = 'batch:lock:analytics-reconcile';
const LOCK_TTL_SECONDS = 600;

export async function runAnalyticsReconcileJob() {
  const context = createBatchExecutionContext(JOB_NAME);

  if (!isAnalyticsEnabled()) {
    logBatchSkip(context, 'analytics-disabled');
    return { skipped: true, reason: 'analytics-disabled' };
  }

  if (!isRedisConfigured()) {
    logBatchSkip(context, 'redis-not-configured');
    return { skipped: true, reason: 'redis-not-configured' };
  }

  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL_SECONDS);
  if (!acquired) {
    logBatchSkip(context, 'lock-not-acquired');
    return { skipped: true, reason: 'lock-not-acquired' };
  }

  try {
    const result = await reconcileYesterdayAnalytics();
    logBatchSuccess(context, result);
    return { skipped: false, ...result };
  } catch (error) {
    logBatchFailure(context, error);
    throw error;
  } finally {
    await releaseBatchLock(LOCK_KEY, owner);
  }
}

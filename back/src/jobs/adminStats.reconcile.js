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

const JOB_NAME = 'admin-stats-reconcile';
const LOCK_KEY = 'batch:lock:admin-stats-reconcile';
const LOCK_TTL = 120;

export async function runAdminStatsReconcileJob() {
  const context = createBatchExecutionContext(JOB_NAME);
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL);
  if (!acquired) {
    logBatchSkip(context, 'lock-not-acquired');
    return { skipped: true };
  }
  try {
    const { reconcileAdminStats } = await import('../services/adminStats.service.js');
    const stats = await reconcileAdminStats();
    logBatchSuccess(context, { skipped: false });
    return { skipped: false, stats };
  } catch (error) {
    logBatchFailure(context, error);
    throw error;
  } finally {
    await releaseBatchLock(LOCK_KEY, owner);
  }
}

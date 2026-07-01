import pool from '../config/database.js';
import {
  acquireBatchLock,
  releaseBatchLock,
} from '../services/batchLock.service.js';

const LOCK_KEY = 'batch:lock:admin-stats-reconcile';
const LOCK_TTL = 120;

export async function runAdminStatsReconcileJob() {
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL);
  if (!acquired) return { skipped: true };
  try {
    const { reconcileAdminStats } = await import('../services/adminStats.service.js');
    const stats = await reconcileAdminStats();
    return { skipped: false, stats };
  } finally {
    await releaseBatchLock(LOCK_KEY, owner);
  }
}

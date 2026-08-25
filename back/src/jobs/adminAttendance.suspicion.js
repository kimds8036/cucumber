import {
  acquireBatchLock,
  releaseBatchLock,
} from '../services/batchLock.service.js';
import { refreshAttendanceSuspicionFlags } from '../services/attendanceSuspicion.service.js';
import {
  createBatchExecutionContext,
  logBatchFailure,
  logBatchSkip,
  logBatchSuccess,
} from '../services/batchMetric.service.js';

const JOB_NAME = 'attendance-suspicion';
const LOCK_KEY = 'batch:lock:attendance-suspicion';
const LOCK_TTL = 300;

export async function runAttendanceSuspicionJob() {
  const context = createBatchExecutionContext(JOB_NAME);
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL);
  if (!acquired) {
    logBatchSkip(context, 'lock-not-acquired');
    return { skipped: true };
  }
  try {
    const result = await refreshAttendanceSuspicionFlags();
    logBatchSuccess(context, result || {});
    return { skipped: false, ...result };
  } catch (error) {
    logBatchFailure(context, error);
    throw error;
  } finally {
    await releaseBatchLock(LOCK_KEY, owner);
  }
}

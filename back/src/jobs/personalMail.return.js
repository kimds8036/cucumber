import { runPersonalMailReturnJob } from '../services/personalMail.service.js';
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

const JOB_NAME = 'personal-mail-return';
const LOCK_KEY = 'batch:lock:personal-mail-return';
const LOCK_TTL_SECONDS = 300;

export async function runPersonalMailReturnBatchJob() {
  const context = createBatchExecutionContext(JOB_NAME);
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL_SECONDS);

  if (!acquired) {
    logBatchSkip(context, 'lock-not-acquired');
    return;
  }

  try {
    const result = await runPersonalMailReturnJob();
    logBatchSuccess(context, result);
    return result;
  } catch (error) {
    logBatchFailure(context, error);
    throw error;
  } finally {
    await releaseBatchLock(LOCK_KEY, owner);
  }
}

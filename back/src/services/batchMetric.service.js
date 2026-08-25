import { persistBatchRun } from './batchJobRun.service.js';

export function createBatchExecutionContext(jobName) {
  return {
    jobName,
    startedAt: Date.now(),
  };
}

export function logBatchSuccess(context, extra = {}) {
  const elapsedMs = Date.now() - context.startedAt;
  console.log(
    `[BatchJob] success job=${context.jobName} elapsedMs=${elapsedMs} meta=${JSON.stringify(extra)}`
  );
  persistBatchRun(context, 'success', extra).catch(() => {});
}

export function logBatchSkip(context, reason) {
  const elapsedMs = Date.now() - context.startedAt;
  console.log(`[BatchJob] skipped job=${context.jobName} elapsedMs=${elapsedMs} reason=${reason}`);
  persistBatchRun(context, 'skipped', { reason }).catch(() => {});
}

export function logBatchFailure(context, error) {
  const elapsedMs = Date.now() - context.startedAt;
  console.error(
    `[BatchJob] failed job=${context.jobName} elapsedMs=${elapsedMs} error=${error.message}`
  );
  persistBatchRun(context, 'failed', {}, error).catch(() => {});
}

export async function executeWithRetry(taskFn, options = {}) {
  const {
    retries = 2,
    baseDelayMs = 1000,
    factor = 2,
    onRetry = null,
  } = options;

  let attempt = 0;
  let delayMs = baseDelayMs;
  let lastError = null;

  while (attempt <= retries) {
    try {
      return await taskFn(attempt + 1);
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;

      if (typeof onRetry === 'function') {
        onRetry({
          attempt: attempt + 1,
          nextAttempt: attempt + 2,
          delayMs,
          error,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= factor;
      attempt += 1;
    }
  }

  throw lastError;
}

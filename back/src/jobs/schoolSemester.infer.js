import {
  acquireBatchLock,
  releaseBatchLock,
} from '../services/batchLock.service.js';
import { sendBatchFailureAlert } from '../services/batchAlert.service.js';
import {
  createBatchExecutionContext,
  logBatchFailure,
  logBatchSkip,
  logBatchSuccess,
} from '../services/batchMetric.service.js';
import {
  inferAndPersistSchoolSemester,
  isSemesterInferSeason,
  listActiveUserSchoolsForSemesterInfer,
  SEMESTER_INFER_JOB,
} from '../services/schoolSemesterInfer.service.js';
import { sleep } from '../services/neisSchoolSchedule.service.js';

const LOCK_KEY = 'batch:lock:school-semester-infer';
const LOCK_TTL_SECONDS = 900;

/** 시즌이면 기동 직후 1회 (이미 confirmed인 학교는 스킵) */
export async function maybeBootSchoolSemesterInfer(ref = new Date()) {
  if (!isSemesterInferSeason(ref)) {
    return { skipped: true, reason: 'off-season' };
  }
  return runSchoolSemesterInferJob(ref);
}

export async function runSchoolSemesterInferJob(ref = new Date()) {
  const context = createBatchExecutionContext(SEMESTER_INFER_JOB);
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL_SECONDS);
  if (!acquired) {
    logBatchSkip(context, 'lock-not-acquired');
    return { skipped: true };
  }

  try {
    if (!isSemesterInferSeason(ref)) {
      logBatchSkip(context, 'off-season');
      return { skipped: true, reason: 'off-season' };
    }

    const schools = await listActiveUserSchoolsForSemesterInfer();
    let confirmed = 0;
    let pending = 0;
    let skippedConfirmed = 0;
    let fail = 0;

    for (const school of schools) {
      try {
        const result = await inferAndPersistSchoolSemester(school, ref);
        if (result.skipped && result.reason === 'confirmed') skippedConfirmed += 1;
        else if (result.confirmed) confirmed += 1;
        else pending += 1;
      } catch (err) {
        fail += 1;
        console.warn(
          '[semester-infer] school failed',
          school.school_id,
          err?.message || err,
        );
      }
      await sleep(100);
    }

    logBatchSuccess(context, {
      pool: schools.length,
      confirmed,
      pending,
      skippedConfirmed,
      fail,
    });
    return {
      skipped: false,
      pool: schools.length,
      confirmed,
      pending,
      skippedConfirmed,
      fail,
    };
  } catch (error) {
    logBatchFailure(context, error);
    await sendBatchFailureAlert({
      jobName: SEMESTER_INFER_JOB,
      error,
      meta: { lockKey: LOCK_KEY },
    });
    throw error;
  } finally {
    await releaseBatchLock(LOCK_KEY, owner);
  }
}

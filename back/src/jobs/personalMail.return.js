import { runPersonalMailReturnJob } from '../services/personalMail.service.js';
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
import { DEFAULT_PERSONAL_MAIL_TEST_RETURN_MINUTES } from '../constants/personalMail.js';

const JOB_NAME = 'personal-mail-return';
const LOCK_KEY = 'batch:lock:personal-mail-return';
const LOCK_TTL_SECONDS = 300;

function envFlag(name) {
  const raw = process.env[name];
  if (raw == null || raw === '') return false;
  const v = String(raw).toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function getTestReturnAfterMinutes() {
  const raw = Number(process.env.PERSONAL_MAIL_TEST_RETURN_MINUTES);
  if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  return DEFAULT_PERSONAL_MAIL_TEST_RETURN_MINUTES;
}

// USE_TEST_MAIL_RETURN=true 이면 sent_at 기준 분 단위(기본 180분=3시간).
// false(기본)이면 PERSONAL_MAIL_RETURN_HOURS(기본 3시간) — 운영.
// 참고: jobs/index.js 에서 새벽 4시 cron 등록은 주석 처리됨(수동/다른 스케줄로만 실행).
function getPersonalMailReturnOptions() {
  if (!envFlag('USE_TEST_MAIL_RETURN')) return undefined;
  return { returnAfterMinutes: getTestReturnAfterMinutes() };
}

export async function runPersonalMailReturnBatchJob() {
  const context = createBatchExecutionContext(JOB_NAME);
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL_SECONDS);

  if (!acquired) {
    logBatchSkip(context, 'lock-not-acquired');
    return;
  }

  try {
    const result = await runPersonalMailReturnJob(getPersonalMailReturnOptions());
    logBatchSuccess(context, result);
    return result;
  } catch (error) {
    logBatchFailure(context, error);
    await sendBatchFailureAlert({
      jobName: JOB_NAME,
      error,
      meta: { lockKey: LOCK_KEY },
    });
    throw error;
  } finally {
    await releaseBatchLock(LOCK_KEY, owner);
  }
}

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
  return 1;
}

// USE_TEST_MAIL_RETURN=true 이면 sent_at 기준 분 단위 반송(테스트).
// false(기본)이면 PERSONAL_MAIL_RETURN_DAYS(일) — 운영.
// 테스트 시 cron 1분 간격으로 돌리려면 CRON_PERSONAL_MAIL_RETURN 환경변수를 1분 주기로 설정.
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

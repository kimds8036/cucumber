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

/**
 * [테스트용] 개인우편 반송 대기 시간
 * - true: sent_at 기준 TEST_RETURN_AFTER_MINUTES 경과 후 반송 후보
 * - false: PERSONAL_MAIL_RETURN_DAYS(일) — 운영 기본값
 *
 * 배치가 1분마다 돌게 하려면 CRON_PERSONAL_MAIL_RETURN='* /1 * * * *' 도 설정
 * (실제 cron 값은 별+/1, 공백 없음 — .env.example 참고).
 * 테스트 끝나면 USE_TEST_RETURN_INTERVAL=false 로 되돌릴 것.
 */
const USE_TEST_RETURN_INTERVAL = true;
const TEST_RETURN_AFTER_MINUTES = 1;

export async function runPersonalMailReturnBatchJob() {
  const context = createBatchExecutionContext(JOB_NAME);
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL_SECONDS);

  if (!acquired) {
    logBatchSkip(context, 'lock-not-acquired');
    return;
  }

  try {
    const result = await runPersonalMailReturnJob(
      USE_TEST_RETURN_INTERVAL
        ? { returnAfterMinutes: TEST_RETURN_AFTER_MINUTES }
        : undefined,
    );
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

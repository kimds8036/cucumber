import pool from '../config/database.js';
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
  getKstNow,
  getReverificationDeadlineForYear,
  isReverificationGracePeriod,
  isReverificationGuideSeason,
  isReverificationRestrictionDue,
} from '../services/reverification.service.js';
import { getAcademicYearStart } from '../utils/signupEnrollment.js';

const JOB_NAME = 'reverification-guide';
const LOCK_KEY = 'batch:lock:reverification-guide';
const LOCK_TTL_SECONDS = 300;

/** 졸업·성인 차단은 추후 질문 게시판 등 확장 전까지 해제 */
const LEGACY_BLOCK_STATUSES = ['adult_blocked', 'graduated_blocked'];

async function clearLegacyBlockStatuses() {
  const [result] = await pool.execute(
    `UPDATE users
     SET reverification_status = 'none', reverification_deadline = NULL
     WHERE is_deleted = FALSE
       AND reverification_status IN (?, ?)`,
    LEGACY_BLOCK_STATUSES,
  );
  return Number(result?.affectedRows ?? 0);
}

/** 3/1~3/7: 재인증 유예(grace) 부여 — 아직 grace가 아닌 활성 유저만 */
async function assignGracePeriod(deadline) {
  const [result] = await pool.execute(
    `UPDATE users
     SET reverification_status = 'grace', reverification_deadline = ?
     WHERE is_deleted = FALSE
       AND reverification_status NOT IN ('grace', 'restricted')`,
    [deadline],
  );
  return Number(result?.affectedRows ?? 0);
}

/** 3/8 이후: 마감 지났는데 grace/required 인 유저만 restricted */
async function restrictOverdueUsers(deadline) {
  const [result] = await pool.execute(
    `UPDATE users
     SET reverification_status = 'restricted'
     WHERE is_deleted = FALSE
       AND reverification_status IN ('grace', 'required')
       AND (reverification_deadline IS NULL OR reverification_deadline <= ?)`,
    [deadline],
  );
  return Number(result?.affectedRows ?? 0);
}

async function runReverificationGuide() {
  const kst = getKstNow();
  if (!isReverificationGuideSeason(kst)) {
    return { skipped: true, reason: 'outside-season' };
  }

  const academicYear = getAcademicYearStart(kst);
  const deadline = getReverificationDeadlineForYear(academicYear);
  const legacyCleared = await clearLegacyBlockStatuses();

  let graceAssigned = 0;
  let restricted = 0;

  if (isReverificationGracePeriod(kst)) {
    graceAssigned = await assignGracePeriod(deadline);
  } else if (isReverificationRestrictionDue(kst)) {
    restricted = await restrictOverdueUsers(deadline);
  }

  return {
    skipped: false,
    academicYear,
    deadline,
    legacyCleared,
    graceAssigned,
    restricted,
  };
}

export async function runReverificationGuideJob() {
  const context = createBatchExecutionContext(JOB_NAME);
  const kst = getKstNow();

  if (!isReverificationGuideSeason(kst)) {
    logBatchSkip(context, 'outside-season');
    return { skipped: true, reason: 'outside-season' };
  }

  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL_SECONDS);
  if (!acquired) {
    logBatchSkip(context, 'lock-not-acquired');
    return { skipped: true, reason: 'lock-not-acquired' };
  }

  try {
    const result = await runReverificationGuide();
    if (result.skipped) {
      logBatchSkip(context, result.reason || 'skipped');
      return result;
    }
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

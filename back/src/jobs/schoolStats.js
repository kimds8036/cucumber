import pool from '../config/database.js';
import { reconcileAllCommentCounts } from '../services/commentCount.service.js';
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

const JOB_NAME = 'school-stats';
const LOCK_KEY = 'batch:lock:school-stats';
const LOCK_TTL_SECONDS = 180;

/**
 * schools.total_students / total_posts / total_school_mails 를
 * 실데이터 기준으로 일괄 갱신한다. (CSV 시드와 무관)
 * posts·school_mails comment_count 도 함께 reconcile 한다.
 */
export async function runSchoolStatsJob() {
  const context = createBatchExecutionContext(JOB_NAME);
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL_SECONDS);

  if (!acquired) {
    logBatchSkip(context, 'lock-not-acquired');
    return;
  }

  try {
    await pool.execute(`
      UPDATE schools s
      LEFT JOIN (
        SELECT school_id, COUNT(*) AS c
        FROM users
        WHERE is_deleted = FALSE
        GROUP BY school_id
      ) um ON um.school_id = s.school_id
      LEFT JOIN (
        SELECT school_id, COUNT(*) AS c
        FROM posts
        WHERE board_type = 'school' AND is_deleted = FALSE
        GROUP BY school_id
      ) pm ON pm.school_id = s.school_id
      LEFT JOIN (
        SELECT school_id, COUNT(*) AS c
        FROM school_mails
        WHERE is_deleted = FALSE
        GROUP BY school_id
      ) mm ON mm.school_id = s.school_id
      SET
        s.total_students = COALESCE(um.c, 0),
        s.total_posts = COALESCE(pm.c, 0),
        s.total_school_mails = COALESCE(mm.c, 0),
        s.stats_updated_at = NOW()
    `);

    const reconcile = await reconcileAllCommentCounts(pool);
    logBatchSuccess(context, {
      postsUpdated: reconcile.postsUpdated,
      mailsUpdated: reconcile.mailsUpdated,
    });
    if (reconcile.postsUpdated > 0 || reconcile.mailsUpdated > 0) {
      console.log('[schoolStats] comment_count reconcile', reconcile);
    }
    return reconcile;
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

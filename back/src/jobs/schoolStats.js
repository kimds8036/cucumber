import pool from '../config/database.js';
import {
  reconcileAllCommentCounts,
  reconcilePostCommentCountsSince,
  reconcileSchoolMailCommentCountsSince,
  maxPostCommentId,
  maxSchoolMailCommentId,
} from '../services/commentCount.service.js';
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
import { getBatchCursor, saveBatchCursor } from '../services/batchCursor.service.js';

const JOB_NAME = 'school-stats';
const LOCK_KEY = 'batch:lock:school-stats';
const LOCK_TTL_SECONDS = 180;
const FULL_CURSOR_KEY = 'comment_full';
const POST_CURSOR_KEY = 'comments';
const MAIL_CURSOR_KEY = 'mail_comments';

function fullReconcileIntervalMs() {
  const hours = Number(process.env.CRON_SCHOOL_STATS_FULL_HOURS || 168);
  const safe = Number.isFinite(hours) && hours > 0 ? hours : 168;
  return safe * 60 * 60 * 1000;
}

function shouldRunFullCommentReconcile(fullCursor) {
  if (String(process.env.CRON_SCHOOL_STATS_FULL_FORCE || '').toLowerCase() === 'true') {
    return true;
  }
  if (!fullCursor?.last_at) return true;
  const last = new Date(fullCursor.last_at).getTime();
  if (!Number.isFinite(last)) return true;
  return Date.now() - last >= fullReconcileIntervalMs();
}

/**
 * schools.total_students / total_posts / total_school_mails 를
 * 실데이터 기준으로 일괄 갱신한다. (CSV 시드와 무관)
 * comment_count 는 평시 증분(새 댓글 id), 주기적으로 전체 reconcile.
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

    const fullCursor = await getBatchCursor(JOB_NAME, FULL_CURSOR_KEY);
    const runFull = shouldRunFullCommentReconcile(fullCursor);
    let reconcile;

    if (runFull) {
      reconcile = {
        ...(await reconcileAllCommentCounts(pool)),
        mode: 'full',
      };
      const [postMax, mailMax] = await Promise.all([
        maxPostCommentId(pool),
        maxSchoolMailCommentId(pool),
      ]);
      await saveBatchCursor(JOB_NAME, FULL_CURSOR_KEY, {
        lastAt: new Date(),
        mode: 'full',
        note: '전체 comment_count 재계산',
      });
      await saveBatchCursor(JOB_NAME, POST_CURSOR_KEY, {
        lastId: postMax,
        mode: 'full',
      });
      await saveBatchCursor(JOB_NAME, MAIL_CURSOR_KEY, {
        lastId: mailMax,
        mode: 'full',
      });
    } else {
      const postCursor = await getBatchCursor(JOB_NAME, POST_CURSOR_KEY);
      const mailCursor = await getBatchCursor(JOB_NAME, MAIL_CURSOR_KEY);
      const postPart = await reconcilePostCommentCountsSince(
        pool,
        postCursor?.last_id ?? 0,
      );
      const mailPart = await reconcileSchoolMailCommentCountsSince(
        pool,
        mailCursor?.last_id ?? 0,
      );
      reconcile = {
        postsUpdated: postPart.postsUpdated,
        mailsUpdated: mailPart.mailsUpdated,
        mode: 'incremental',
        postsFromId: postPart.fromId,
        postsToId: postPart.toId,
        mailsFromId: mailPart.fromId,
        mailsToId: mailPart.toId,
      };
      await saveBatchCursor(JOB_NAME, POST_CURSOR_KEY, {
        lastId: postPart.toId,
        mode: 'incremental',
        note: `comments.id ${postPart.fromId}→${postPart.toId}`,
      });
      await saveBatchCursor(JOB_NAME, MAIL_CURSOR_KEY, {
        lastId: mailPart.toId,
        mode: 'incremental',
        note: `school_mail_comments.id ${mailPart.fromId}→${mailPart.toId}`,
      });
    }

    logBatchSuccess(context, {
      postsUpdated: reconcile.postsUpdated,
      mailsUpdated: reconcile.mailsUpdated,
      mode: reconcile.mode,
      postsFromId: reconcile.postsFromId,
      postsToId: reconcile.postsToId,
      mailsFromId: reconcile.mailsFromId,
      mailsToId: reconcile.mailsToId,
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

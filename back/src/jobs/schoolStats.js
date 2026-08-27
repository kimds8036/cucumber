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

async function updateSchoolTotals(schoolIds = null) {
  const ids = Array.isArray(schoolIds)
    ? [...new Set(schoolIds.map((s) => String(s || '').trim()).filter(Boolean))]
    : null;
  const scoped = ids && ids.length > 0;
  const whereSql = scoped
    ? `WHERE s.school_id IN (${ids.map(() => '?').join(',')})`
    : '';
  const params = scoped ? ids : [];

  await pool.execute(
    `
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
      ${whereSql}
    `,
    params,
  );
  return scoped ? ids.length : null;
}

async function reconcileComments({ forceFull = false } = {}) {
  const fullCursor = await getBatchCursor(JOB_NAME, FULL_CURSOR_KEY);
  const runFull = forceFull || shouldRunFullCommentReconcile(fullCursor);

  if (runFull) {
    const reconcile = {
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
    return reconcile;
  }

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
  const reconcile = {
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
  return reconcile;
}

/**
 * @param {{ schoolIds?: string[], full?: boolean }} [options]
 * - schoolIds: 해당 학교 totals만 (+ 댓글 증분)
 * - full: 전 학교 totals + 댓글 full
 * - 옵션 없음: 전 학교 totals + 댓글(주기 full/증분) — 안전망/레거시
 */
export async function runSchoolStatsJob(options = {}) {
  const context = createBatchExecutionContext(JOB_NAME);
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL_SECONDS);

  if (!acquired) {
    logBatchSkip(context, 'lock-not-acquired');
    return { skipped: true, reason: 'lock-not-acquired' };
  }

  try {
    const wantFull = Boolean(options.full);
    const schoolIds = Array.isArray(options.schoolIds) ? options.schoolIds : null;
    const scoped = !wantFull && schoolIds && schoolIds.length > 0;

    const schoolsTouched = await updateSchoolTotals(scoped ? schoolIds : null);
    const reconcile = await reconcileComments({ forceFull: wantFull });

    const meta = {
      postsUpdated: reconcile.postsUpdated,
      mailsUpdated: reconcile.mailsUpdated,
      mode: reconcile.mode,
      postsFromId: reconcile.postsFromId,
      postsToId: reconcile.postsToId,
      mailsFromId: reconcile.mailsFromId,
      mailsToId: reconcile.mailsToId,
      schoolsTouched: schoolsTouched == null ? 'all' : schoolsTouched,
      scoped: Boolean(scoped),
      full: wantFull,
    };
    logBatchSuccess(context, meta);
    if (reconcile.postsUpdated > 0 || reconcile.mailsUpdated > 0) {
      console.log('[schoolStats] comment_count reconcile', reconcile);
    }
    return meta;
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

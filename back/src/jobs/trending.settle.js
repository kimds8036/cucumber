import pool from '../config/database.js';
import {
  acquireBatchLock,
  releaseBatchLock,
} from '../services/batchLock.service.js';
import { getBatchRedis } from '../services/batchRedis.service.js';
import { sendBatchFailureAlert } from '../services/batchAlert.service.js';
import {
  createBatchExecutionContext,
  executeWithRetry,
  logBatchFailure,
  logBatchSkip,
  logBatchSuccess,
} from '../services/batchMetric.service.js';

const JOB_NAME = 'trending-settle';
const LOCK_KEY = 'batch:lock:trending-settle';
const LOCK_TTL_SECONDS = 120;
const CACHE_TTL_SECONDS = 60 * 60;
const MAX_POSTS = 200;

function calculatePostScore(row) {
  const likeCount = Number(row.like_count || 0);
  const commentCount = Number(row.comment_count || 0);
  const ageHours = Number(row.age_hours || 0);
  const freshnessBonus = Math.max(0, 24 - Math.min(ageHours, 24));
  return likeCount * 3 + commentCount * 2 + freshnessBonus;
}

export async function runTrendingSettleJob() {
  const context = createBatchExecutionContext(JOB_NAME);
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL_SECONDS);

  if (!acquired) {
    logBatchSkip(context, 'lock-not-acquired');
    return;
  }

  try {
    const result = await executeWithRetry(
      async () => {
        const redis = await getBatchRedis();
        const globalKey = 'trending:posts:national';
        const hashtagKey = 'trending:hashtag';

        const [postRows] = await pool.execute(
          `SELECT
            p.id,
            p.school_id,
            p.like_count,
            p.comment_count,
            TIMESTAMPDIFF(HOUR, p.created_at, NOW()) AS age_hours
           FROM posts p
           WHERE p.is_deleted = FALSE
             AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
           ORDER BY p.created_at DESC
           LIMIT ${MAX_POSTS}`
        );

        const [tagRows] = await pool.execute(
          `SELECT
            t.name AS tag_name,
            COUNT(*) AS usage_count
           FROM post_tags pt
           INNER JOIN tags t ON t.id = pt.tag_id
           INNER JOIN posts p ON p.id = pt.post_id
           WHERE p.is_deleted = FALSE
             AND p.created_at >= DATE_SUB(NOW(), INTERVAL 3 DAY)
           GROUP BY t.name
           ORDER BY usage_count DESC
           LIMIT 100`
        );

        const schoolBuckets = new Map();
        for (const row of postRows) {
          if (!row.school_id) continue;
          const schoolKey = `trending:posts:school:${row.school_id}`;
          if (!schoolBuckets.has(schoolKey)) {
            schoolBuckets.set(schoolKey, []);
          }
          schoolBuckets.get(schoolKey).push(row);
        }

        const pipeline = redis.pipeline();
        pipeline.del(globalKey);
        for (const row of postRows) {
          const postId = Number(row.id);
          const score = calculatePostScore(row);
          pipeline.zadd(globalKey, score, `post:${postId}`);
        }

        pipeline.expire(globalKey, CACHE_TTL_SECONDS);
        for (const [schoolKey, rows] of schoolBuckets.entries()) {
          pipeline.del(schoolKey);
          for (const row of rows) {
            const postId = Number(row.id);
            const score = calculatePostScore(row);
            pipeline.zadd(schoolKey, score, `post:${postId}`);
          }
          pipeline.expire(schoolKey, CACHE_TTL_SECONDS);
        }

        pipeline.del(hashtagKey);
        for (const row of tagRows) {
          pipeline.zadd(hashtagKey, Number(row.usage_count || 0), row.tag_name);
        }
        pipeline.expire(hashtagKey, CACHE_TTL_SECONDS);

        await pipeline.exec();
        return {
          postCount: postRows.length,
          hashtagCount: tagRows.length,
          schoolKeyCount: schoolBuckets.size,
        };
      },
      {
        retries: 2,
        baseDelayMs: 1000,
        factor: 2,
        onRetry: ({ attempt, nextAttempt, delayMs, error }) => {
          console.warn(
            `[BatchJob] retry job=${JOB_NAME} attempt=${attempt} next=${nextAttempt} delayMs=${delayMs} error=${error.message}`
          );
        },
      }
    );

    logBatchSuccess(context, {
      postCount: result.postCount,
      hashtagCount: result.hashtagCount,
      schoolKeyCount: result.schoolKeyCount,
    });
  } catch (error) {
    logBatchFailure(context, error);
    await sendBatchFailureAlert({
      jobName: JOB_NAME,
      error,
      meta: { lockKey: LOCK_KEY },
    });
  } finally {
    await releaseBatchLock(LOCK_KEY, owner);
  }
}

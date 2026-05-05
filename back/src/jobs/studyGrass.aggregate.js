import pool from '../config/database.js';
import { STUDY_GRASS_REDIS_TTL_SECONDS } from '../config/studyGrass.js';
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

const JOB_NAME = 'study-grass-aggregate';
const LOCK_KEY = 'batch:lock:study-grass-aggregate';
const LOCK_TTL_SECONDS = 180;

function getSeoulDayKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export async function runStudyGrassAggregateJob() {
  const context = createBatchExecutionContext(JOB_NAME);
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL_SECONDS);

  if (!acquired) {
    logBatchSkip(context, 'lock-not-acquired');
    return;
  }

  try {
    const targetDayKey = process.env.CRON_STUDY_GRASS_DAY_KEY || getSeoulDayKey();

    const result = await executeWithRetry(
      async () => {
        const redis = await getBatchRedis();
        const [rows] = await pool.execute(
          `SELECT
            sd.school_id AS school_id,
            COUNT(DISTINCT sd.user_id) AS active_user_count,
            COALESCE(SUM(sd.total_elapsed_ms), 0) AS total_elapsed_ms
           FROM study_days sd
           INNER JOIN users u ON u.id = sd.user_id
           WHERE sd.day_key = ?
             AND sd.total_elapsed_ms > 0
             AND sd.school_id IS NOT NULL
             AND u.is_deleted = FALSE
           GROUP BY sd.school_id`,
          [targetDayKey]
        );

        const pipeline = redis.pipeline();
        let schoolCount = 0;

        for (const row of rows) {
          const schoolId = row.school_id;
          if (!schoolId) continue;

          const activeUsers = Number(row.active_user_count || 0);
          const totalElapsedMs = Number(row.total_elapsed_ms || 0);
          const hashKey = `study:grass:school:${schoolId}:${targetDayKey}`;
          const rankKey = `study:grass:rank:${targetDayKey}`;

          pipeline.hset(hashKey, {
            school_id: schoolId,
            day_key: targetDayKey,
            active_user_count: String(activeUsers),
            total_elapsed_ms: String(totalElapsedMs),
            updated_at: new Date().toISOString(),
          });
          pipeline.expire(hashKey, STUDY_GRASS_REDIS_TTL_SECONDS);
          pipeline.zadd(rankKey, totalElapsedMs, schoolId);
          pipeline.expire(rankKey, STUDY_GRASS_REDIS_TTL_SECONDS);
          schoolCount += 1;
        }

        if (schoolCount > 0) {
          await pipeline.exec();
        }

        return { schoolCount };
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
      dayKey: targetDayKey,
      schools: result.schoolCount,
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

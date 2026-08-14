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
import { getKstNow } from '../services/reverification.service.js';
import {
  listActiveUserSchools,
  syncSchoolTermsForSchool,
} from '../services/schoolTerms.service.js';
import { sleep } from '../services/neisSchoolSchedule.service.js';
import pool from '../config/database.js';

const JOB_NAME = 'school-terms-sync';
const LOCK_KEY = 'batch:lock:school-terms-sync';
const LOCK_TTL_SECONDS = 900;

/** 2/15~3/15, 7/20~8/31 */
export function isSchoolTermPeakSeason(ref = new Date()) {
  const kst = getKstNow(ref);
  const m = kst.getMonth() + 1;
  const d = kst.getDate();
  if (m === 2 && d >= 15) return true;
  if (m === 3 && d <= 15) return true;
  if (m === 7 && d >= 20) return true;
  if (m === 8) return true;
  return false;
}

/** 집중기 전체, 평시는 월 초(1~7일)만 */
export function shouldRunSeasonalTermSync(ref = new Date()) {
  if (String(process.env.CRON_SCHOOL_TERMS_FORCE || '').toLowerCase() === 'true') {
    return true;
  }
  if (isSchoolTermPeakSeason(ref)) return true;
  return getKstNow(ref).getDate() <= 7;
}

export async function runSchoolTermsSyncJob(ref = new Date()) {
  const context = createBatchExecutionContext(JOB_NAME);
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL_SECONDS);
  if (!acquired) {
    logBatchSkip(context, 'lock-not-acquired');
    return { skipped: true };
  }

  try {
    const schools = await listActiveUserSchools();
    const seasonal = shouldRunSeasonalTermSync(ref);

    let targets = schools;
    if (!seasonal) {
      const [haveTerms] = await pool.execute(
        `SELECT DISTINCT school_id FROM school_terms`,
      );
      const have = new Set(haveTerms.map((r) => r.school_id));
      targets = schools.filter((s) => !have.has(s.school_id));
      if (!targets.length) {
        logBatchSkip(context, 'off-peak-no-missing');
        return { skipped: true, reason: 'off-peak-no-missing', pool: schools.length };
      }
    }

    let ok = 0;
    let fail = 0;
    for (const s of targets) {
      try {
        const result = await syncSchoolTermsForSchool(s.school_id, s);
        if (result.ok) ok += 1;
        else fail += 1;
      } catch {
        fail += 1;
      }
      await sleep(120);
    }

    logBatchSuccess(context, {
      pool: schools.length,
      synced: targets.length,
      ok,
      fail,
      seasonal,
    });
    return { skipped: false, pool: schools.length, synced: targets.length, ok, fail };
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

/** 스케줄러 기동 시 학기 행이 없으면 1회 동기화 (8월 배포 직후 빈 테이블 대비) */
export async function maybeBootSchoolTermsSync() {
  try {
    const [[row]] = await pool.execute('SELECT COUNT(*) AS c FROM school_terms');
    if (Number(row?.c) > 0) return { skipped: true, reason: 'already-filled' };
  } catch (err) {
    console.warn('[schoolTerms] boot count failed', err?.message || err);
    return { skipped: true, reason: 'count-failed' };
  }
  return runSchoolTermsSyncJob();
}

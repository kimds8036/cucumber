import { formatKstDateYmd, getKstNow } from '../services/reverification.service.js';
import {
  JOB_KEYS,
  claimReservations,
  completeReservations,
  enqueueReservation,
  enqueueReservationSafe,
  reclaimStaleLeases,
  requeueReservations,
  schoolStatsScope,
} from '../services/batchReservation.service.js';
import {
  createBatchExecutionContext,
  logBatchFailure,
  logBatchSkip,
  logBatchSuccess,
} from '../services/batchMetric.service.js';
import {
  acquireBatchLock,
  releaseBatchLock,
} from '../services/batchLock.service.js';
import { runSchoolStatsJob } from './schoolStats.js';
import { runPersonalMailReturnBatchJob } from './personalMail.return.js';
import { runTimerSessionGuardJob } from './timerSession.guard.js';

const JOB_NAME = JOB_KEYS.CRON_MANAGER;
const LOCK_KEY = 'batch:lock:cron-manager';
const LOCK_TTL_SECONDS = 50;

function envFlag(name, defaultTrue = true) {
  const raw = process.env[name];
  if (raw == null || raw === '') return defaultTrue;
  const v = String(raw).toLowerCase();
  return !(v === 'false' || v === '0' || v === 'no');
}

function parseSchoolIdFromScope(scopeKey) {
  const m = String(scopeKey || '').match(/^school:(.+)$/i);
  return m ? m[1] : null;
}

async function ensureSafetyReservations() {
  if (!envFlag('CRON_MANAGER_SAFETY', true)) return { enqueued: [] };

  const enqueued = [];
  const kst = getKstNow();
  const hour = kst.getHours();
  const minute = kst.getMinutes();
  const today = formatKstDateYmd(kst);

  // 매일 03:10경 — 학교 통계 전체 안전망
  if (hour === 3 && minute < 2) {
    await enqueueReservation({
      jobKey: JOB_KEYS.SCHOOL_STATS,
      scopeKey: `global:full:${today}`,
      priority: 5,
      payload: { full: true, reason: 'daily-safety' },
      mode: 'once',
    });
    enqueued.push('school-stats:global:full');
  }

  // 6시간마다 우편 반송 스윕 (정각 근처)
  if (hour % 6 === 0 && minute < 2) {
    await enqueueReservation({
      jobKey: JOB_KEYS.PERSONAL_MAIL_RETURN,
      scopeKey: `sweep:${today}-h${hour}`,
      priority: 3,
      payload: { reason: 'periodic-sweep' },
      mode: 'once',
    });
    enqueued.push('personal-mail-return:sweep');
  }

  // 매시 타이머 가드 스윕
  if (minute < 2) {
    await enqueueReservation({
      jobKey: JOB_KEYS.TIMER_SESSION_GUARD,
      scopeKey: `sweep:${today}-h${hour}`,
      priority: 2,
      payload: { reason: 'hourly-sweep' },
      mode: 'once',
    });
    enqueued.push('timer-session-guard:sweep');
  }

  return { enqueued };
}

async function dispatchGroup(jobKey, items) {
  const ids = items.map((i) => i.id);

  if (jobKey === JOB_KEYS.SCHOOL_STATS) {
    const wantFull = items.some(
      (i) => i.scopeKey.startsWith('global:full') || i.payload?.full === true,
    );
    if (wantFull) {
      await runSchoolStatsJob({ full: true });
    } else {
      const schoolIds = items
        .map((i) => parseSchoolIdFromScope(i.scopeKey))
        .filter(Boolean);
      if (schoolIds.length) {
        await runSchoolStatsJob({ schoolIds });
      } else {
        await runSchoolStatsJob({});
      }
    }
    await completeReservations(ids);
    return { ok: true, jobKey, count: ids.length };
  }

  if (jobKey === JOB_KEYS.PERSONAL_MAIL_RETURN) {
    await runPersonalMailReturnBatchJob();
    await completeReservations(ids);
    return { ok: true, jobKey, count: ids.length };
  }

  if (jobKey === JOB_KEYS.TIMER_SESSION_GUARD) {
    await runTimerSessionGuardJob();
    await completeReservations(ids);
    return { ok: true, jobKey, count: ids.length };
  }

  // 알 수 없는 job — 재시도 없이 failed
  await completeReservations(ids, {
    status: 'failed',
    errorMessage: `unknown-job:${jobKey}`,
  });
  return { ok: false, jobKey, count: ids.length, reason: 'unknown-job' };
}

export async function runCronManagerJob() {
  const context = createBatchExecutionContext(JOB_NAME);
  const { acquired, owner } = await acquireBatchLock(LOCK_KEY, LOCK_TTL_SECONDS);
  if (!acquired) {
    logBatchSkip(context, 'lock-not-acquired');
    return;
  }

  try {
    const reclaimed = await reclaimStaleLeases({ olderThanSec: 900 });
    const safety = await ensureSafetyReservations();
    const claimed = await claimReservations({ limit: 50 });

    if (!claimed.items.length) {
      logBatchSuccess(context, {
        claimed: 0,
        reclaimed,
        safetyEnqueued: safety.enqueued,
      });
      return { claimed: 0, reclaimed, safety };
    }

    const byJob = new Map();
    for (const item of claimed.items) {
      if (!byJob.has(item.jobKey)) byJob.set(item.jobKey, []);
      byJob.get(item.jobKey).push(item);
    }

    const results = [];
    for (const [jobKey, items] of byJob.entries()) {
      try {
        results.push(await dispatchGroup(jobKey, items));
      } catch (error) {
        const msg = String(error?.message || error).slice(0, 480);
        await requeueReservations(
          items.map((i) => i.id),
          { delayMs: 120_000, errorMessage: msg },
        );
        results.push({ ok: false, jobKey, count: items.length, error: msg });
      }
    }

    logBatchSuccess(context, {
      claimed: claimed.items.length,
      reclaimed,
      safetyEnqueued: safety.enqueued,
      results,
    });
    return { claimed: claimed.items.length, reclaimed, safety, results };
  } catch (error) {
    logBatchFailure(context, error);
    throw error;
  } finally {
    await releaseBatchLock(LOCK_KEY, owner);
  }
}

/** 가입·게시 등에서 학교 통계 예약 */
export function scheduleSchoolStatsForSchool(schoolId, { debounceMs = 45_000 } = {}) {
  const id = String(schoolId || '').trim();
  if (!id) return;
  enqueueReservationSafe({
    jobKey: JOB_KEYS.SCHOOL_STATS,
    scopeKey: schoolStatsScope(id),
    debounceMs,
    priority: 10,
  });
}

export { enqueueReservationSafe, JOB_KEYS };

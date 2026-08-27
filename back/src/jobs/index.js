import cron from 'node-cron';
import { runStudyGrassAggregateJob } from './studyGrass.aggregate.js';
import { runTrendingSettleJob } from './trending.settle.js';
import { runSchoolStatsJob } from './schoolStats.js';
import { runTimerSessionGuardJob } from './timerSession.guard.js';
import { runPersonalMailReturnBatchJob } from './personalMail.return.js';
import { runReverificationGuideJob } from './reverification.guide.js';
import { runAdminStatsReconcileJob } from './adminStats.reconcile.js';
import { runAttendanceSuspicionJob } from './adminAttendance.suspicion.js';
import { runAdminRetentionJob } from './adminRetention.purge.js';
import { runAnalyticsReconcileJob } from './analyticsReconcile.js';
import { runSchoolTermsSyncJob, maybeBootSchoolTermsSync } from './schoolTerms.sync.js';
import {
  runSchoolSemesterInferJob,
  maybeBootSchoolSemesterInfer,
} from './schoolSemester.infer.js';
import { runCronManagerJob } from './cronManager.js';
import { shouldRunCron } from '../config/serviceRole.js';

const TZ = process.env.CRON_TIMEZONE || 'Asia/Seoul';

function isCronEnabled() {
  const value = (process.env.ENABLE_CRON || 'true').toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

/** true면 직접 스케줄, false면 cron-manager 예약만 (기본) */
function runDirect(envKey, defaultDirect = false) {
  const raw = process.env[envKey];
  if (raw == null || raw === '') return defaultDirect;
  const v = String(raw).toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

export function initJobs() {
  if (!shouldRunCron()) {
    console.log('[BatchJob] SERVICE_ROLE/ENABLE_CRON — 스케줄러를 시작하지 않습니다.');
    return;
  }

  if (!isCronEnabled()) {
    console.log('[BatchJob] ENABLE_CRON=false - 스케줄러를 시작하지 않습니다.');
    return;
  }

  const studyGrassSchedule = process.env.CRON_STUDY_GRASS || '5 * * * *';
  const trendingSchedule = process.env.CRON_TRENDING_SETTLE || '*/10 * * * *';
  const schoolStatsSchedule = process.env.CRON_SCHOOL_STATS || '0 * * * *';
  const timerGuardSchedule = process.env.CRON_TIMER_GUARD || '*/10 * * * *';
  const personalMailReturnSchedule =
    process.env.CRON_PERSONAL_MAIL_RETURN || '*/30 * * * *';
  const cronManagerSchedule = process.env.CRON_MANAGER || '* * * * *';
  const reverificationSchedules = process.env.CRON_REVERIFICATION_GUIDE
    ? [process.env.CRON_REVERIFICATION_GUIDE]
    : ['0 4 25-29 2 *', '0 4 1-8 3 *'];
  const adminStatsSchedule = process.env.CRON_ADMIN_STATS || '*/5 * * * *';
  const attendanceSuspicionSchedule =
    process.env.CRON_ATTENDANCE_SUSPICION || '0 3 * * *';
  const adminRetentionSchedule =
    process.env.CRON_ADMIN_RETENTION || '0 5 * * 0';
  const analyticsReconcileSchedule =
    process.env.CRON_ANALYTICS_RECONCILE || '0 4 * * *';
  const schoolTermsSchedule =
    process.env.CRON_SCHOOL_TERMS || '0 4 * * 1';
  const schoolSemesterInferSchedule =
    process.env.CRON_SEMESTER_INFER || '0 5 * * *';

  const directSchoolStats = runDirect('CRON_SCHOOL_STATS_DIRECT', false);
  const directTimerGuard = runDirect('CRON_TIMER_GUARD_DIRECT', false);
  const directMailReturn = runDirect('CRON_PERSONAL_MAIL_RETURN_DIRECT', false);
  const managerEnabled = !runDirect('CRON_MANAGER_DISABLED', false);

  cron.schedule(
    studyGrassSchedule,
    async () => {
      await runStudyGrassAggregateJob();
    },
    { timezone: TZ },
  );

  cron.schedule(
    trendingSchedule,
    async () => {
      await runTrendingSettleJob();
    },
    { timezone: TZ },
  );

  if (directSchoolStats) {
    cron.schedule(
      schoolStatsSchedule,
      async () => {
        await runSchoolStatsJob();
      },
      { timezone: TZ },
    );
  }

  if (directTimerGuard) {
    cron.schedule(
      timerGuardSchedule,
      async () => {
        await runTimerSessionGuardJob();
      },
      { timezone: TZ },
    );
  }

  if (directMailReturn) {
    cron.schedule(
      personalMailReturnSchedule,
      async () => {
        await runPersonalMailReturnBatchJob();
      },
      { timezone: TZ },
    );
  }

  if (managerEnabled) {
    cron.schedule(
      cronManagerSchedule,
      async () => {
        await runCronManagerJob();
      },
      { timezone: TZ },
    );
  }

  for (const reverificationSchedule of reverificationSchedules) {
    cron.schedule(
      reverificationSchedule,
      async () => {
        await runReverificationGuideJob();
      },
      { timezone: TZ },
    );
  }

  cron.schedule(
    adminStatsSchedule,
    async () => {
      await runAdminStatsReconcileJob();
    },
    { timezone: TZ },
  );

  cron.schedule(
    attendanceSuspicionSchedule,
    async () => {
      await runAttendanceSuspicionJob();
    },
    { timezone: TZ },
  );

  cron.schedule(
    adminRetentionSchedule,
    async () => {
      await runAdminRetentionJob();
    },
    { timezone: TZ },
  );

  cron.schedule(
    analyticsReconcileSchedule,
    async () => {
      await runAnalyticsReconcileJob();
    },
    { timezone: TZ },
  );

  cron.schedule(
    schoolTermsSchedule,
    async () => {
      await runSchoolTermsSyncJob();
    },
    { timezone: TZ },
  );

  cron.schedule(
    schoolSemesterInferSchedule,
    async () => {
      await runSchoolSemesterInferJob();
    },
    { timezone: TZ },
  );

  setImmediate(() => {
    maybeBootSchoolTermsSync().catch((err) => {
      console.warn('[schoolTerms] boot sync', err?.message || err);
    });
    maybeBootSchoolSemesterInfer().catch((err) => {
      console.warn('[semester-infer] boot', err?.message || err);
    });
  });

  console.log(
    `[BatchJob] started timezone=${TZ} manager="${managerEnabled ? cronManagerSchedule : 'off'}" schoolStats=${directSchoolStats ? `"${schoolStatsSchedule}"` : 'via-manager'} timerGuard=${directTimerGuard ? `"${timerGuardSchedule}"` : 'via-manager'} personalMailReturn=${directMailReturn ? `"${personalMailReturnSchedule}"` : 'via-manager'} studyGrass="${studyGrassSchedule}" trending="${trendingSchedule}" reverification="${reverificationSchedules.join('|')}" adminStats="${adminStatsSchedule}" attendanceSuspicion="${attendanceSuspicionSchedule}" adminRetention="${adminRetentionSchedule}" analyticsReconcile="${analyticsReconcileSchedule}" schoolTerms="${schoolTermsSchedule}" semesterInfer="${schoolSemesterInferSchedule}"`,
  );
}

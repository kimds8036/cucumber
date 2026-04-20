import cron from 'node-cron';
import { runStudyGrassAggregateJob } from './studyGrass.aggregate.js';
import { runTrendingSettleJob } from './trending.settle.js';
import { runSchoolStatsJob } from './schoolStats.js';
import { runTimerSessionGuardJob } from './timerSession.guard.js';

const TZ = process.env.CRON_TIMEZONE || 'Asia/Seoul';

function isCronEnabled() {
  const value = (process.env.ENABLE_CRON || 'true').toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

export function initJobs() {
  if (!isCronEnabled()) {
    console.log('[BatchJob] ENABLE_CRON=false - 스케줄러를 시작하지 않습니다.');
    return;
  }

  const studyGrassSchedule = process.env.CRON_STUDY_GRASS || '5 * * * *';
  const trendingSchedule = process.env.CRON_TRENDING_SETTLE || '*/10 * * * *';
  const schoolStatsSchedule = process.env.CRON_SCHOOL_STATS || '0 * * * *';
  const timerGuardSchedule = process.env.CRON_TIMER_GUARD || '*/10 * * * *';

  cron.schedule(
    studyGrassSchedule,
    async () => {
      await runStudyGrassAggregateJob();
    },
    { timezone: TZ }
  );

  cron.schedule(
    trendingSchedule,
    async () => {
      await runTrendingSettleJob();
    },
    { timezone: TZ }
  );

  cron.schedule(
    schoolStatsSchedule,
    async () => {
      await runSchoolStatsJob();
    },
    { timezone: TZ }
  );

  cron.schedule(
    timerGuardSchedule,
    async () => {
      await runTimerSessionGuardJob();
    },
    { timezone: TZ }
  );

  console.log(
    `[BatchJob] started timezone=${TZ} studyGrass="${studyGrassSchedule}" trending="${trendingSchedule}" schoolStats="${schoolStatsSchedule}" timerGuard="${timerGuardSchedule}" timerStaleMinutes="${process.env.CRON_TIMER_STALE_MINUTES || '60'}"`
  );
}

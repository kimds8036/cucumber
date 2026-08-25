/** 모니터링용 크론 설명. job_name 은 jobs/*.js persist 키와 같아야 한다. */

export const CRON_JOB_CATALOG = [
  {
    key: 'study-grass-aggregate',
    emoji: '🌱',
    title: '공부 잔디',
    whenDefault: '매시 5분',
    envKey: 'CRON_STUDY_GRASS',
    defaultCron: '5 * * * *',
    blurb: '오늘 학교에서 누가 얼마나 공부했는지 모아서 잔디·순위에 넣어요.',
  },
  {
    key: 'trending-settle',
    emoji: '🔥',
    title: '인기글 정리',
    whenDefault: '10분마다',
    envKey: 'CRON_TRENDING_SETTLE',
    defaultCron: '*/10 * * * *',
    blurb: '요즘 뜨는 글·해시태그 순서를 다시 매겨요.',
  },
  {
    key: 'school-stats',
    emoji: '🏫',
    title: '학교 통계',
    whenDefault: '매시 정각',
    envKey: 'CRON_SCHOOL_STATS',
    defaultCron: '0 * * * *',
    blurb: '글 댓글 수를 맞춰요. 평소엔 새로 생긴 것만, 가끔 전체를 다시 세어요.',
  },
  {
    key: 'timer-session-guard',
    emoji: '⏱️',
    title: '타이머 지킴이',
    whenDefault: '10분마다',
    envKey: 'CRON_TIMER_GUARD',
    defaultCron: '*/10 * * * *',
    blurb: '너무 오래 켜진 공부 타이머를 정리해서 시간이 이상하게 안 쌓이게 해요.',
  },
  {
    key: 'personal-mail-return',
    emoji: '✉️',
    title: '개인 우편 반송',
    whenDefault: '30분마다',
    envKey: 'CRON_PERSONAL_MAIL_RETURN',
    defaultCron: '*/30 * * * *',
    blurb: '받을 수 없는 개인 우편을 돌려보내요.',
  },
  {
    key: 'reverification-guide',
    emoji: '🪪',
    title: '재인증 안내',
    whenDefault: '2말~3초 새벽 4시',
    envKey: 'CRON_REVERIFICATION_GUIDE',
    defaultCron: '0 4 25-29 2 * | 0 4 1-8 3 *',
    blurb: '학년도가 바뀔 때 학생증 다시 올리라고 알려 줘요. 그 시기만 돌아요.',
  },
  {
    key: 'admin-stats-reconcile',
    emoji: '📊',
    title: '관리자 숫자 맞춤',
    whenDefault: '5분마다',
    envKey: 'CRON_ADMIN_STATS',
    defaultCron: '*/5 * * * *',
    blurb: '대시보드에 찍히는 신고·문의 건수가 실제랑 안 어긋나게 맞춰요.',
  },
  {
    key: 'attendance-suspicion',
    emoji: '🎒',
    title: '미등교 의심',
    whenDefault: '매일 새벽 3시',
    envKey: 'CRON_ATTENDANCE_SUSPICION',
    defaultCron: '0 3 * * *',
    blurb: '등교 체크가 거의 없는 학생을 골라 관리자 등교 현황에 올려요.',
  },
  {
    key: 'admin-retention',
    emoji: '🧹',
    title: '오래된 기록 정리',
    whenDefault: '일요일 새벽 5시',
    envKey: 'CRON_ADMIN_RETENTION',
    defaultCron: '0 5 * * 0',
    blurb: '너무 오래된 운영 로그를 지워서 DB가 불어나지 않게 해요.',
  },
  {
    key: 'analytics-reconcile',
    emoji: '📈',
    title: '이용 지표 맞춤',
    whenDefault: '매일 새벽 4시',
    envKey: 'CRON_ANALYTICS_RECONCILE',
    defaultCron: '0 4 * * *',
    blurb: 'DAU/MAU 같은 이용 숫자가 Redis·DB에서 빠지지 않게 다시 맞춰요.',
  },
  {
    key: 'school-terms-sync',
    emoji: '📅',
    title: '학기·개학 동기화',
    whenDefault: '월요일 새벽 4시',
    envKey: 'CRON_SCHOOL_TERMS',
    defaultCron: '0 4 * * 1',
    blurb: 'NEIS에서 개학·방학을 가져와 등교 가능 날을 판단할 수 있게 해요.',
  },
];

function cronToKorean(expr) {
  const raw = String(expr || '').trim();
  const map = {
    '5 * * * *': '매시 5분',
    '*/10 * * * *': '10분마다',
    '0 * * * *': '매시 정각',
    '*/30 * * * *': '30분마다',
    '*/5 * * * *': '5분마다',
    '0 3 * * *': '매일 새벽 3시',
    '0 5 * * 0': '일요일 새벽 5시',
    '0 4 * * *': '매일 새벽 4시',
    '0 4 * * 1': '월요일 새벽 4시',
    '0 4 25-29 2 *': '2월 25~29일 새벽 4시',
    '0 4 1-8 3 *': '3월 1~8일 새벽 4시',
  };
  if (map[raw]) return map[raw];
  if (raw.includes('|')) {
    return raw
      .split('|')
      .map((p) => cronToKorean(p.trim()))
      .join(' · ');
  }
  return raw || '-';
}

export function getCronJobCatalogForOps() {
  const tz = process.env.CRON_TIMEZONE || 'Asia/Seoul';
  return {
    timezone: tz,
    enabledHint: '서버가 켜져 있으면 아래 시각(한국)에 알아서 돌아요.',
    jobs: CRON_JOB_CATALOG.map((j) => {
      let cronExpr = j.defaultCron;
      if (j.key === 'reverification-guide') {
        cronExpr = process.env[j.envKey]
          ? process.env[j.envKey]
          : j.defaultCron;
      } else if (process.env[j.envKey]) {
        cronExpr = process.env[j.envKey];
      }
      return {
        key: j.key,
        emoji: j.emoji,
        title: j.title,
        blurb: j.blurb,
        when: cronToKorean(cronExpr) || j.whenDefault,
        cron: cronExpr,
      };
    }),
  };
}

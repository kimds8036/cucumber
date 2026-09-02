/** 모니터링용 크론 설명. job_name 은 jobs/*.js persist 키와 같아야 한다. */

export const CRON_JOB_CATALOG = [
  {
    key: 'cron-manager',
    emoji: '🎛️',
    title: '크론 매니저',
    whenDefault: '1분마다',
    envKey: 'CRON_MANAGER',
    defaultCron: '* * * * *',
    blurb: '할 일이 예약된 작업만 골라 워커에게 배정해요. 예약이 없으면 거의 그냥 끝나요.',
  },
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
    whenDefault: '예약·안전망',
    envKey: 'CRON_SCHOOL_STATS',
    defaultCron: 'via-manager',
    blurb: '가입·학교 글이 생기면 예약돼요. 매니저가 해당 학교만 맞추고, 새벽에 한 번 전체 안전망을 돌려요.',
  },
  {
    key: 'timer-session-guard',
    emoji: '⏱️',
    title: '타이머 지킴이',
    whenDefault: '예약·매시 안전망',
    envKey: 'CRON_TIMER_GUARD',
    defaultCron: 'via-manager',
    blurb: '타이머가 켜지면 예약돼요. 너무 오래 켜진 세션을 정리해요.',
  },
  {
    key: 'personal-mail-return',
    emoji: '✉️',
    title: '개인 우편 반송',
    whenDefault: '기한 예약',
    envKey: 'CRON_PERSONAL_MAIL_RETURN',
    defaultCron: 'via-manager',
    blurb: '우편을 보낼 때 반송 시각으로 예약돼요. 받을 수 없으면 돌려보내요.',
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
    blurb: '오래된 운영 로그·아카이브 신고와, 90일 넘은 비활성 FCM 토큰을 지워요.',
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
  {
    key: 'school-semester-infer',
    emoji: '🧭',
    title: '개학·방학 유추',
    whenDefault: '매일 새벽 5시(시즌)',
    envKey: 'CRON_SEMESTER_INFER',
    defaultCron: '0 5 * * *',
    blurb: '급식·시간표로 2학기 개학 등을 유추해요. 7~9월·12~3월만 돌고, 확정된 학교는 다음번에 건너뛰어요.',
  },
];

function cronToKorean(expr) {
  const raw = String(expr || '').trim();
  const map = {
    '* * * * *': '1분마다',
    'via-manager': '예약·매니저',
    '5 * * * *': '매시 5분',
    '*/10 * * * *': '10분마다',
    '0 * * * *': '매시 정각',
    '*/30 * * * *': '30분마다',
    '*/5 * * * *': '5분마다',
    '0 3 * * *': '매일 새벽 3시',
    '0 5 * * *': '매일 새벽 5시',
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
    enabledHint:
      '할 일이 생기면 예약되고, 크론 매니저가 배정해요. 예약이 없으면 매니저만 짧게 확인합니다.',
    jobs: CRON_JOB_CATALOG.map((j) => {
      let cronExpr = j.defaultCron;
      if (j.key === 'reverification-guide') {
        cronExpr = process.env[j.envKey]
          ? process.env[j.envKey]
          : j.defaultCron;
      } else if (j.defaultCron === 'via-manager') {
        cronExpr = 'via-manager';
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

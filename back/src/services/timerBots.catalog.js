/** 타이머 친구 줄에 보이는 봇. school_id 에는 넣지 않는다. */

function parseMinutes(hm) {
  const [hour, minute] = String(hm).split(':').map((part) => Number(part));
  return hour * 60 + minute;
}

function kstClock(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const part = (type) => parts.find((row) => row.type === type)?.value || '';
  let hour = Number(part('hour'));
  if (hour === 24) hour = 0;
  return {
    weekday: part('weekday'),
    minutes: hour * 60 + Number(part('minute')),
  };
}

function inWindow(minutes, start, end) {
  if (end > start) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

function inBreak(minutes, breaks) {
  return breaks.some((hm) => {
    const start = parseMinutes(hm);
    return minutes >= start && minutes < start + 15;
  });
}

export const TIMER_BOTS = [
  {
    username: 'haeun02',
    name: '김하은',
    schoolName: '휘문고등학교',
    grade: 2,
    classNumber: 3,
    weekday: { start: '16:00', end: '22:40', breaks: ['17:05', '18:40', '20:10'] },
    weekend: { start: '11:00', end: '21:00', breaks: ['12:20', '14:30', '16:40', '18:50'] },
  },
  {
    username: 'minjae_k',
    name: '이민재',
    schoolName: '해운대중학교',
    grade: 3,
    classNumber: 2,
    weekday: { start: '16:20', end: '23:10', breaks: ['17:30', '19:00', '20:40', '22:00'] },
    weekend: { start: '11:20', end: '21:30', breaks: ['13:00', '15:10', '17:20', '19:30'] },
  },
  {
    username: 'yoonseo',
    name: '박윤서',
    schoolName: '수원고등학교',
    grade: 1,
    classNumber: 5,
    weekday: { start: '16:40', end: '23:40', breaks: ['18:00', '19:30', '21:05'] },
    weekend: { start: '11:40', end: '22:00', breaks: ['13:20', '15:40', '18:00'] },
  },
  {
    username: 'seoa_h',
    name: '최서아',
    schoolName: '전주중학교',
    grade: 2,
    classNumber: 1,
    weekday: { start: '17:00', end: '00:20', breaks: ['18:10', '19:50', '21:30', '23:00'] },
    weekend: { start: '12:00', end: '23:00', breaks: ['13:40', '16:00', '18:20', '20:40'] },
  },
  {
    username: 'junepark',
    name: '정준',
    schoolName: '경복고등학교',
    grade: 3,
    classNumber: 4,
    weekday: { start: '17:10', end: '00:40', breaks: ['18:20', '20:00', '21:40', '23:20'] },
    weekend: { start: '12:30', end: '23:40', breaks: ['14:10', '16:30', '18:50', '21:10'] },
  },
  {
    username: 'harin_y',
    name: '강하린',
    schoolName: '청주중학교',
    grade: 1,
    classNumber: 6,
    weekday: { start: '17:30', end: '01:00', breaks: ['18:45', '20:20', '22:00', '23:40'] },
    weekend: { start: '13:00', end: '00:20', breaks: ['14:40', '17:00', '19:20', '21:40'] },
  },
  {
    username: 'doyun7',
    name: '윤도윤',
    schoolName: '대구고등학교',
    grade: 2,
    classNumber: 7,
    weekday: { start: '18:00', end: '01:20', breaks: ['19:10', '20:50', '22:30', '00:05'] },
    weekend: { start: '13:30', end: '00:50', breaks: ['15:10', '17:30', '19:50', '22:10', '23:40'] },
  },
  {
    username: 'chaewon_k',
    name: '장채원',
    schoolName: '춘천고등학교',
    grade: 1,
    classNumber: 2,
    weekday: { start: '18:20', end: '01:40', breaks: ['19:30', '21:00', '22:40', '00:20', '01:05'] },
    weekend: { start: '14:00', end: '01:20', breaks: ['15:40', '18:00', '20:20', '22:40', '00:10'] },
  },
  {
    username: 'rio_study',
    name: '한리오',
    schoolName: '제주중앙중학교',
    grade: 3,
    classNumber: 5,
    weekday: { start: '18:40', end: '02:00', breaks: ['19:50', '21:20', '22:55', '00:35', '01:25'] },
    weekend: { start: '14:30', end: '01:50', breaks: ['16:10', '18:30', '20:50', '23:10', '00:40'] },
  },
  {
    username: 'siyoon',
    name: '서시윤',
    schoolName: '광주제일고등학교',
    grade: 2,
    classNumber: 4,
    weekday: { start: '19:00', end: '02:10', breaks: ['20:15', '21:45', '23:15', '00:50'] },
    weekend: { start: '15:00', end: '02:00', breaks: ['16:40', '19:00', '21:20', '23:40', '01:00'] },
  },
];

const BY_USERNAME = new Map(TIMER_BOTS.map((bot) => [bot.username, bot]));

export function timerBotByUsername(username) {
  return BY_USERNAME.get(String(username || '').replace(/^@/, '')) || null;
}

/** @returns {'off'|'rest'|'study'} */
export function timerBotPhase(bot, date = new Date()) {
  const clock = kstClock(date);
  const weekend = clock.weekday === 'Sat' || clock.weekday === 'Sun';
  const window = weekend ? bot.weekend : bot.weekday;
  const start = parseMinutes(window.start);
  const end = parseMinutes(window.end);
  if (!inWindow(clock.minutes, start, end)) return 'off';
  if (inBreak(clock.minutes, window.breaks)) return 'rest';
  return 'study';
}

export function timerBotSchoolLine(bot) {
  return `${bot.schoolName} ${bot.grade}학년 ${bot.classNumber}반`;
}

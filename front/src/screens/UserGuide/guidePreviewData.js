import { getTimerDayKey } from '../../../utils/timerStorage';

const GUIDE_BOARD_POSTS = [
  {
    id: 9001,
    author: '익명',
    time: '2시간 전',
    location: '',
    content:
      '학생들만의 고민을 익명으로 자유롭게 나누고 친구들과 생각을 공유해 보세요.',
    likes: 13,
    comments: 54,
    liked: false,
    scrapped: false,
    scrapCount: 0,
    isMyPost: false,
    authorUserId: null,
    thumbnail: null,
    tags: [],
    distanceKm: 3,
  },
  {
    id: 9002,
    author: '익명',
    time: '2시간 전',
    location: '',
    content: '중간고사 D-7 같이 공부하실 분?...',
    likes: null,
    comments: 89,
    liked: false,
    scrapped: false,
    scrapCount: 0,
    isMyPost: false,
    authorUserId: null,
    thumbnail: null,
    tags: ['#공부', '#중간고사'],
    distanceKm: 0.024,
  },
  {
    id: 9003,
    author: '익명',
    time: '2시간 전',
    location: '',
    content: '오늘 공부 인증합니다',
    likes: 10,
    comments: null,
    liked: false,
    scrapped: false,
    scrapCount: 0,
    isMyPost: false,
    authorUserId: null,
    thumbnail: null,
    tags: ['#타이머', '#공부', '#공친구함'],
    distanceKm: 12,
  },
  {
    id: 9004,
    author: '익명',
    time: '2시간 전',
    location: '',
    content: '남친이 시험기간이라...',
    likes: 213,
    comments: 89,
    liked: false,
    scrapped: false,
    scrapCount: 0,
    isMyPost: false,
    authorUserId: null,
    thumbnail: null,
    tags: [],
    distanceKm: 87,
  },
];

const GUIDE_MESSAGE_ITEMS = [
  { kind: 'note', name: '익명', content: '오늘 밥 뭐 나옴?' },
  { kind: 'note', name: '익명', content: '안녕' },
  { kind: 'note', name: '익명', content: '몇 반이야?' },
  { kind: 'dm', name: '홍길동', content: '오늘 급식 머야?', unread: 1 },
  { kind: 'note', name: '익명', content: '왜 그래?' },
  { kind: 'dm', name: '김철수', content: 'ㅋㅋㅋㅋㅋ' },
  { kind: 'note', name: '익명', content: '친해지고 싶어!' },
  { kind: 'note', name: '익명', content: '수업 끝나고 연락할게' },
  { kind: 'dm', name: '김라온', content: '오늘 학원 가?' },
];

function buildGuideNoteRooms() {
  return GUIDE_MESSAGE_ITEMS.map((item, idx) => {
    if (item.kind === 'dm') {
      return {
        type: 'dm',
        id: 9100 + idx,
        profileColorIndex: idx,
        profileColorId: idx,
        name: item.name,
        content: item.content,
        time: '18:20',
        unreadCount: item.unread || 0,
        other_user_id: 9200 + idx,
        other_user_name: item.name,
        other_user_school_name: '한국고등학교',
        other_user_color_id: idx,
        sortTime: 1_700_000_000_000 - idx,
      };
    }
    return {
      type: 'note',
      id: 9100 + idx,
      profileColorIndex: idx,
      profileColorId: idx,
      name: '익명',
      content: item.content,
      time: '18:20',
      unreadCount: item.unread || 0,
      sortTime: 1_700_000_000_000 - idx,
      other_user_id: null,
      other_user_name: null,
    };
  });
}

function buildGuideMails() {
  return GUIDE_MESSAGE_ITEMS.map((item, idx) => ({
    id: 9300 + idx,
    roomId: 9400 + idx,
    counterpartyUserId: null,
    profileColorIndex: idx,
    profileColorId: idx,
    isReceived: true,
    isReturned: false,
    replyToMySent: false,
    senderName: item.name === '익명' ? '익명' : item.name,
    directionText: item.name === '익명' ? '익명' : item.name,
    previewText: item.content,
    time: '18:20',
    unreadCount: item.unread || 0,
    raw: { id: 9300 + idx, content: item.content },
  }));
}

export function getGuideBoardPosts() {
  return GUIDE_BOARD_POSTS;
}

export function getGuideNoteRooms() {
  return buildGuideNoteRooms();
}

export function getGuideMails() {
  return buildGuideMails();
}

export function getGuideSchoolInfo() {
  return {
    id: 1,
    name: '한국고등학교',
    location: '서울특별시 대한구 민국동',
    studentCount: 217,
    postCount: 429,
    mailCount: 76,
    eduOfficeCode: '',
    adminStandardCode: '',
  };
}

export function getGuideSchoolMeals() {
  const menusByDay = [
    ['기장밥', '순대국', '오이도라지…', '교자만두구이', '석박지', '적포도'],
    ['추가밥&김자반', '자계치', '짬뽕국', '유린기', '깍두기', '마시는요구…'],
    ['마카니커리…', '샤브샤브국', '김가루청포묵', '소목살스테…', '깍두기', '사과주스'],
  ];
  const ymds = ['20260526', '20260527', '20260528'];
  return menusByDay.map((menus, idx) => ({
    ymd: ymds[idx],
    mealType: 'lunch',
    menus,
  }));
}

export function getGuideStudyGrassDays() {
  const rows = [];
  const now = new Date();
  for (let m = 2; m <= 7; m += 1) {
    const daysInMonth = new Date(now.getFullYear(), m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d += 1) {
      const dayKey = `${now.getFullYear()}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hours = ((m + d) % 6) * 0.8 + 0.4;
      rows.push({ dayKey, totalElapsedMs: Math.round(hours * 3600000) });
    }
  }
  return rows;
}

export function getGuideMyPageUserInfo() {
  return {
    name: '홍길동',
    username: '@honggildong',
    colorId: 1,
    school: '한국중학교',
    gradeClass: '3학년 2반',
    profileColorHex: null,
    profileColorId: 1,
    profileColorNumber: 1,
    friendCount: 13,
  };
}

export function getGuideMyPageStats() {
  return { friendCount: 13, postCount: 24, scrapCount: 0 };
}

export function getGuideTimetable() {
  const days = ['월', '화', '수', '목', '금'];
  const table = [
    ['영어', '역사', '국어', '도덕', '영어'],
    ['미술', '기술·가정', '진로와직업', '영어', '체육'],
    ['미술', '과학', '역사', '과학', '과학'],
    ['기술·가정', '수학', '체육', '국어', '영어'],
    ['수학', '사회', '과학', '체육', '기술·가정'],
    ['국어', '영어', '동아리활동', '수학', '사회'],
    ['동아리활동', '국어', '', '', '자율활동'],
  ];
  const out = {};
  table.forEach((row, periodIdx) => {
    const period = periodIdx + 1;
    days.forEach((day, dayIdx) => {
      const subject = row[dayIdx];
      if (subject) out[`${day}-${period}`] = subject;
    });
  });
  return out;
}

export function getGuideTimerFriends() {
  return [
    { id: 801, name: '홍길동', username: 'hong', colorId: 1, colorIndex: 0 },
    { id: 802, name: '김철수', username: 'kim', colorId: 2, colorIndex: 1 },
    { id: 803, name: '김영희', username: 'young', colorId: 3, colorIndex: 2 },
    { id: 804, name: '김라온', username: 'raon', colorId: 4, colorIndex: 3 },
  ];
}

export function getGuideTimerDayPayload() {
  const dayKey = getTimerDayKey(new Date());
  const subjects = [
    { id: 1, name: '국어', color: '#F8B4C7' },
    { id: 2, name: '수학', color: '#93C5FD' },
    { id: 3, name: '영어', color: '#FDBA74' },
  ];
  const tasks = [
    { id: 1, subjectId: 1, content: '할 일: 국어 ~p64', status: 'pending' },
    { id: 2, subjectId: 2, content: '', status: 'pending' },
    { id: 3, subjectId: 3, content: '', status: 'pending' },
  ];
  const hourToSeconds = (h) => (h - 6) * 3600;
  const sessions = [
    {
      subjectId: 1,
      subjectColor: '#F8B4C7',
      startSeconds: hourToSeconds(13),
      endSeconds: hourToSeconds(14),
      endedAtMs: Date.now() - 3600000,
      startedAtMs: Date.now() - 7200000,
    },
    {
      subjectId: 2,
      subjectColor: '#93C5FD',
      startSeconds: hourToSeconds(14),
      endSeconds: hourToSeconds(15),
      endedAtMs: Date.now() - 1800000,
      startedAtMs: Date.now() - 5400000,
    },
    {
      subjectId: 3,
      subjectColor: '#FDBA74',
      startSeconds: hourToSeconds(15),
      endSeconds: hourToSeconds(17),
      endedAtMs: Date.now() - 600000,
      startedAtMs: Date.now() - 4200000,
    },
  ];
  const totalElapsedMs = 5 * 3600000 + 35 * 60000 + 16 * 1000;
  return { dayKey, subjects, tasks, sessions, totalElapsedMs };
}

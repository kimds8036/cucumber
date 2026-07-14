/** 관리자·수집 API 공통 화면 화이트리스트 (익명 집계만) */
export const ANALYTICS_SCREEN_WHITELIST = [
  'board',
  'message',
  'school',
  'timer',
  'mypage',
  'chat',
  'school_board',
  'school_mail',
  'notification',
  'search',
  'friends',
];

export const ANALYTICS_SCREEN_LABELS = {
  board: '게시판',
  message: '쪽지',
  school: '우리학교',
  timer: '타이머',
  mypage: '마이페이지',
  chat: '채팅',
  school_board: '학교 게시판',
  school_mail: '학교 우편',
  notification: '알림',
  search: '검색',
  friends: '친구',
};

const SCREEN_SET = new Set(ANALYTICS_SCREEN_WHITELIST);

export function normalizeAnalyticsScreenKey(raw) {
  const key = String(raw || '').trim().toLowerCase();
  if (!key || !SCREEN_SET.has(key)) return null;
  return key;
}

export function getAnalyticsScreenLabel(key) {
  return ANALYTICS_SCREEN_LABELS[key] || key;
}

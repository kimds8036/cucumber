/** 백엔드 analytics 화이트리스트와 동일 키 유지 */
export const ANALYTICS_SCREEN_WHITELIST = new Set([
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
]);

/** React Navigation 라우트명 → analytics screen key */
export const ROUTE_TO_ANALYTICS_SCREEN = {
  Timer: 'timer',
  Chat: 'chat',
  DMChat: 'chat',
  SchoolBoardAll: 'school_board',
  SchoolMailbox: 'school_mail',
  SchoolMailDetail: 'school_mail',
  SendSchoolMail: 'school_mail',
  Notification: 'notification',
  Search: 'search',
  Friends: 'friends',
  BoardDetail: 'board',
  BoardWrite: 'board',
  MyPosts: 'board',
  MailDetail: 'message',
  MailHistory: 'message',
  SendMail: 'message',
  MailReply: 'message',
};

export const MAIN_TAB_TO_ANALYTICS_SCREEN = {
  board: 'board',
  message: 'message',
  school: 'school',
  timer: 'timer',
  mypage: 'mypage',
};

export function normalizeAnalyticsScreen(raw) {
  const key = String(raw || '').trim().toLowerCase();
  return ANALYTICS_SCREEN_WHITELIST.has(key) ? key : null;
}

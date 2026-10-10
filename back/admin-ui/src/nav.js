export const ROLE_LABELS = {
  super: '최고관리자',
  moderator: '운영관리자',
  support: '고객지원',
  verifier: '검수자',
};

export const PANEL_ACCESS = {
  dashboard: ['moderator', 'support', 'verifier'],
  ops: ['moderator'],
  reports: ['moderator'],
  processedReports: ['moderator'],
  appeals: ['moderator'],
  inquiries: ['moderator', 'support'],
  announcements: ['moderator', 'support'],
  tips: ['moderator', 'support'],
  recommendedHashtags: ['moderator', 'support'],
  featureTests: ['moderator'],
  processedInquiries: ['moderator', 'support'],
  studentIds: ['moderator', 'verifier'],
  manualSignup: ['moderator'],
  certificates: ['moderator', 'verifier'],
  reverificationIds: ['moderator', 'verifier'],
  attendance: ['moderator'],
  users: ['moderator'],
  logs: ['moderator', 'support'],
  emergency: ['super'],
  legalDocuments: ['moderator'],
  hallOfFame: ['moderator'],
  adminAccounts: ['super'],
};

export function canAccess(role, panel) {
  if (role === 'super') return true;
  return (PANEL_ACCESS[panel] || []).includes(role);
}

export const NAV_GROUPS = [
  {
    id: 'dashboard',
    label: '대시보드',
    icon: 'LayoutDashboard',
    items: [{ id: 'dashboard', label: '대시보드', panel: 'dashboard' }],
  },
  {
    id: 'moderation',
    label: '신고·제재',
    icon: 'ShieldAlert',
    items: [
      { id: 'reports', label: '신고 관리', panel: 'reports', badge: 'reports' },
      { id: 'processedReports', label: '처리 이력', panel: 'processedReports' },
      { id: 'appeals', label: '이의신청', panel: 'appeals', badge: 'appeals' },
      { id: 'users', label: '사용자 제재 현황', panel: 'users' },
    ],
  },
  {
    id: 'content',
    label: '문의·콘텐츠',
    icon: 'MessagesSquare',
    items: [
      { id: 'inquiries', label: '문의 관리', panel: 'inquiries', badge: 'inquiries' },
      { id: 'processedInquiries', label: '문의 처리 이력', panel: 'processedInquiries' },
      { id: 'announcements', label: '공지사항', panel: 'announcements' },
      { id: 'tips', label: '인앱 팁', panel: 'tips' },
      { id: 'recommendedHashtags', label: '추천 해시태그', panel: 'recommendedHashtags' },
      { id: 'hallOfFame', label: '회초리', panel: 'hallOfFame' },
      { id: 'legalDocuments', label: '약관·방침', panel: 'legalDocuments' },
    ],
  },
  {
    id: 'signup',
    label: '가입·인증',
    icon: 'UserPlus',
    items: [
      { id: 'manualSignup', label: '수동 가입', panel: 'manualSignup' },
      { id: 'studentIds', label: '학생 인증(학생증)', panel: 'studentIds', badge: 'studentIds' },
      { id: 'certificates', label: '재학증명서', panel: 'certificates', badge: 'certificates' },
      { id: 'reverificationIds', label: '재인증 학생증', panel: 'reverificationIds', badge: 'reverificationIds' },
    ],
  },
  {
    id: 'ops',
    label: '모니터링',
    icon: 'Activity',
    items: [
      { id: 'ops-user', label: '사용자', panel: 'ops', opsView: 'user' },
      { id: 'ops-timer', label: '타이머', panel: 'ops', opsView: 'timer' },
      { id: 'ops-study', label: '스터디룸', panel: 'ops', opsView: 'study-rooms' },
      { id: 'ops-activity', label: '앱 활동', panel: 'ops', opsView: 'activity' },
      { id: 'ops-jobs', label: '크론', panel: 'ops', opsView: 'jobs' },
      { id: 'ops-terms', label: '등교·학기', panel: 'ops', opsView: 'terms' },
      { id: 'ops-map', label: '전국 분포', panel: 'ops', opsView: 'map' },
      { id: 'ops-reach', label: '이용·설치', panel: 'ops', opsView: 'reach' },
      { id: 'ops-funnel', label: '설치 후 미가입', panel: 'ops', opsView: 'funnel' },
    ],
  },
  {
    id: 'people',
    label: '사용자·등교',
    icon: 'GraduationCap',
    items: [
      { id: 'attendance', label: '등교 현황', panel: 'attendance', badge: 'attendance' },
      { id: 'ops-user-lookup', label: '사용자 조회', panel: 'ops', opsView: 'user' },
    ],
  },
  {
    id: 'emergency',
    label: '비상 제어',
    icon: 'Siren',
    items: [{ id: 'emergency', label: '비상 제어', panel: 'emergency' }],
  },
  {
    id: 'audit',
    label: '감사 로그',
    icon: 'ScrollText',
    items: [{ id: 'logs', label: '변경 이력', panel: 'logs' }],
  },
  {
    id: 'settings',
    label: '설정',
    icon: 'Settings',
    items: [
      { id: 'adminAccounts', label: '관리자 계정', panel: 'adminAccounts' },
      { id: 'featureTests', label: '기능 테스트', panel: 'featureTests' },
    ],
  },
];

export function visibleItems(group, role) {
  return group.items.filter((item) => canAccess(role, item.panel));
}

export function findItem(page, opsView) {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((entry) => {
      if (entry.panel !== page) return false;
      if (entry.opsView) return entry.opsView === opsView;
      return !opsView;
    });
    if (item) return { group, item };
  }
  for (const group of NAV_GROUPS) {
    const item = group.items.find((entry) => entry.panel === page);
    if (item) return { group, item };
  }
  return { group: NAV_GROUPS[0], item: NAV_GROUPS[0].items[0] };
}

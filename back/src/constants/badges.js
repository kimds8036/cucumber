/** 배지 카탈로그 — 아이콘은 Ionicons name
 * 키(key)는 user_badges / equipped_badge_key 와 호환을 위해 유지한다.
 */

export const INVITE_BADGE_THRESHOLD = 1;
export const TIMER_DAYS_BADGE_TARGET = 7;
export const ATTEND_BADGE_THRESHOLD = 50;

export const BADGE_CATALOG = [
  {
    key: 'first_post',
    title: '첫 글',
    description: '게시글을 하나 작성하면 열려요',
    icon: 'leaf',
    iconOutline: 'leaf-outline',
    color: '#2E7D32',
  },
  {
    key: 'friends_invite_5',
    title: '친구 초대',
    description: '초대로 가입한 친구가 1명이 되면 열려요',
    icon: 'heart',
    iconOutline: 'heart-outline',
    color: '#E85D75',
  },
  {
    key: 'timer_streak_7',
    title: '일주일 타이머',
    description: '타이머를 사용한 날이 7일이 되면 열려요',
    icon: 'flame',
    iconOutline: 'flame-outline',
    color: '#E67A2E',
  },
  {
    key: 'attend_100',
    title: '등교 50일',
    description: '등교 체크 50일을 채우면 열려요',
    icon: 'sunny',
    iconOutline: 'sunny-outline',
    color: '#E6A817',
  },
];

export const BADGE_BY_KEY = Object.fromEntries(
  BADGE_CATALOG.map((b) => [b.key, b]),
);

export function sanitizeInviteCode(raw) {
  const code = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (code.length < 4 || code.length > 12) return '';
  return code;
}

export function serializeBadge(def, { owned = false, equipped = false, progress = null } = {}) {
  return {
    key: def.key,
    title: def.title,
    description: def.description,
    icon: def.icon,
    iconOutline: def.iconOutline,
    color: def.color,
    owned,
    equipped,
    progress,
  };
}

/** 프론트 배지 카탈로그 — 서버 constants/badges.js 와 키·아이콘 맞출 것 */

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
    description: '초대로 가입한 친구가 5명이 되면 열려요',
    icon: 'heart',
    iconOutline: 'heart-outline',
    color: '#E85D75',
  },
  {
    key: 'timer_streak_7',
    title: '일주일 타이머',
    description: '타이머를 7일 연속 실행하면 열려요',
    icon: 'flame',
    iconOutline: 'flame-outline',
    color: '#E67A2E',
  },
  {
    key: 'attend_100',
    title: '등교 100일',
    description: '등교 체크 100일을 채우면 열려요',
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

export function resolveEquippedBadge(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') {
    const key = raw.key || raw.equipped_badge_key;
    const def = BADGE_BY_KEY[key];
    if (!def) return null;
    return {
      key: def.key,
      icon: raw.icon || def.icon,
      color: raw.color || def.color,
      title: raw.title || def.title,
    };
  }
  const def = BADGE_BY_KEY[raw];
  if (!def) return null;
  return {
    key: def.key,
    icon: def.icon,
    color: def.color,
    title: def.title,
  };
}

export function equippedBadgeFromApiRow(row) {
  if (!row) return null;
  return resolveEquippedBadge(
    row.equippedBadge || row.equipped_badge_key || row.equippedBadgeKey,
  );
}

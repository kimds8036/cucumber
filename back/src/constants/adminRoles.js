export const ADMIN_ROLES = {
  SUPER: 'super',
  MODERATOR: 'moderator',
  SUPPORT: 'support',
  VERIFIER: 'verifier',
};

export const ALL_ADMIN_ROLES = Object.values(ADMIN_ROLES);

export function isValidAdminRole(role) {
  return ALL_ADMIN_ROLES.includes(String(role || '').toLowerCase());
}

export function roleLabel(role) {
  const r = String(role || '').toLowerCase();
  if (r === ADMIN_ROLES.SUPER) return '최고관리자';
  if (r === ADMIN_ROLES.MODERATOR) return '운영관리자';
  if (r === ADMIN_ROLES.SUPPORT) return '문의담당';
  if (r === ADMIN_ROLES.VERIFIER) return '인증검수';
  return r || '-';
}

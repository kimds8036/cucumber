import { ADMIN_ROLES } from '../constants/adminRoles.js';

export function requireAdminRole(...allowedRoles) {
  const allowed = allowedRoles.length ? allowedRoles : [ADMIN_ROLES.SUPER];
  return (req, res, next) => {
    const role = String(req.user?.adminRole || '').toLowerCase();
    if (!allowed.includes(role)) {
      return res.status(403).json({
        success: false,
        message: '이 작업을 수행할 권한이 없습니다.',
        code: 'ADMIN_ROLE_FORBIDDEN',
      });
    }
    return next();
  };
}

export function canAccessPanel(role, panel) {
  const r = String(role || '').toLowerCase();
  if (r === ADMIN_ROLES.SUPER) return true;
  const map = {
    dashboard: [ADMIN_ROLES.SUPER, ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPPORT, ADMIN_ROLES.VERIFIER],
    ops: [ADMIN_ROLES.SUPER, ADMIN_ROLES.MODERATOR],
    reports: [ADMIN_ROLES.SUPER, ADMIN_ROLES.MODERATOR],
    processedReports: [ADMIN_ROLES.SUPER, ADMIN_ROLES.MODERATOR],
    appeals: [ADMIN_ROLES.SUPER, ADMIN_ROLES.MODERATOR],
    inquiries: [ADMIN_ROLES.SUPER, ADMIN_ROLES.SUPPORT, ADMIN_ROLES.MODERATOR],
    processedInquiries: [ADMIN_ROLES.SUPER, ADMIN_ROLES.SUPPORT, ADMIN_ROLES.MODERATOR],
    manualSignup: [ADMIN_ROLES.SUPER, ADMIN_ROLES.MODERATOR],
    studentIds: [ADMIN_ROLES.SUPER, ADMIN_ROLES.VERIFIER, ADMIN_ROLES.MODERATOR],
    reverificationIds: [ADMIN_ROLES.SUPER, ADMIN_ROLES.VERIFIER, ADMIN_ROLES.MODERATOR],
    attendance: [ADMIN_ROLES.SUPER, ADMIN_ROLES.MODERATOR],
    users: [ADMIN_ROLES.SUPER, ADMIN_ROLES.MODERATOR],
    logs: [ADMIN_ROLES.SUPER, ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPPORT],
    emergency: [ADMIN_ROLES.SUPER],
    legalDocuments: [ADMIN_ROLES.SUPER, ADMIN_ROLES.MODERATOR],
    adminAccounts: [ADMIN_ROLES.SUPER],
  };
  return (map[panel] || []).includes(r);
}

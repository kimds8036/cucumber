import { authenticate } from './auth.js';

export function parseAdminUserIds() {
  const raw = process.env.ADMIN_USER_IDS || '';
  return raw
    .split(',')
    .map((v) => Number(String(v).trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function isAdminUser(userId) {
  const adminIds = parseAdminUserIds();
  if (adminIds.length === 0) return false;
  return adminIds.includes(Number(userId));
}

function rejectAdmin(res, status, message, code) {
  return res.status(status).json({
    success: false,
    message,
    ...(code ? { code } : {}),
  });
}

/** /api/admin/* — JWT + ADMIN_USER_IDS + OTP(MFA) 완료 */
export const requireAdminApi = (req, res, next) => {
  authenticate(req, res, (authErr) => {
    if (authErr) return next(authErr);
    if (!req.user?.userId) {
      return rejectAdmin(res, 401, '인증 토큰이 필요합니다.');
    }
    if (!isAdminUser(req.user.userId)) {
      return rejectAdmin(res, 403, '관리자 권한이 필요합니다.', 'ADMIN_FORBIDDEN');
    }
    if (req.user.adminMfa !== true) {
      return rejectAdmin(
        res,
        403,
        '관리자 2차 인증(OTP)이 필요합니다.',
        'ADMIN_MFA_REQUIRED',
      );
    }
    return next();
  });
};

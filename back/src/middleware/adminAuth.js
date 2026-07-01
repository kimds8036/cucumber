import { authenticate } from './auth.js';

/** 관리자 JWT 세션 여부 (requireAdminApi 통과 후) */
export function isAdminUser(adminId) {
  return Number.isFinite(Number(adminId)) && Number(adminId) > 0;
}

function rejectAdmin(res, status, message, code) {
  return res.status(status).json({
    success: false,
    message,
    ...(code ? { code } : {}),
  });
}

/** /api/admin/* — 관리자 JWT(admin_session) + OTP(MFA) 완료 */
export const requireAdminApi = (req, res, next) => {
  authenticate(req, res, (authErr) => {
    if (authErr) return next(authErr);
    if (!req.user?.userId) {
      return rejectAdmin(res, 401, '인증 토큰이 필요합니다.');
    }
    if (req.user.type !== 'admin_session' || req.user.adminMfa !== true) {
      return rejectAdmin(res, 403, '관리자 권한이 필요합니다.', 'ADMIN_FORBIDDEN');
    }
    return next();
  });
};

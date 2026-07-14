import express from 'express';
import { requireAdminApi } from '../middleware/adminAuth.js';
import { requireAdminRole } from '../middleware/adminRoles.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';
import { getSystemFlags, setSystemFlags } from '../services/systemFlags.service.js';
import { writeAuditLog } from '../services/adminAudit.service.js';

const router = express.Router();

router.get('/flags', requireAdminApi, async (req, res) => {
  try {
    const flags = await getSystemFlags();
    return res.json({ success: true, data: flags });
  } catch (error) {
    console.error('system flags 조회 오류:', error);
    return res.status(500).json({ success: false, message: '시스템 플래그 조회 실패' });
  }
});

router.patch(
  '/flags',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.SUPER),
  async (req, res) => {
    const adminUserId = req.user.userId;
    const updates = req.body?.flags || req.body || {};
    const note = String(req.body?.note || '').trim() || null;
    const confirmOtp = String(req.body?.confirmOtp || '').trim();

    if (!confirmOtp || confirmOtp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: '비상 스위치 변경 시 OTP 6자리 확인이 필요합니다.',
        code: 'OTP_CONFIRM_REQUIRED',
      });
    }

    try {
      const { verifyTotpCode, getConfirmedTotpSecret } = await import('../services/adminTotp.service.js');
      const secret = await getConfirmedTotpSecret(adminUserId);
      if (!secret || !verifyTotpCode(secret, confirmOtp)) {
        return res.status(403).json({
          success: false,
          message: 'OTP 코드가 올바르지 않습니다.',
        });
      }

      const flags = await setSystemFlags(updates, { adminUserId, note });
      await writeAuditLog({
        adminUserId,
        actionType: 'system_flags_update',
        targetType: 'system',
        targetId: 0,
        note,
        extra: updates,
      });
      return res.json({ success: true, data: flags, message: '시스템 플래그가 업데이트되었습니다.' });
    } catch (error) {
      console.error('system flags 업데이트 오류:', error);
      return res.status(500).json({ success: false, message: '시스템 플래그 업데이트 실패' });
    }
  },
);

export default router;

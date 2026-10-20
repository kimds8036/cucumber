import express from 'express';
import { body } from 'express-validator';
import { requireAdminApi, isAdminUser } from '../middleware/adminAuth.js';
import { requireAdminRole } from '../middleware/adminRoles.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';
import { validate } from '../middleware/validate.js';
import { writeAuditLog } from '../services/adminAudit.service.js';
import { getDailyPushDraft, sendDailyAdminPush } from '../services/dailyAdminPush.service.js';

const router = express.Router();

router.get(
  '/today',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPPORT, ADMIN_ROLES.SUPER),
  async (req, res) => {
    try {
      if (!isAdminUser(req.user.userId)) {
        return res.status(403).json({ success: false, message: '권한 없음' });
      }
      const data = await getDailyPushDraft();
      return res.json({ success: true, data });
    } catch (error) {
      console.error('[admin/daily-push] 조회 오류:', error);
      return res.status(500).json({ success: false, message: '하루 알림을 불러오지 못했습니다.' });
    }
  },
);

router.post(
  '/send',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPPORT, ADMIN_ROLES.SUPER),
  validate([
    body('kind').isIn(['post', 'announcement', 'study_room']),
    body('postId').optional({ values: 'falsy' }).isInt({ min: 1 }),
    body('announcementId').optional({ values: 'falsy' }).isInt({ min: 1 }),
    body('phraseKind').optional({ values: 'falsy' }).isIn(['popular', 'worry', 'question', 'tip', 'review', 'topic']),
    body('topicLabel').optional({ values: 'falsy' }).isString().isLength({ max: 30 }),
    body('confirmReported').optional().isBoolean(),
  ]),
  async (req, res) => {
    try {
      if (!isAdminUser(req.user.userId)) {
        return res.status(403).json({ success: false, message: '권한 없음' });
      }
      const result = await sendDailyAdminPush({
        adminUserId: req.user.userId,
        kind: req.body.kind,
        boardType: req.body.boardType,
        postId: req.body.postId,
        announcementId: req.body.announcementId,
        phraseKind: req.body.phraseKind,
        topicLabel: req.body.topicLabel,
        confirmReported: req.body.confirmReported === true,
      });
      if (!result.ok) {
        return res.status(result.status).json({ success: false, message: result.message });
      }
      try {
        await writeAuditLog({
          adminUserId: req.user.userId,
          actionType: 'daily_push_send',
          targetType: 'daily_push',
          targetId: Number(req.body.postId || req.body.announcementId || 0),
          note: `${result.dayKey} ${result.title}`,
        });
      } catch (auditError) {
        console.error('[admin/daily-push] 감사 로그 실패:', auditError?.message || auditError);
      }
      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('[admin/daily-push] 발송 오류:', error);
      return res.status(500).json({ success: false, message: '하루 알림을 보내지 못했습니다.' });
    }
  },
);

export default router;

import express from 'express';
import { body, param, query } from 'express-validator';
import { requireAdminApi, isAdminUser } from '../middleware/adminAuth.js';
import { requireAdminRole } from '../middleware/adminRoles.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';
import { validate } from '../middleware/validate.js';
import { writeAuditLog } from '../services/adminAudit.service.js';
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementByIdForAdmin,
  listAnnouncementsForAdmin,
  updateAnnouncement,
} from '../services/announcements.service.js';

const router = express.Router();

const listValidators = [
  query('status').optional({ values: 'falsy' }).isIn(['draft', 'published']),
  query('limit').optional({ values: 'falsy' }).isInt({ min: 1, max: 200 }),
  query('offset').optional({ values: 'falsy' }).isInt({ min: 0 }),
];

const idValidators = [
  param('id').isInt({ min: 1 }).withMessage('유효한 공지 ID가 필요합니다.'),
];

const upsertValidators = [
  body('title').isString().trim().isLength({ min: 1, max: 200 })
    .withMessage('제목은 1~200자여야 합니다.'),
  body('content').isString().trim().isLength({ min: 1, max: 20000 })
    .withMessage('내용을 입력해 주세요.'),
  body('status').optional({ values: 'falsy' }).isIn(['draft', 'published']),
];

router.get(
  '/',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPPORT, ADMIN_ROLES.SUPER),
  validate(listValidators),
  async (req, res) => {
    try {
      if (!isAdminUser(req.user.userId)) {
        return res.status(403).json({ success: false, message: '권한 없음' });
      }
      const items = await listAnnouncementsForAdmin({
        status: req.query.status || null,
        limit: req.query.limit,
        offset: req.query.offset,
      });
      return res.json({ success: true, data: { items } });
    } catch (error) {
      console.error('[admin/announcements] 목록 오류:', error);
      return res.status(500).json({
        success: false,
        message: '공지사항 목록 조회 실패',
      });
    }
  },
);

router.get(
  '/:id',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPPORT, ADMIN_ROLES.SUPER),
  validate(idValidators),
  async (req, res) => {
    try {
      const item = await getAnnouncementByIdForAdmin(req.params.id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: '공지사항을 찾을 수 없습니다.',
        });
      }
      return res.json({ success: true, data: item });
    } catch (error) {
      console.error('[admin/announcements] 상세 오류:', error);
      return res.status(500).json({
        success: false,
        message: '공지사항 조회 실패',
      });
    }
  },
);

router.post(
  '/',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPPORT, ADMIN_ROLES.SUPER),
  validate(upsertValidators),
  async (req, res) => {
    try {
      const adminUserId = req.user.userId;
      const item = await createAnnouncement({
        title: req.body.title,
        content: req.body.content,
        status: req.body.status || 'draft',
        adminUserId,
      });
      await writeAuditLog({
        adminUserId,
        actionType: 'announcement_create',
        targetType: 'announcement',
        targetId: item.id,
        note: item.status === 'published' ? '게시' : '초안',
      }).catch(() => {});
      return res.status(201).json({ success: true, data: item });
    } catch (error) {
      if (error.status === 400) {
        return res.status(400).json({ success: false, message: error.message });
      }
      console.error('[admin/announcements] 생성 오류:', error);
      return res.status(500).json({
        success: false,
        message: '공지사항 생성 실패',
      });
    }
  },
);

router.patch(
  '/:id',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPPORT, ADMIN_ROLES.SUPER),
  validate([...idValidators, ...upsertValidators]),
  async (req, res) => {
    try {
      const adminUserId = req.user.userId;
      const item = await updateAnnouncement(req.params.id, {
        title: req.body.title,
        content: req.body.content,
        status: req.body.status,
        adminUserId,
      });
      if (!item) {
        return res.status(404).json({
          success: false,
          message: '공지사항을 찾을 수 없습니다.',
        });
      }
      await writeAuditLog({
        adminUserId,
        actionType: 'announcement_update',
        targetType: 'announcement',
        targetId: item.id,
        note: item.status,
      }).catch(() => {});
      return res.json({ success: true, data: item });
    } catch (error) {
      if (error.status === 400) {
        return res.status(400).json({ success: false, message: error.message });
      }
      console.error('[admin/announcements] 수정 오류:', error);
      return res.status(500).json({
        success: false,
        message: '공지사항 수정 실패',
      });
    }
  },
);

router.delete(
  '/:id',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPPORT, ADMIN_ROLES.SUPER),
  validate(idValidators),
  async (req, res) => {
    try {
      const adminUserId = req.user.userId;
      const ok = await deleteAnnouncement(req.params.id);
      if (!ok) {
        return res.status(404).json({
          success: false,
          message: '공지사항을 찾을 수 없습니다.',
        });
      }
      await writeAuditLog({
        adminUserId,
        actionType: 'announcement_delete',
        targetType: 'announcement',
        targetId: Number(req.params.id),
      }).catch(() => {});
      return res.json({ success: true });
    } catch (error) {
      console.error('[admin/announcements] 삭제 오류:', error);
      return res.status(500).json({
        success: false,
        message: '공지사항 삭제 실패',
      });
    }
  },
);

export default router;

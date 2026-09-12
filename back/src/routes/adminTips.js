import express from 'express';
import { body, param, query } from 'express-validator';
import { requireAdminApi, isAdminUser } from '../middleware/adminAuth.js';
import { requireAdminRole } from '../middleware/adminRoles.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';
import { validate } from '../middleware/validate.js';
import { writeAuditLog } from '../services/adminAudit.service.js';
import {
  createTip,
  deleteTip,
  getTipByIdForAdmin,
  listTipsForAdmin,
  updateTip,
} from '../services/tips.service.js';

const router = express.Router();

const listValidators = [
  query('status').optional({ values: 'falsy' }).isIn(['draft', 'active']),
  query('limit').optional({ values: 'falsy' }).isInt({ min: 1, max: 200 }),
  query('offset').optional({ values: 'falsy' }).isInt({ min: 0 }),
];

const idValidators = [
  param('id').isInt({ min: 1 }).withMessage('유효한 팁 ID가 필요합니다.'),
];

const createValidators = [
  body('body').isString().trim().isLength({ min: 1, max: 500 })
    .withMessage('팁 문구는 1~500자여야 합니다.'),
  body('status').optional({ values: 'falsy' }).isIn(['draft', 'active']),
  body('isPinned').optional().isBoolean(),
];

const patchValidators = [
  body('body').optional({ values: 'falsy' }).isString().trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('팁 문구는 1~500자여야 합니다.'),
  body('status').optional({ values: 'falsy' }).isIn(['draft', 'active']),
  body('isPinned').optional().isBoolean(),
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
      const items = await listTipsForAdmin({
        status: req.query.status || null,
        limit: req.query.limit,
        offset: req.query.offset,
      });
      return res.json({ success: true, data: { items } });
    } catch (error) {
      console.error('[admin/tips] 목록 오류:', error);
      return res.status(500).json({
        success: false,
        message: '팁 목록 조회 실패',
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
      const item = await getTipByIdForAdmin(req.params.id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: '팁을 찾을 수 없습니다.',
        });
      }
      return res.json({ success: true, data: item });
    } catch (error) {
      console.error('[admin/tips] 상세 오류:', error);
      return res.status(500).json({
        success: false,
        message: '팁 조회 실패',
      });
    }
  },
);

router.post(
  '/',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPPORT, ADMIN_ROLES.SUPER),
  validate(createValidators),
  async (req, res) => {
    try {
      const adminUserId = req.user.userId;
      const item = await createTip({
        body: req.body.body,
        status: req.body.status || 'draft',
        isPinned: Boolean(req.body.isPinned),
        adminUserId,
      });
      await writeAuditLog({
        adminUserId,
        actionType: 'tip.create',
        targetType: 'tip',
        targetId: item?.id,
        extra: { status: item?.status, isPinned: item?.isPinned },
      });
      return res.status(201).json({ success: true, data: item });
    } catch (error) {
      console.error('[admin/tips] 생성 오류:', error);
      return res.status(500).json({
        success: false,
        message: '팁 생성 실패',
      });
    }
  },
);

router.patch(
  '/:id',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPPORT, ADMIN_ROLES.SUPER),
  validate([...idValidators, ...patchValidators]),
  async (req, res) => {
    try {
      const hasBody = Object.prototype.hasOwnProperty.call(req.body, 'body');
      const hasStatus = Object.prototype.hasOwnProperty.call(req.body, 'status');
      const hasPin = Object.prototype.hasOwnProperty.call(req.body, 'isPinned');
      if (!hasBody && !hasStatus && !hasPin) {
        return res.status(400).json({
          success: false,
          message: '변경할 필드가 없습니다.',
        });
      }

      const existing = await getTipByIdForAdmin(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: '팁을 찾을 수 없습니다.',
        });
      }

      const item = await updateTip(req.params.id, {
        body: hasBody ? req.body.body : existing.body,
        status: hasStatus ? req.body.status : existing.status,
        isPinned: hasPin ? Boolean(req.body.isPinned) : existing.isPinned,
        adminUserId: req.user.userId,
      });
      await writeAuditLog({
        adminUserId: req.user.userId,
        actionType: 'tip.update',
        targetType: 'tip',
        targetId: item?.id,
        extra: { status: item?.status, isPinned: item?.isPinned },
      });
      return res.json({ success: true, data: item });
    } catch (error) {
      console.error('[admin/tips] 수정 오류:', error);
      return res.status(500).json({
        success: false,
        message: '팁 수정 실패',
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
      const ok = await deleteTip(req.params.id);
      if (!ok) {
        return res.status(404).json({
          success: false,
          message: '팁을 찾을 수 없습니다.',
        });
      }
      await writeAuditLog({
        adminUserId: req.user.userId,
        actionType: 'tip.delete',
        targetType: 'tip',
        targetId: Number(req.params.id),
      });
      return res.json({ success: true });
    } catch (error) {
      console.error('[admin/tips] 삭제 오류:', error);
      return res.status(500).json({
        success: false,
        message: '팁 삭제 실패',
      });
    }
  },
);

export default router;

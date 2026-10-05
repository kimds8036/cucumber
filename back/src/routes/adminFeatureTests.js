import express from 'express';
import { requireAdminApi } from '../middleware/adminAuth.js';
import { requireAdminRole } from '../middleware/adminRoles.js';
import {
  dryRunComment,
  dryRunPost,
  dispatchSocketToast,
  listFeatureTestUsers,
} from '../services/adminFeatureTest.service.js';

const router = express.Router();
const moderator = requireAdminRole('super', 'moderator');

function sendError(res, error) {
  if (error?.body && error.status) {
    return res.status(error.status).json(error.body);
  }
  console.error('[adminFeatureTests]', error);
  return res.status(500).json({
    success: false,
    message: '기능 테스트 중 오류가 발생했습니다.',
  });
}

router.get('/users', requireAdminApi, moderator, async (req, res) => {
  try {
    const users = await listFeatureTestUsers(req.query?.q);
    return res.json({ success: true, data: { users } });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/dry-run', requireAdminApi, moderator, async (req, res) => {
  try {
    const kind = String(req.body?.kind || '').trim();
    const targetUserId = req.body?.targetUserId;
    if (kind === 'post') {
      const data = await dryRunPost({
        targetUserId,
        boardType: req.body?.boardType,
        schoolId: req.body?.schoolId,
        content: req.body?.content,
      });
      return res.status(201).json(data);
    }
    if (kind === 'comment') {
      const data = await dryRunComment({
        targetUserId,
        postId: req.body?.postId,
        content: req.body?.content,
        parentCommentId: req.body?.parentCommentId,
      });
      return res.status(201).json(data);
    }
    return res.status(400).json({
      success: false,
      message: 'kind는 post 또는 comment 여야 합니다.',
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/socket-toast', requireAdminApi, moderator, async (req, res) => {
  try {
    const data = dispatchSocketToast({
      targetUserId: req.body?.targetUserId,
      eventType: req.body?.eventType,
      variant: req.body?.variant,
    });
    return res.json(data);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;

import express from 'express';
import { body, param, query } from 'express-validator';
import { requireAdminApi } from '../middleware/adminAuth.js';
import { requireAdminRole } from '../middleware/adminRoles.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';
import { validate } from '../middleware/validate.js';
import {
  adminAcceptBotRequests,
  adminListBotChats,
  adminListBotFriendRequests,
  adminListBotMessages,
  adminListBotPokes,
  adminMarkBotChatRead,
  adminRejectBotRequests,
  adminReplyAsBot,
  adminTimerBotOverview,
} from '../services/timerBots.service.js';

const router = express.Router();
const guard = [
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPPORT, ADMIN_ROLES.SUPER),
];

router.get('/', ...guard, async (_req, res) => {
  try {
    const [bots, requests, pokes] = await Promise.all([
      adminTimerBotOverview(),
      adminListBotFriendRequests(),
      adminListBotPokes(),
    ]);
    return res.json({ success: true, data: { bots, requests, pokes } });
  } catch (error) {
    console.error('[admin/timer-bots] 조회 오류', error);
    return res.status(500).json({ success: false, message: '봇 목록을 불러오지 못했습니다.' });
  }
});

router.post(
  '/requests/accept',
  ...guard,
  validate([body('ids').isArray({ min: 1 })]),
  async (req, res) => {
    try {
      const accepted = await adminAcceptBotRequests(req.body.ids);
      return res.json({ success: true, data: { accepted } });
    } catch (error) {
      console.error('[admin/timer-bots] 수락 오류', error);
      return res.status(500).json({ success: false, message: '친구 요청을 수락하지 못했습니다.' });
    }
  },
);

router.post(
  '/requests/reject',
  ...guard,
  validate([body('ids').isArray({ min: 1 })]),
  async (req, res) => {
    try {
      const rejected = await adminRejectBotRequests(req.body.ids);
      return res.json({ success: true, data: { rejected } });
    } catch (error) {
      console.error('[admin/timer-bots] 거절 오류', error);
      return res.status(500).json({ success: false, message: '친구 요청을 거절하지 못했습니다.' });
    }
  },
);

router.get(
  '/chats',
  ...guard,
  validate([query('botUserId').toInt().isInt({ min: 1 })]),
  async (req, res) => {
    try {
      const chats = await adminListBotChats(Number(req.query.botUserId));
      return res.json({ success: true, data: { chats } });
    } catch (error) {
      console.error('[admin/timer-bots] 채팅 목록 오류', error);
      return res.status(500).json({ success: false, message: '채팅 목록을 불러오지 못했습니다.' });
    }
  },
);

router.get(
  '/chats/:roomId',
  ...guard,
  validate([
    param('roomId').toInt().isInt({ min: 1 }),
    query('botUserId').toInt().isInt({ min: 1 }),
  ]),
  async (req, res) => {
    try {
      const messages = await adminListBotMessages(
        Number(req.query.botUserId),
        Number(req.params.roomId),
      );
      if (!messages) {
        return res.status(404).json({ success: false, message: '대화를 찾을 수 없습니다.' });
      }
      return res.json({ success: true, data: { messages } });
    } catch (error) {
      console.error('[admin/timer-bots] 메시지 오류', error);
      return res.status(500).json({ success: false, message: '메시지를 불러오지 못했습니다.' });
    }
  },
);

router.post(
  '/chats/:roomId/reply',
  ...guard,
  validate([
    param('roomId').toInt().isInt({ min: 1 }),
    body('botUserId').toInt().isInt({ min: 1 }),
    body('content').isString().isLength({ min: 1, max: 2000 }),
  ]),
  async (req, res) => {
    try {
      const result = await adminReplyAsBot(
        Number(req.body.botUserId),
        Number(req.params.roomId),
        req.body.content,
      );
      if (!result.ok) {
        return res.status(result.status).json({ success: false, message: result.message });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error('[admin/timer-bots] 답장 오류', error);
      return res.status(500).json({ success: false, message: '답장을 보내지 못했습니다.' });
    }
  },
);

router.post(
  '/chats/:roomId/read',
  ...guard,
  validate([
    param('roomId').toInt().isInt({ min: 1 }),
    body('botUserId').toInt().isInt({ min: 1 }),
  ]),
  async (req, res) => {
    try {
      const ok = await adminMarkBotChatRead(
        Number(req.body.botUserId),
        Number(req.params.roomId),
      );
      if (!ok) {
        return res.status(404).json({ success: false, message: '대화를 찾을 수 없습니다.' });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error('[admin/timer-bots] 읽음 오류', error);
      return res.status(500).json({ success: false, message: '읽음 처리하지 못했습니다.' });
    }
  },
);

export default router;

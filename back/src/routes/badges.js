import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { listBadgesForUser, equipBadge } from '../services/badge.service.js';

const router = express.Router();

router.get('/me', authenticate, async (req, res) => {
  try {
    const data = await listBadgesForUser(req.user.userId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[badges] me', error);
    return res.status(500).json({
      success: false,
      message: '배지 정보를 불러오지 못했습니다.',
    });
  }
});

router.put('/equip', authenticate, async (req, res) => {
  try {
    const badgeKey = req.body?.badgeKey ?? req.body?.key ?? null;
    const result = await equipBadge(req.user.userId, badgeKey);
    if (result.error) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message,
        code: result.error,
      });
    }
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[badges] equip', error);
    return res.status(500).json({
      success: false,
      message: '배지 장착에 실패했습니다.',
    });
  }
});

export default router;

import express from 'express';
import { listActiveTipsForApp } from '../services/tips.service.js';

const router = express.Router();

/** 앱: 활성 팁 풀 + 고정(있으면 1개) */
router.get('/', async (_req, res) => {
  try {
    const data = await listActiveTipsForApp();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[tips] 목록 오류:', error);
    return res.status(500).json({
      success: false,
      message: '팁 목록 조회 실패',
    });
  }
});

export default router;

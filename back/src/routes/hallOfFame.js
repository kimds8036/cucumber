import express from 'express';
import {
  listPublishedHallOfFame,
} from '../services/hallOfFame.service.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const items = await listPublishedHallOfFame();
    return res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('[hall-of-fame/list]', error);
    return res.status(500).json({
      success: false,
      message: '명예의 전당을 불러오지 못했습니다.',
    });
  }
});

export default router;

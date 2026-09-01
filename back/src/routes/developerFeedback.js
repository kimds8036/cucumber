import express from 'express';
import { body } from 'express-validator';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

const submitValidators = [
  body('category')
    .optional()
    .isIn(['bug', 'feature', 'other'])
    .withMessage('카테고리가 올바르지 않습니다.'),
  body('content')
    .isString()
    .bail()
    .trim()
    .isLength({ min: 5, max: 2000 })
    .withMessage('내용은 5자 이상 2000자 이하로 입력해 주세요.'),
  body('appVersion').optional({ values: 'falsy' }).isString().isLength({ max: 24 }),
  body('deviceInfo').optional({ values: 'falsy' }).isString().isLength({ max: 255 }),
];

router.post('/', authenticate, validate(submitValidators), async (req, res) => {
  try {
    const userId = req.user.userId;
    const category = String(req.body?.category || 'other').trim() || 'other';
    const content = String(req.body?.content || '').trim();
    const appVersion = String(req.body?.appVersion || '').trim().slice(0, 24) || null;
    const deviceInfo = String(req.body?.deviceInfo || '').trim().slice(0, 255) || null;

    const [result] = await pool.execute(
      `INSERT INTO developer_feedback (user_id, category, content, app_version, device_info)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, category, content, appVersion, deviceInfo],
    );

    return res.status(201).json({
      success: true,
      message: '피드백이 접수되었습니다.',
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error('[developer-feedback/submit]', error);
    return res.status(500).json({
      success: false,
      message: '피드백 접수 중 오류가 발생했습니다.',
    });
  }
});

export default router;

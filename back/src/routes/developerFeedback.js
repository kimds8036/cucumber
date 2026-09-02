import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listPublicDeveloperFeedback,
  createDeveloperFeedbackSubmission,
} from '../services/developerFeedback.service.js';

const router = express.Router();

const HONOREE_NAME_MAX = 10;
const CONTENT_MAX = 50;

const submitValidators = [
  body('category')
    .optional()
    .isIn(['bug', 'feature', 'other'])
    .withMessage('카테고리가 올바르지 않습니다.'),
  body('honoreeName')
    .isString()
    .bail()
    .trim()
    .isLength({ min: 1, max: HONOREE_NAME_MAX })
    .withMessage(`등재 희망 이름은 1~${HONOREE_NAME_MAX}자로 입력해 주세요.`),
  body('schoolPublic').isBoolean().withMessage('학교 공개 여부가 올바르지 않습니다.'),
  body('content')
    .isString()
    .bail()
    .trim()
    .isLength({ min: 1, max: CONTENT_MAX })
    .withMessage(`내용은 1~${CONTENT_MAX}자로 입력해 주세요.`),
  body('appVersion').optional({ values: 'falsy' }).isString().isLength({ max: 24 }),
  body('deviceInfo').optional({ values: 'falsy' }).isString().isLength({ max: 255 }),
];

router.get('/', authenticate, async (req, res) => {
  try {
    const items = await listPublicDeveloperFeedback({
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('[developer-feedback/list]', error);
    return res.status(500).json({
      success: false,
      message: '제보 목록을 불러오지 못했습니다.',
    });
  }
});

router.post('/', authenticate, validate(submitValidators), async (req, res) => {
  try {
    const result = await createDeveloperFeedbackSubmission({
      userId: req.user.userId,
      category: req.body?.category,
      honoreeName: req.body?.honoreeName,
      schoolPublic: req.body?.schoolPublic,
      content: req.body?.content,
      appVersion: req.body?.appVersion,
      deviceInfo: req.body?.deviceInfo,
    });

    return res.status(201).json({
      success: true,
      message: '피드백이 접수되었습니다.',
      data: result,
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

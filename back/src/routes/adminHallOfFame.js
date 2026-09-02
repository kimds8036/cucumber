import express from 'express';
import { body, param } from 'express-validator';
import { requireAdminApi, isAdminUser } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validate.js';
import {
  listAdminHallOfFame,
  getAdminHallOfFameEntry,
  createHallOfFameEntry,
  updateHallOfFameEntry,
  deleteHallOfFameEntry,
  listDeveloperFeedbackForAdmin,
  resolveHonoreeFromUser,
} from '../services/hallOfFame.service.js';
import {
  listDeveloperFeedbackGroupsForAdmin,
  getDeveloperFeedbackGroupDetailForAdmin,
  updateDeveloperFeedbackGroupResponse,
  mergeDeveloperFeedbackByIds,
} from '../services/developerFeedback.service.js';

const router = express.Router();

const entryBodyValidators = [
  body('summary').isString().trim().isLength({ min: 2, max: 500 }),
  body('sortOrder').optional().isInt({ min: -100000, max: 100000 }),
  body('isPublished').optional().isBoolean(),
  body('honorees').isArray({ min: 1 }),
  body('honorees.*.displayName').optional().isString().isLength({ max: 32 }),
  body('honorees.*.schoolName').optional().isString().isLength({ max: 128 }),
  body('honorees.*.userId').optional({ values: 'null' }).isInt({ min: 1 }),
  body('feedbackIds').optional().isArray(),
  body('feedbackIds.*').optional().isInt({ min: 1 }),
];

router.get('/', requireAdminApi, async (req, res) => {
  if (!isAdminUser(req.user.userId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const items = await listAdminHallOfFame();
    return res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('[admin/hall-of-fame/list]', error);
    return res.status(500).json({ success: false, message: '목록을 불러오지 못했습니다.' });
  }
});

router.get('/developer-feedback', requireAdminApi, async (req, res) => {
  if (!isAdminUser(req.user.userId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const items = await listDeveloperFeedbackForAdmin({
      limit: req.query.limit,
      q: req.query.q,
    });
    return res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('[admin/hall-of-fame/feedback]', error);
    return res.status(500).json({ success: false, message: '제보 목록을 불러오지 못했습니다.' });
  }
});

router.get('/developer-feedback/groups', requireAdminApi, async (req, res) => {
  if (!isAdminUser(req.user.userId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const items = await listDeveloperFeedbackGroupsForAdmin({
      limit: req.query.limit,
      q: req.query.q,
    });
    return res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('[admin/whack/groups]', error);
    return res.status(500).json({ success: false, message: '묶음 목록을 불러오지 못했습니다.' });
  }
});

router.get('/developer-feedback/groups/:groupId', requireAdminApi, async (req, res) => {
  if (!isAdminUser(req.user.userId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const group = await getDeveloperFeedbackGroupDetailForAdmin(req.params.groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: '제보 묶음을 찾을 수 없습니다.' });
    }
    return res.json({ success: true, data: group });
  } catch (error) {
    console.error('[admin/whack/group-get]', error);
    return res.status(500).json({ success: false, message: '제보 묶음을 불러오지 못했습니다.' });
  }
});

router.post(
  '/developer-feedback/groups/merge',
  requireAdminApi,
  validate([
    body('feedbackIds').isArray({ min: 2 }),
    body('feedbackIds.*').isInt({ min: 1 }),
  ]),
  async (req, res) => {
    if (!isAdminUser(req.user.userId)) {
      return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }
    try {
      const result = await mergeDeveloperFeedbackByIds(req.body.feedbackIds);
      if (result.error) {
        return res.status(400).json({ success: false, message: result.error });
      }
      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('[admin/hall-of-fame/feedback-merge]', error);
      return res.status(500).json({ success: false, message: '제보 묶기에 실패했습니다.' });
    }
  },
);

router.patch(
  '/developer-feedback/groups/:groupId',
  requireAdminApi,
  validate([
    param('groupId').isInt({ min: 1 }),
    body('adminResponse').optional({ values: 'falsy' }).isString().isLength({ max: 500 }),
    body('adminResponseStatus')
      .optional()
      .isIn(['none', 'fixed', 'planned', 'declined']),
  ]),
  async (req, res) => {
    if (!isAdminUser(req.user.userId)) {
      return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }
    try {
      const result = await updateDeveloperFeedbackGroupResponse(req.params.groupId, req.body);
      if (result.error) {
        return res.status(400).json({ success: false, message: result.error });
      }
      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('[admin/hall-of-fame/group-response]', error);
      return res.status(500).json({ success: false, message: '답변 저장에 실패했습니다.' });
    }
  },
);

router.get('/resolve-user/:userId', requireAdminApi, async (req, res) => {
  if (!isAdminUser(req.user.userId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const honoree = await resolveHonoreeFromUser(req.params.userId);
    if (!honoree) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    return res.json({ success: true, data: honoree });
  } catch (error) {
    console.error('[admin/hall-of-fame/resolve-user]', error);
    return res.status(500).json({ success: false, message: '사용자 정보를 불러오지 못했습니다.' });
  }
});

router.get('/:id', requireAdminApi, async (req, res) => {
  if (!isAdminUser(req.user.userId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const entry = await getAdminHallOfFameEntry(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: '항목을 찾을 수 없습니다.' });
    }
    return res.json({ success: true, data: entry });
  } catch (error) {
    console.error('[admin/hall-of-fame/get]', error);
    return res.status(500).json({ success: false, message: '항목을 불러오지 못했습니다.' });
  }
});

router.post('/', requireAdminApi, validate(entryBodyValidators), async (req, res) => {
  if (!isAdminUser(req.user.userId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const result = await createHallOfFameEntry(req.body);
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('[admin/hall-of-fame/create]', error);
    return res.status(500).json({ success: false, message: '등록에 실패했습니다.' });
  }
});

router.patch(
  '/:id',
  requireAdminApi,
  validate([param('id').isInt({ min: 1 }), ...entryBodyValidators]),
  async (req, res) => {
    if (!isAdminUser(req.user.userId)) {
      return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }
    try {
      const result = await updateHallOfFameEntry(req.params.id, req.body);
      if (result.error) {
        return res.status(400).json({ success: false, message: result.error });
      }
      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('[admin/hall-of-fame/update]', error);
      return res.status(500).json({ success: false, message: '수정에 실패했습니다.' });
    }
  },
);

router.delete('/:id', requireAdminApi, async (req, res) => {
  if (!isAdminUser(req.user.userId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const ok = await deleteHallOfFameEntry(req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, message: '항목을 찾을 수 없습니다.' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('[admin/hall-of-fame/delete]', error);
    return res.status(500).json({ success: false, message: '삭제에 실패했습니다.' });
  }
});

export default router;

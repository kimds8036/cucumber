import express from 'express';
import { param, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import {
  getPublishedAnnouncementById,
  listPublishedAnnouncements,
} from '../services/announcements.service.js';

const router = express.Router();

const listValidators = [
  query('limit').optional({ values: 'falsy' }).isInt({ min: 1, max: 100 }),
  query('offset').optional({ values: 'falsy' }).isInt({ min: 0 }),
];

const idValidators = [
  param('id').isInt({ min: 1 }).withMessage('유효한 공지 ID가 필요합니다.'),
];

/** GET /api/announcements — 게시된 공지 목록 */
router.get('/', validate(listValidators), async (req, res) => {
  try {
    const items = await listPublishedAnnouncements({
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json({
      success: true,
      data: {
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          publishedAt: item.publishedAt,
        })),
      },
    });
  } catch (error) {
    console.error('[announcements] 목록 오류:', error);
    return res.status(500).json({
      success: false,
      message: '공지사항 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

/** GET /api/announcements/:id — 게시된 공지 상세 */
router.get('/:id', validate(idValidators), async (req, res) => {
  try {
    const item = await getPublishedAnnouncementById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: '공지사항을 찾을 수 없습니다.',
      });
    }
    return res.json({
      success: true,
      data: {
        id: item.id,
        title: item.title,
        content: item.content,
        publishedAt: item.publishedAt,
      },
    });
  } catch (error) {
    console.error('[announcements] 상세 오류:', error);
    return res.status(500).json({
      success: false,
      message: '공지사항 조회 중 오류가 발생했습니다.',
    });
  }
});

export default router;

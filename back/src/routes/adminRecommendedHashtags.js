import express from 'express';
import { body, param } from 'express-validator';
import { requireAdminApi, isAdminUser } from '../middleware/adminAuth.js';
import { requireAdminRole } from '../middleware/adminRoles.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';
import { validate } from '../middleware/validate.js';
import { writeAuditLog } from '../services/adminAudit.service.js';
import pool from '../config/database.js';

const router = express.Router();

const NAME_MAX = 30;
const LIST_MAX = 30;

const roles = [ADMIN_ROLES.MODERATOR, ADMIN_ROLES.SUPPORT, ADMIN_ROLES.SUPER];

function normalizeName(raw) {
  return String(raw || '')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, '')
    .slice(0, NAME_MAX);
}

async function listRows() {
  const [rows] = await pool.execute(
    `SELECT id, name, display_order AS displayOrder, created_at AS createdAt
     FROM recommended_hashtags
     ORDER BY display_order ASC, id ASC`,
  );
  return rows;
}

router.get(
  '/used',
  requireAdminApi,
  requireAdminRole(...roles),
  async (req, res) => {
    try {
      if (!isAdminUser(req.user.userId)) {
        return res.status(403).json({ success: false, message: '권한 없음' });
      }
      const [rows] = await pool.execute(
        `SELECT t.name AS name, COUNT(*) AS useCount
         FROM post_tags pt
         INNER JOIN tags t ON t.id = pt.tag_id
         INNER JOIN posts p
           ON p.id = pt.post_id
          AND p.is_deleted = FALSE
          AND p.is_hidden = FALSE
         GROUP BY t.id, t.name
         ORDER BY useCount DESC, t.name ASC
         LIMIT 100`,
      );
      const items = rows.map((row) => ({
        name: String(row.name || '').replace(/^#+/, ''),
        useCount: Number(row.useCount) || 0,
      })).filter((row) => row.name);
      return res.json({ success: true, data: { items } });
    } catch (error) {
      console.error('[admin/recommended-hashtags] 사용 목록 오류:', error);
      return res.status(500).json({
        success: false,
        message: '사용된 해시태그 조회 실패',
      });
    }
  },
);

router.get(
  '/',
  requireAdminApi,
  requireAdminRole(...roles),
  async (req, res) => {
    try {
      if (!isAdminUser(req.user.userId)) {
        return res.status(403).json({ success: false, message: '권한 없음' });
      }
      const items = await listRows();
      return res.json({ success: true, data: { items } });
    } catch (error) {
      console.error('[admin/recommended-hashtags] 목록 오류:', error);
      return res.status(500).json({
        success: false,
        message: '추천 해시태그 목록 조회 실패',
      });
    }
  },
);

router.post(
  '/',
  requireAdminApi,
  requireAdminRole(...roles),
  validate([
    body('name').isString().withMessage('해시태그 이름이 필요합니다.'),
  ]),
  async (req, res) => {
    try {
      const name = normalizeName(req.body.name);
      if (!name) {
        return res.status(422).json({
          success: false,
          message: '해시태그 이름을 입력해 주세요.',
        });
      }
      const [countRows] = await pool.execute(
        'SELECT COUNT(*) AS cnt FROM recommended_hashtags',
      );
      if (Number(countRows[0]?.cnt || 0) >= LIST_MAX) {
        return res.status(422).json({
          success: false,
          message: `추천 해시태그는 ${LIST_MAX}개까지 등록할 수 있습니다.`,
        });
      }
      const [orderRows] = await pool.execute(
        'SELECT COALESCE(MAX(display_order), -1) AS maxOrder FROM recommended_hashtags',
      );
      const displayOrder = Number(orderRows[0]?.maxOrder ?? -1) + 1;
      try {
        const [result] = await pool.execute(
          'INSERT INTO recommended_hashtags (name, display_order) VALUES (?, ?)',
          [name, displayOrder],
        );
        await writeAuditLog({
          adminUserId: req.user.userId,
          actionType: 'recommended_hashtag.create',
          targetType: 'recommended_hashtag',
          targetId: result.insertId,
          extra: { name },
        });
      } catch (error) {
        if (error?.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({
            success: false,
            message: '이미 등록된 해시태그입니다.',
          });
        }
        throw error;
      }
      const items = await listRows();
      return res.status(201).json({ success: true, data: { items } });
    } catch (error) {
      console.error('[admin/recommended-hashtags] 추가 오류:', error);
      return res.status(500).json({
        success: false,
        message: '추천 해시태그 추가 실패',
      });
    }
  },
);

router.delete(
  '/:id',
  requireAdminApi,
  requireAdminRole(...roles),
  validate([
    param('id').isInt({ min: 1 }).withMessage('유효한 해시태그 ID가 필요합니다.'),
  ]),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [existing] = await pool.execute(
        'SELECT id, name FROM recommended_hashtags WHERE id = ?',
        [id],
      );
      if (!existing.length) {
        return res.status(404).json({
          success: false,
          message: '해시태그를 찾을 수 없습니다.',
        });
      }
      await pool.execute('DELETE FROM recommended_hashtags WHERE id = ?', [id]);
      await writeAuditLog({
        adminUserId: req.user.userId,
        actionType: 'recommended_hashtag.delete',
        targetType: 'recommended_hashtag',
        targetId: id,
        extra: { name: existing[0].name },
      });
      const items = await listRows();
      return res.json({ success: true, data: { items } });
    } catch (error) {
      console.error('[admin/recommended-hashtags] 삭제 오류:', error);
      return res.status(500).json({
        success: false,
        message: '추천 해시태그 삭제 실패',
      });
    }
  },
);

export default router;

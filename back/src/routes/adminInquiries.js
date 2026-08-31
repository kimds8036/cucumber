import express from 'express';
import { body, param, query } from 'express-validator';
import pool from '../config/database.js';
import { requireAdminApi, isAdminUser } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validate.js';
import { getNowForDB } from '../utils/dateUtils.js';
import { getAdminDashboardStats, mapDashboardStatsToApi } from '../services/adminStats.service.js';
import {
  annotateDuplicateClusters,
  getInquiryDuplicateMeta,
  getInquiryDuplicateSiblings,
} from '../services/inquiryDedup.service.js';
import { enqueueNotification } from '../utils/notificationWorker.js';

const router = express.Router();

const VALID_STATUSES = ['pending', 'answered', 'closed'];

const inquiryIdParamValidators = [
  param('id').toInt().isInt({ min: 1 }).withMessage('유효하지 않은 문의 ID입니다.'),
];

const inquiryAnswerValidators = [
  ...inquiryIdParamValidators,
  body('answer_content').isString().trim().isLength({ min: 1, max: 5000 })
    .withMessage('답변 내용을 입력해주세요.'),
  body('answer_note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 2000 }),
  body('close').optional(),
];

const inquiryListValidators = [
  query('q').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
  query('page').optional({ values: 'falsy' }).toInt().isInt({ min: 1, max: 10000 }),
  query('limit').optional({ values: 'falsy' }).toInt().isInt({ min: 1, max: 100 }),
];

const bulkCloseValidators = [
  body('ids').isArray({ min: 1, max: 100 }).withMessage('처리할 문의 ID가 없습니다.'),
  body('ids.*').toInt().isInt({ min: 1 }),
  body('note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 2000 }),
];

async function writeAuditLog(connection, { adminUserId, actionType, targetType, targetId, note, extra }) {
  await connection.execute(
    `INSERT INTO admin_audit_logs (admin_user_id, action_type, target_type, target_id, note, extra)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [adminUserId, actionType, targetType, targetId, note || null, extra ? JSON.stringify(extra) : null]
  );
}

async function attachInquiryImages(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const ids = [...new Set(rows.map((r) => Number(r.id)).filter((v) => Number.isFinite(v) && v > 0))];
  if (ids.length === 0) return rows;
  const placeholders = ids.map(() => '?').join(', ');
  const [imageRows] = await pool.execute(
    `SELECT inquiry_id, cloudinary_url
     FROM inquiry_images
     WHERE deleted_at IS NULL AND inquiry_id IN (${placeholders})
     ORDER BY inquiry_id ASC, display_order ASC, id ASC`,
    ids
  );
  const map = new Map();
  imageRows.forEach((row) => {
    const key = Number(row.inquiry_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row.cloudinary_url);
  });
  return rows.map((r) => ({ ...r, image_urls: map.get(Number(r.id)) || [] }));
}

/**
 * GET /api/admin/inquiries/stats
 * 문의 처리 통계
 */
router.get('/stats', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const stats = await getAdminDashboardStats();
    const mapped = mapDashboardStatsToApi(stats);
    return res.json({
      success: true,
      data: {
        todayNewInquiries: mapped.todayNewInquiries,
        pendingInquiries: mapped.pendingInquiries,
        todayAnsweredInquiries: mapped.todayAnsweredInquiries,
      },
    });
  } catch (error) {
    console.error('관리자 문의 통계 조회 오류:', error);
    return res.status(500).json({ success: false, message: '문의 통계 조회 중 오류가 발생했습니다.' });
  }
});

/**
 * GET /api/admin/inquiries
 * 관리자 문의 목록 (필터: status, view, q, fromDate, toDate)
 */
router.get('/', requireAdminApi, validate(inquiryListValidators), async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const {
      status = '',
      view = 'pending',
      q = '',
      fromDate = '',
      toDate = '',
      page = 1,
      limit = 30,
    } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 30));
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    const conditions = ['i.is_deleted = FALSE'];
    const params = [];

    if (status && VALID_STATUSES.includes(String(status).trim())) {
      conditions.push('i.status = ?');
      params.push(String(status).trim());
    } else if (String(view).trim() === 'processed') {
      conditions.push(`i.status IN ('answered', 'closed')`);
    } else {
      conditions.push(`i.status = 'pending'`);
    }
    if (q) {
      const like = `%${String(q).trim()}%`;
      conditions.push(
        '(CAST(i.id AS CHAR) LIKE ? OR CAST(i.user_id AS CHAR) LIKE ? OR i.contact_username LIKE ? OR i.contact_email LIKE ? OR i.content LIKE ? OR IFNULL(i.answer_content,\'\') LIKE ?)'
      );
      params.push(like, like, like, like, like, like);
    }
    if (fromDate) {
      conditions.push('DATE(i.created_at) >= ?');
      params.push(String(fromDate).trim());
    }
    if (toDate) {
      conditions.push('DATE(i.created_at) <= ?');
      params.push(String(toDate).trim());
    }
    const whereSql = conditions.join(' AND ');

    const [rows] = await pool.execute(
      `SELECT
         i.id,
         i.user_id,
         u.username AS author_username,
         u.name_enc AS author_name_enc,
         u.is_suspended AS author_is_suspended,
         u.is_banned AS author_is_banned,
         i.contact_username,
         i.contact_email,
         i.content,
         i.answer_content,
         i.answer_note,
         i.status,
         i.answered_by_admin_id AS answered_by,
         a.username AS answered_by_username,
         i.answered_at,
         i.is_read_by_user,
         i.created_at,
         i.updated_at
       FROM inquiries i
       LEFT JOIN users u ON u.id = i.user_id
       LEFT JOIN admin_users a ON a.id = i.answered_by_admin_id
       WHERE ${whereSql}
       ORDER BY i.created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      params
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM inquiries i WHERE ${whereSql}`,
      params
    );

    const rowsWithImages = await attachInquiryImages(rows);
    const rowsWithDup = annotateDuplicateClusters(rowsWithImages);

    return res.json({
      success: true,
      data: {
        inquiries: rowsWithDup,
        pagination: {
          page: parseInt(page, 10) || 1,
          limit: limitNum,
          total: Number(countRows[0]?.total ?? 0),
        },
      },
    });
  } catch (error) {
    console.error('관리자 문의 목록 조회 오류:', error);
    return res.status(500).json({ success: false, message: '문의 목록 조회 중 오류가 발생했습니다.' });
  }
});

/**
 * GET /api/admin/inquiries/:id
 * 관리자 단건 조회 (작성자 정지 상태/이미지 포함)
 */
router.get('/:id', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const inquiryId = Number(req.params.id);
  if (!Number.isFinite(inquiryId) || inquiryId <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 문의 ID입니다.' });
  }
  try {
    const [rows] = await pool.execute(
      `SELECT
         i.*,
         u.username AS author_username,
         u.name_enc AS author_name_enc,
         u.is_suspended AS author_is_suspended,
         u.suspended_until AS author_suspended_until,
         u.is_banned AS author_is_banned,
         u.violation_warning_count AS author_violation_warning_count,
         a.username AS answered_by_username
       FROM inquiries i
       LEFT JOIN users u ON u.id = i.user_id
       LEFT JOIN admin_users a ON a.id = i.answered_by_admin_id
       WHERE i.id = ?
       LIMIT 1`,
      [inquiryId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: '문의를 찾을 수 없습니다.' });
    }

    const [imageRows] = await pool.execute(
      `SELECT id, cloudinary_url, display_order
       FROM inquiry_images
       WHERE inquiry_id = ? AND deleted_at IS NULL
       ORDER BY display_order ASC, id ASC`,
      [inquiryId]
    );

    const dupMeta = await getInquiryDuplicateMeta(rows[0]);
    const duplicateSiblings = dupMeta.duplicateWarning
      ? await getInquiryDuplicateSiblings(rows[0])
      : [];

    return res.json({
      success: true,
      data: {
        inquiry: { ...rows[0], ...dupMeta },
        images: imageRows,
        duplicateSiblings,
      },
    });
  } catch (error) {
    console.error('관리자 문의 단건 조회 오류:', error);
    return res.status(500).json({ success: false, message: '문의 조회 중 오류가 발생했습니다.' });
  }
});

/**
 * POST /api/admin/inquiries/:id/answer
 * 답변 작성 (status='answered', close 옵션 시 'closed')
 * body: { answer_content: string, answer_note?: string, close?: boolean }
 */
router.post('/:id/answer', requireAdminApi, validate(inquiryAnswerValidators), async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const inquiryId = Number(req.params.id);
  if (!Number.isFinite(inquiryId) || inquiryId <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 문의 ID입니다.' });
  }
  const answerContent =
    req.body?.answer_content != null ? String(req.body.answer_content).trim() : '';
  const answerNote = req.body?.answer_note != null ? String(req.body.answer_note).trim() : null;
  const close = req.body?.close === true || req.body?.close === 'true';

  if (!answerContent) {
    return res.status(400).json({ success: false, message: '답변 내용을 입력해주세요.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT id, status, user_id FROM inquiries WHERE id = ? AND is_deleted = FALSE FOR UPDATE`,
      [inquiryId]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '문의를 찾을 수 없습니다.' });
    }
    const prevStatus = rows[0].status;
    const nextStatus = close ? 'closed' : 'answered';
    const now = getNowForDB();

    await connection.execute(
      `UPDATE inquiries
       SET answer_content = ?,
           answer_note = ?,
           answered_by_admin_id = ?,
           answered_at = ?,
           status = ?,
           is_read_by_user = FALSE,
           read_at = NULL
       WHERE id = ?`,
      [answerContent, answerNote, adminUserId, now, nextStatus, inquiryId]
    );

    await writeAuditLog(connection, {
      adminUserId,
      actionType: 'inquiry_answer',
      targetType: 'inquiry',
      targetId: inquiryId,
      note: answerNote,
      extra: { prevStatus, nextStatus, close },
    });

    await connection.commit();

    const targetUserId = rows[0].user_id ? Number(rows[0].user_id) : null;
    if (targetUserId && Number.isFinite(targetUserId) && targetUserId > 0) {
      await enqueueNotification({
        userId: targetUserId,
        type: 'system',
        category: 'system',
        title: '문의 답변이 도착했습니다',
        body: '문의하신 내용에 답변이 등록되었습니다. 앱에서 확인해 주세요.',
        relatedType: 'inquiry',
        relatedId: inquiryId,
        sourceId: `inquiry_answer_${inquiryId}`,
      });
    }

    return res.json({ success: true, message: '답변이 등록되었습니다.' });
  } catch (error) {
    await connection.rollback();
    console.error('관리자 문의 답변 오류:', error);
    return res.status(500).json({ success: false, message: '답변 처리 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

/**
 * PATCH /api/admin/inquiries/:id/answer
 * 답변 수정 (이미 답변한 문의)
 */
router.patch('/:id/answer', requireAdminApi, validate(inquiryAnswerValidators), async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const inquiryId = Number(req.params.id);
  if (!Number.isFinite(inquiryId) || inquiryId <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 문의 ID입니다.' });
  }
  const answerContent =
    req.body?.answer_content != null ? String(req.body.answer_content).trim() : '';
  const answerNote = req.body?.answer_note != null ? String(req.body.answer_note).trim() : null;
  if (!answerContent) {
    return res.status(400).json({ success: false, message: '답변 내용을 입력해주세요.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT id, status FROM inquiries WHERE id = ? AND is_deleted = FALSE FOR UPDATE`,
      [inquiryId]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '문의를 찾을 수 없습니다.' });
    }
    if (rows[0].status === 'pending') {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: '아직 답변되지 않은 문의입니다. 답변 등록을 사용해주세요.',
      });
    }

    await connection.execute(
      `UPDATE inquiries
       SET answer_content = ?,
           answer_note = ?,
           answered_by_admin_id = ?,
           answered_at = ?,
           is_read_by_user = FALSE,
           read_at = NULL
       WHERE id = ?`,
      [answerContent, answerNote, adminUserId, getNowForDB(), inquiryId]
    );

    await writeAuditLog(connection, {
      adminUserId,
      actionType: 'inquiry_answer',
      targetType: 'inquiry',
      targetId: inquiryId,
      note: answerNote,
      extra: { edit: true },
    });

    await connection.commit();
    return res.json({ success: true, message: '답변이 수정되었습니다.' });
  } catch (error) {
    await connection.rollback();
    console.error('관리자 문의 답변 수정 오류:', error);
    return res
      .status(500)
      .json({ success: false, message: '답변 수정 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

/**
 * PATCH /api/admin/inquiries/:id/close
 * 답변 없이 종결
 */
router.patch('/:id/close', requireAdminApi, validate(inquiryIdParamValidators), async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const inquiryId = Number(req.params.id);
  if (!Number.isFinite(inquiryId) || inquiryId <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 문의 ID입니다.' });
  }
  const note = req.body?.note != null ? String(req.body.note).trim() : null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT id, status FROM inquiries WHERE id = ? AND is_deleted = FALSE FOR UPDATE`,
      [inquiryId]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '문의를 찾을 수 없습니다.' });
    }
    if (rows[0].status === 'closed') {
      await connection.rollback();
      return res.status(409).json({ success: false, message: '이미 종결된 문의입니다.' });
    }
    await connection.execute(
      `UPDATE inquiries SET status = 'closed', answer_note = COALESCE(?, answer_note) WHERE id = ?`,
      [note, inquiryId]
    );
    await writeAuditLog(connection, {
      adminUserId,
      actionType: 'inquiry_close',
      targetType: 'inquiry',
      targetId: inquiryId,
      note,
      extra: { prevStatus: rows[0].status },
    });
    await connection.commit();
    return res.json({ success: true, message: '문의를 종결 처리했습니다.' });
  } catch (error) {
    await connection.rollback();
    console.error('관리자 문의 종결 오류:', error);
    return res.status(500).json({ success: false, message: '종결 처리 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

/**
 * PATCH /api/admin/inquiries/:id/reopen
 * 종결/답변 상태를 pending으로 되돌림
 */
router.patch('/:id/reopen', requireAdminApi, validate(inquiryIdParamValidators), async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const inquiryId = Number(req.params.id);
  if (!Number.isFinite(inquiryId) || inquiryId <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 문의 ID입니다.' });
  }
  const note = req.body?.note != null ? String(req.body.note).trim() : null;
  if (!note) {
    return res
      .status(400)
      .json({ success: false, message: '재오픈 사유(메모)를 입력해주세요.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT id, status FROM inquiries WHERE id = ? AND is_deleted = FALSE FOR UPDATE`,
      [inquiryId]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '문의를 찾을 수 없습니다.' });
    }
    if (rows[0].status === 'pending') {
      await connection.rollback();
      return res.status(409).json({ success: false, message: '이미 미처리 상태입니다.' });
    }
    await connection.execute(
      `UPDATE inquiries SET status = 'pending' WHERE id = ?`,
      [inquiryId]
    );
    await writeAuditLog(connection, {
      adminUserId,
      actionType: 'inquiry_reopen',
      targetType: 'inquiry',
      targetId: inquiryId,
      note,
      extra: { prevStatus: rows[0].status },
    });
    await connection.commit();
    return res.json({ success: true, message: '문의를 미처리 상태로 되돌렸습니다.' });
  } catch (error) {
    await connection.rollback();
    console.error('관리자 문의 재오픈 오류:', error);
    return res.status(500).json({ success: false, message: '재오픈 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

/**
 * POST /api/admin/inquiries/bulk-close
 * 일괄 종결 (스팸/중복 처리용)
 * body: { ids: number[], note?: string }
 */
router.post('/bulk-close', requireAdminApi, validate(bulkCloseValidators), async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)
    : [];
  const note = req.body?.note != null ? String(req.body.note).trim() : null;
  if (!ids.length) {
    return res.status(400).json({ success: false, message: '처리할 문의 ID가 없습니다.' });
  }

  const connection = await pool.getConnection();
  let processed = 0;
  try {
    await connection.beginTransaction();
    for (const inquiryId of ids) {
      const [rows] = await connection.execute(
        `SELECT id, status FROM inquiries WHERE id = ? AND is_deleted = FALSE FOR UPDATE`,
        [inquiryId]
      );
      if (!rows.length) continue;
      if (rows[0].status === 'closed') continue;
      await connection.execute(
        `UPDATE inquiries SET status = 'closed', answer_note = COALESCE(?, answer_note) WHERE id = ?`,
        [note, inquiryId]
      );
      await writeAuditLog(connection, {
        adminUserId,
        actionType: 'inquiry_close',
        targetType: 'inquiry',
        targetId: inquiryId,
        note,
        extra: { prevStatus: rows[0].status, bulk: true },
      });
      processed += 1;
    }
    await connection.commit();
    return res.json({
      success: true,
      message: `${processed}건 종결 처리했습니다.`,
      data: { processed },
    });
  } catch (error) {
    await connection.rollback();
    console.error('관리자 문의 일괄 종결 오류:', error);
    return res
      .status(500)
      .json({ success: false, message: '일괄 종결 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

/**
 * DELETE /api/admin/inquiries/:id
 * 관리자 강제 삭제 (스팸/악성 문의용 soft delete)
 */
router.delete('/:id', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const inquiryId = Number(req.params.id);
  if (!Number.isFinite(inquiryId) || inquiryId <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 문의 ID입니다.' });
  }
  const note = req.body?.note != null ? String(req.body.note).trim() : null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `UPDATE inquiries SET is_deleted = TRUE, deleted_at = ? WHERE id = ? AND is_deleted = FALSE`,
      [getNowForDB(), inquiryId]
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '문의를 찾을 수 없습니다.' });
    }
    await writeAuditLog(connection, {
      adminUserId,
      actionType: 'inquiry_delete',
      targetType: 'inquiry',
      targetId: inquiryId,
      note,
    });
    await connection.commit();
    return res.json({ success: true, message: '문의를 삭제 처리했습니다.' });
  } catch (error) {
    await connection.rollback();
    console.error('관리자 문의 삭제 오류:', error);
    return res.status(500).json({ success: false, message: '문의 삭제 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

export default router;

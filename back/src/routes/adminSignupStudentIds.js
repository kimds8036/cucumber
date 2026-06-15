import express from 'express';
import { body } from 'express-validator';
import pool from '../config/database.js';
import { requireAdminApi, isAdminUser } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validate.js';
import { getNowForDB } from '../utils/dateUtils.js';

const router = express.Router();

async function writeAuditLog(connection, { adminUserId, actionType, targetId, note }) {
  await connection.execute(
    `INSERT INTO admin_audit_logs (admin_user_id, action_type, target_type, target_id, note, extra)
     VALUES (?, ?, 'signup_student_id', ?, ?, NULL)`,
    [adminUserId, actionType, targetId, note || null],
  );
}

/**
 * GET /api/admin/signup-student-ids
 */
router.get('/', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }

  const status = String(req.query.status || 'pending');
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const limitSql = Number.isFinite(limit) ? Math.floor(limit) : 50;
  const offsetSql = Number.isFinite(offset) ? Math.floor(offset) : 0;

  try {
    const where = status === 'all' ? '1=1' : 's.status = ?';
    const params = status === 'all' ? [] : [status];

    const [rows] = await pool.execute(
      `SELECT s.*, u.username, u.grade AS user_grade, u.class_number AS user_class_number,
              sch.name AS school_name, sch.region AS school_region, sch.address AS school_address
       FROM signup_student_id_submissions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN schools sch ON sch.school_id = s.school_id
       WHERE ${where}
       ORDER BY s.created_at DESC
       LIMIT ${limitSql} OFFSET ${offsetSql}`,
      params,
    );

    return res.json({ success: true, data: { submissions: rows } });
  } catch (error) {
    console.error('[admin/signup-student-ids] 목록 오류:', error);
    return res.status(500).json({
      success: false,
      message: '학생증 검수 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

const reviewValidators = [
  body('status').isIn(['approved', 'rejected']).withMessage('status는 approved 또는 rejected 여야 합니다.'),
  body('reviewNote').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }),
  body('schoolId').optional({ values: 'falsy' }).isString().trim().isLength({ min: 1, max: 50 }),
];

/**
 * PATCH /api/admin/signup-student-ids/:id
 */
router.patch('/:id', requireAdminApi, validate(reviewValidators), async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }

  const submissionId = Number(req.params.id);
  if (!Number.isFinite(submissionId) || submissionId <= 0) {
    return res.status(400).json({ success: false, message: '잘못된 ID입니다.' });
  }

  const { status, reviewNote, schoolId } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT * FROM signup_student_id_submissions WHERE id = ? FOR UPDATE`,
      [submissionId],
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '제출 건을 찾을 수 없습니다.' });
    }

    const submission = rows[0];
    if (submission.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: '이미 검수가 완료된 건입니다.',
      });
    }

    const now = getNowForDB();

    if (status === 'approved') {
      const targetSchoolId = schoolId?.trim() || submission.school_id;
      if (targetSchoolId) {
        const [schoolRows] = await connection.execute(
          'SELECT school_id FROM schools WHERE school_id = ? LIMIT 1',
          [targetSchoolId],
        );
        if (schoolRows.length === 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: '유효하지 않은 학교 ID입니다.',
          });
        }
        await connection.execute('UPDATE users SET school_id = ? WHERE id = ?', [
          targetSchoolId,
          submission.user_id,
        ]);
      }

      await connection.execute(
        'UPDATE users SET student_verified = TRUE WHERE id = ?',
        [submission.user_id],
      );
    }

    await connection.execute(
      `UPDATE signup_student_id_submissions
       SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ?
       WHERE id = ?`,
      [status, reviewNote?.trim() || null, adminUserId, now, submissionId],
    );

    await writeAuditLog(connection, {
      adminUserId,
      actionType: status === 'approved' ? 'student_id_approve' : 'student_id_reject',
      targetId: submissionId,
      note: reviewNote,
    });

    await connection.commit();

    return res.json({
      success: true,
      message: status === 'approved' ? '학생증이 승인되었습니다.' : '학생증이 반려되었습니다.',
    });
  } catch (error) {
    await connection.rollback();
    console.error('[admin/signup-student-ids] 검수 오류:', error);
    return res.status(500).json({
      success: false,
      message: '학생증 검수 처리 중 오류가 발생했습니다.',
    });
  } finally {
    connection.release();
  }
});

export default router;

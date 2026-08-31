import express from 'express';
import { body } from 'express-validator';
import pool from '../config/database.js';
import { requireAdminApi, isAdminUser } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validate.js';
import { getNowForDB } from '../utils/dateUtils.js';
import { applyUserSchoolUpdate } from '../services/userSchoolTransition.service.js';
import { enqueueNotification } from '../utils/notificationWorker.js';

const router = express.Router();
const VALID_PURPOSES = new Set(['signup', 'resubmit', 'reverification']);

async function writeAuditLog(connection, { adminUserId, actionType, targetId, note }) {
  await connection.execute(
    `INSERT INTO admin_audit_logs (admin_user_id, action_type, target_type, target_id, note, extra)
     VALUES (?, ?, 'signup_student_id', ?, ?, NULL)`,
    [adminUserId, actionType, targetId, note || null],
  );
}

/**
 * GET /api/admin/signup-student-ids?status=pending&purpose=signup|reverification|resubmit&q=
 */
router.get('/', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }

  const status = String(req.query.status || 'pending');
  const purpose = String(req.query.purpose || '').trim();
  const q = String(req.query.q || '').trim();
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const limitSql = Number.isFinite(limit) ? Math.floor(limit) : 50;
  const offsetSql = Number.isFinite(offset) ? Math.floor(offset) : 0;

  try {
    const whereParts = [];
    const params = [];

    if (status !== 'all') {
      whereParts.push('s.status = ?');
      params.push(status);
    }

    if (purpose && VALID_PURPOSES.has(purpose)) {
      if (purpose === 'signup') {
        whereParts.push("s.submission_purpose IN ('signup', 'resubmit')");
      } else {
        whereParts.push('s.submission_purpose = ?');
        params.push(purpose);
      }
    }

    if (q) {
      const like = `%${q}%`;
      whereParts.push(
        `(u.username LIKE ? OR CAST(u.id AS CHAR) LIKE ? OR CAST(s.id AS CHAR) LIKE ? OR sch.name LIKE ? OR IFNULL(s.review_note,'') LIKE ?)`,
      );
      params.push(like, like, like, like, like);
    }

    const where = whereParts.length ? whereParts.join(' AND ') : '1=1';

    const [rows] = await pool.execute(
      `SELECT s.*, u.username, u.grade AS user_grade, u.class_number AS user_class_number,
              u.reverification_status, u.student_verified,
              sch.name AS school_name, sch.region AS school_region, sch.address AS school_address,
              prev.name AS previous_school_name, prev.region AS previous_school_region
       FROM signup_student_id_submissions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN schools sch ON sch.school_id = s.school_id
       LEFT JOIN schools prev ON prev.school_id = s.previous_school_id
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
    const prevStatus = String(submission.status || '').toLowerCase();
    const isReapprove = prevStatus === 'rejected' && status === 'approved';

    if (prevStatus === 'approved') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: '이미 승인된 건입니다.',
      });
    }

    if (prevStatus !== 'pending' && !(isReapprove)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: '이미 검수가 완료된 건입니다.',
      });
    }

    // 거절 후 재승인: 해당 유저의 최신 제출만 허용 (이후 재제출 pending이 있으면 그쪽을 검수)
    if (isReapprove) {
      const [latestRows] = await connection.execute(
        `SELECT id, status FROM signup_student_id_submissions
         WHERE user_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        [submission.user_id],
      );
      const latest = latestRows[0];
      if (!latest || Number(latest.id) !== submissionId) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message:
            '이 유저의 최신 학생증 제출이 아닙니다. 최신 제출 건을 검수하거나, 목록에서 최신 거절 건을 선택해 주세요.',
        });
      }
    }

    const now = getNowForDB();
    const isReverification = submission.submission_purpose === 'reverification';

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
        if (isReverification) {
          await applyUserSchoolUpdate(connection, {
            userId: submission.user_id,
            newSchoolId: targetSchoolId,
            grade: req.body?.grade,
            classNumber: req.body?.classNumber,
            gradeException: req.body?.gradeException,
          });
        } else if (targetSchoolId !== submission.school_id) {
          await applyUserSchoolUpdate(connection, {
            userId: submission.user_id,
            newSchoolId: targetSchoolId,
            grade: req.body?.grade,
            classNumber: req.body?.classNumber,
            gradeException: req.body?.gradeException,
          });
        }
      }

      if (!isReverification) {
        await connection.execute(
          'UPDATE users SET student_verified = TRUE WHERE id = ?',
          [submission.user_id],
        );
      }
    }

    const nextNote = (() => {
      const incoming = reviewNote?.trim() || '';
      if (isReapprove) {
        const reapproveNote = incoming || '문의·이메일 학적 확인 후 거절 건 재승인';
        const prev = String(submission.review_note || '').trim();
        if (prev) return `${reapproveNote}\n---\n[이전 거절] ${prev}`;
        return reapproveNote;
      }
      return incoming || null;
    })();

    await connection.execute(
      `UPDATE signup_student_id_submissions
       SET status = ?, review_note = ?, reviewed_by_admin_id = ?, reviewed_at = ?
       WHERE id = ?`,
      [status, nextNote, adminUserId, now, submissionId],
    );

    let actionType;
    if (status === 'approved') {
      if (isReapprove) {
        actionType = isReverification
          ? 'reverification_student_id_reapprove'
          : 'student_id_reapprove';
      } else {
        actionType = isReverification
          ? 'reverification_student_id_approve'
          : 'student_id_approve';
      }
    } else {
      actionType = isReverification
        ? 'reverification_student_id_reject'
        : 'student_id_reject';
    }

    await writeAuditLog(connection, {
      adminUserId,
      actionType,
      targetId: submissionId,
      note: nextNote,
    });

    await connection.commit();

    const targetUserId = Number(submission.user_id);
    if (Number.isFinite(targetUserId) && targetUserId > 0) {
      if (status === 'approved') {
        await enqueueNotification({
          userId: targetUserId,
          type: 'system',
          category: 'system',
          title: '학생 인증이 완료되었습니다',
          body: 'Youth Paper를 이용할 수 있어요.',
          relatedType: 'student_verification_approved',
          relatedId: submissionId,
          sourceId: `student_verification_approved_${submissionId}`,
        });
      } else {
        await enqueueNotification({
          userId: targetUserId,
          type: 'system',
          category: 'system',
          title: '학생증이 거절되었습니다',
          body: '사유를 확인하고 다시 제출해 주세요.',
          relatedType: 'student_verification_rejected',
          relatedId: submissionId,
          sourceId: `student_verification_rejected_${submissionId}`,
        });
      }
    }

    return res.json({
      success: true,
      message: isReapprove
        ? '거절되었던 학생증을 재승인했습니다. 사용자가 앱을 이용할 수 있습니다.'
        : status === 'approved'
          ? '학생증이 승인되었습니다.'
          : '학생증이 반려되었습니다.',
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

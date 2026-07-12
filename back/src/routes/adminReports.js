import express from 'express';
import pool from '../config/database.js';
import { incrementTokenVersion } from '../services/session.service.js';
import { revokeAllRefreshTokens } from '../services/refreshToken.service.js';
import { notifyUserSessionRevoked } from '../services/sessionRevoke.service.js';
import { requireAdminApi, isAdminUser } from '../middleware/adminAuth.js';
import { requireAdminRole } from '../middleware/adminRoles.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';
import {
  getAdminDashboardStats,
  mapDashboardStatsToApi,
} from '../services/adminStats.service.js';
import { getAnalyticsOverview } from '../services/analytics.service.js';
import { writeUserSanction } from '../services/userSanctions.service.js';
import { getNowForDB } from '../utils/dateUtils.js';
import {
  softDeletePostComment,
  softDeleteSchoolMailComment,
} from '../services/commentCount.service.js';

const router = express.Router();

/** 신고 확정/기각 시 대상 콘텐츠 후처리 (게시글·댓글) */
async function applyReportTargetModeration(connection, report, actionRaw) {
  if (actionRaw === 'REJECT' && report.target_type === 'post') {
    await connection.execute(
      `UPDATE posts
       SET is_hidden = FALSE,
           hidden_reason = NULL,
           hidden_at = NULL
       WHERE id = ?`,
      [report.target_id]
    );
    return;
  }

  if (actionRaw !== 'CONFIRM') return;

  if (report.target_type === 'comment') {
    await softDeletePostComment(connection, report.target_id);
  }
  if (report.target_type === 'school_mail_comment') {
    await softDeleteSchoolMailComment(connection, report.target_id);
  }
}

async function getTargetOwnerId(connection, targetType, targetId) {
  if (targetType === 'post') {
    const [rows] = await connection.execute('SELECT user_id FROM posts WHERE id = ?', [targetId]);
    return rows[0]?.user_id ?? null;
  }
  if (targetType === 'comment') {
    const [rows] = await connection.execute('SELECT user_id FROM comments WHERE id = ?', [targetId]);
    return rows[0]?.user_id ?? null;
  }
  if (targetType === 'school_mail') {
    const [rows] = await connection.execute('SELECT user_id FROM school_mails WHERE id = ?', [targetId]);
    return rows[0]?.user_id ?? null;
  }
  if (targetType === 'school_mail_comment') {
    const [rows] = await connection.execute('SELECT user_id FROM school_mail_comments WHERE id = ?', [targetId]);
    return rows[0]?.user_id ?? null;
  }
  if (targetType === 'user') {
    return Number(targetId) || null;
  }
  return null;
}

async function writeAuditLog(connection, { adminUserId, actionType, targetType, targetId, note, extra }) {
  await connection.execute(
    `INSERT INTO admin_audit_logs (admin_user_id, action_type, target_type, target_id, note, extra)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [adminUserId, actionType, targetType, targetId, note || null, extra ? JSON.stringify(extra) : null]
  );
}

function mapReportTypeBadge(type) {
  const v = String(type || '').toLowerCase();
  if (v === 'school_mail') return 'mail';
  if (v === 'school_mail_comment') return 'mail_comment';
  return v;
}

async function attachTargetImages(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const postIds = [...new Set(rows.filter((r) => r.target_type === 'post').map((r) => Number(r.target_id)).filter((v) => Number.isFinite(v) && v > 0))];
  const commentIds = [...new Set(rows.filter((r) => r.target_type === 'comment').map((r) => Number(r.target_id)).filter((v) => Number.isFinite(v) && v > 0))];

  const postImageMap = new Map();
  const commentImageMap = new Map();

  if (postIds.length > 0) {
    const placeholders = postIds.map(() => '?').join(', ');
    const [postImageRows] = await pool.execute(
      `SELECT post_id, cloudinary_url
       FROM post_images
       WHERE deleted_at IS NULL
         AND post_id IN (${placeholders})
       ORDER BY post_id ASC, display_order ASC, id ASC`,
      postIds
    );
    postImageRows.forEach((row) => {
      const key = Number(row.post_id);
      if (!postImageMap.has(key)) postImageMap.set(key, []);
      postImageMap.get(key).push(row.cloudinary_url);
    });
  }

  if (commentIds.length > 0) {
    const placeholders = commentIds.map(() => '?').join(', ');
    const [commentImageRows] = await pool.execute(
      `SELECT comment_id, cloudinary_url
       FROM comment_images
       WHERE deleted_at IS NULL
         AND comment_id IN (${placeholders})
       ORDER BY comment_id ASC, display_order ASC, id ASC`,
      commentIds
    );
    commentImageRows.forEach((row) => {
      const key = Number(row.comment_id);
      if (!commentImageMap.has(key)) commentImageMap.set(key, []);
      commentImageMap.get(key).push(row.cloudinary_url);
    });
  }

  return rows.map((r) => {
    const targetId = Number(r.target_id);
    if (r.target_type === 'post') {
      return { ...r, target_image_urls: postImageMap.get(targetId) || [] };
    }
    if (r.target_type === 'comment') {
      return { ...r, target_image_urls: commentImageMap.get(targetId) || [] };
    }
    return { ...r, target_image_urls: [] };
  });
}

router.get('/stats', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const stats = await getAdminDashboardStats({ refresh: req.query.refresh === '1' });
    res.json({
      success: true,
      data: mapDashboardStatsToApi(stats),
    });
  } catch (error) {
    console.error('관리자 통계 조회 오류:', error);
    res.status(500).json({ success: false, message: '관리자 통계 조회 중 오류가 발생했습니다.' });
  }
});

router.get('/analytics/overview', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const days = Number(req.query.days || 14);
    const overview = await getAnalyticsOverview({ days });
    return res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error('관리자 분석 대시보드 조회 오류:', error);
    return res.status(500).json({ success: false, message: '분석 대시보드 조회 중 오류가 발생했습니다.' });
  }
});

router.get('/reports', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const {
      reporter = '',
      type = '',
      reason = '',
      status = '',
      view = 'pending',
      fromDate = '',
      toDate = '',
      page = 1,
      limit = 30,
    } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 30));
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    const conditions = ['1=1'];
    const params = [];
    if (reporter) {
      conditions.push('CAST(r.reporter_id AS CHAR) LIKE ?');
      params.push(`%${String(reporter).trim()}%`);
    }
    if (type) {
      conditions.push('r.target_type = ?');
      params.push(String(type).trim());
    }
    if (reason) {
      const reasonRaw = String(reason).trim();
      const reasonMap = {
        '스팸/광고': 'spam',
        '욕설/혐오': 'hate',
        '욕설/혐오 표현': 'hate',
        '음란/선정적': 'sexual',
        '개인정보': 'privacy',
        기타: 'etc',
      };
      const normalizedReason = reasonMap[reasonRaw] || reasonRaw;
      conditions.push('r.reason = ?');
      params.push(normalizedReason);
    }
    if (status) {
      conditions.push('r.status = ?');
      params.push(String(status).trim());
    } else if (String(view).trim() === 'processed') {
      conditions.push(`r.status IN ('resolved', 'rejected')`);
      if (!fromDate) {
        conditions.push(`r.reviewed_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)`);
      }
    } else {
      conditions.push(`r.status = 'pending'`);
    }
    if (fromDate) {
      conditions.push(`DATE(r.created_at) >= ?`);
      params.push(String(fromDate).trim());
    }
    if (toDate) {
      conditions.push(`DATE(r.created_at) <= ?`);
      params.push(String(toDate).trim());
    }
    const whereSql = conditions.join(' AND ');

    const [rows] = await pool.execute(
      `SELECT
         r.id,
         r.reporter_id,
         u.username AS reporter_username,
         r.target_type,
         r.target_id,
         r.reason,
         r.description,
         r.status,
         r.created_at,
         r.reviewed_at,
         (
           SELECT COUNT(*)
           FROM reports rr
           WHERE rr.target_type = r.target_type
             AND rr.target_id = r.target_id
             AND rr.status = 'pending'
         ) AS pending_target_count,
         CASE
           WHEN r.target_type = 'post' THEN (SELECT p.content FROM posts p WHERE p.id = r.target_id)
           WHEN r.target_type = 'comment' THEN (SELECT c.content FROM comments c WHERE c.id = r.target_id)
           WHEN r.target_type = 'school_mail' THEN (SELECT sm.content FROM school_mails sm WHERE sm.id = r.target_id)
           WHEN r.target_type = 'school_mail_comment' THEN (SELECT smc.content FROM school_mail_comments smc WHERE smc.id = r.target_id)
           ELSE NULL
         END AS target_content
       FROM reports r
       LEFT JOIN users u ON u.id = r.reporter_id
       WHERE ${whereSql}
       ORDER BY r.created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      params
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM reports r WHERE ${whereSql}`,
      params
    );

    const rowsWithImages = await attachTargetImages(rows);

    res.json({
      success: true,
      data: {
        reports: rowsWithImages.map((r) => ({ ...r, target_type_badge: mapReportTypeBadge(r.target_type) })),
        pagination: {
          page: parseInt(page, 10),
          limit: limitNum,
          total: Number(countRows[0]?.total ?? 0),
        },
      },
    });
  } catch (error) {
    console.error('관리자 신고 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '관리자 신고 목록 조회 중 오류가 발생했습니다.' });
  }
});

router.patch('/reports/:reportId/reopen', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const reportId = Number(req.params.reportId);
  if (!Number.isFinite(reportId) || reportId <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 신고 ID입니다.' });
  }
  const note = req.body?.note != null ? String(req.body.note).trim() : null;
  if (!note) {
    return res.status(400).json({ success: false, message: '재판정 메모를 입력해주세요.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT id, status FROM reports WHERE id = ? FOR UPDATE`,
      [reportId]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '신고를 찾을 수 없습니다.' });
    }
    if (rows[0].status === 'pending') {
      await connection.rollback();
      return res.status(409).json({ success: false, message: '이미 미처리 상태입니다.' });
    }
    await connection.execute(
      `UPDATE reports
       SET status = 'pending',
           reviewed_by = NULL,
           reviewed_at = NULL,
           review_note = NULL,
           is_malicious = FALSE
       WHERE id = ?`,
      [reportId]
    );
    await writeAuditLog(connection, {
      adminUserId,
      actionType: 'report_reopen',
      targetType: 'report',
      targetId: reportId,
      note,
      extra: { prevStatus: rows[0].status },
    });
    await connection.commit();
    return res.json({ success: true, message: '신고를 미처리 상태로 되돌렸습니다.' });
  } catch (error) {
    await connection.rollback();
    console.error('관리자 신고 재오픈 오류:', error);
    return res.status(500).json({ success: false, message: '신고 재오픈 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

router.patch('/reports/bulk-reopen', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)
    : [];
  const note = req.body?.note != null ? String(req.body.note).trim() : null;
  if (!ids.length) {
    return res.status(400).json({ success: false, message: '재오픈할 신고 ID를 선택해주세요.' });
  }
  if (!note) {
    return res.status(400).json({ success: false, message: '재판정 메모를 입력해주세요.' });
  }

  const connection = await pool.getConnection();
  let processed = 0;
  try {
    await connection.beginTransaction();
    for (const reportId of ids) {
      const [rows] = await connection.execute(
        `SELECT id, status FROM reports WHERE id = ? FOR UPDATE`,
        [reportId]
      );
      if (!rows.length) continue;
      const prevStatus = rows[0].status;
      if (prevStatus === 'pending') continue;

      await connection.execute(
        `UPDATE reports
         SET status = 'pending',
             reviewed_by = NULL,
             reviewed_at = NULL,
             review_note = NULL,
             is_malicious = FALSE
         WHERE id = ?`,
        [reportId]
      );
      await writeAuditLog(connection, {
        adminUserId,
        actionType: 'report_reopen',
        targetType: 'report',
        targetId: reportId,
        note,
        extra: { prevStatus, bulk: true },
      });
      processed += 1;
    }
    await connection.commit();
    return res.json({ success: true, message: `${processed}건 재오픈했습니다.`, data: { processed } });
  } catch (error) {
    await connection.rollback();
    console.error('관리자 신고 일괄 재오픈 오류:', error);
    return res.status(500).json({ success: false, message: '일괄 재오픈 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

router.get('/appeals', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const [rows] = await pool.execute(
      `SELECT
         ra.id,
         ra.post_id,
         ra.appellant_id,
         ra.content,
         ra.status,
         ra.review_note,
         ra.reviewed_by,
         ra.reviewed_at,
         ra.created_at,
         p.content AS post_content
       FROM report_appeals ra
       INNER JOIN posts p ON p.id = ra.post_id
       ORDER BY ra.created_at DESC`
    );
    res.json({ success: true, data: { appeals: rows } });
  } catch (error) {
    console.error('관리자 이의신청 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '관리자 이의신청 목록 조회 중 오류가 발생했습니다.' });
  }
});

router.patch('/appeals/:appealId', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const appealId = Number(req.params.appealId);
  const status = String(req.body?.status || '').toLowerCase();
  const reviewNote = req.body?.review_note != null ? String(req.body.review_note).trim() : null;
  if (!Number.isFinite(appealId) || appealId <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 이의신청 ID입니다.' });
  }
  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status는 accepted/rejected 이어야 합니다.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT id, post_id, status FROM report_appeals WHERE id = ? FOR UPDATE`,
      [appealId]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '이의신청을 찾을 수 없습니다.' });
    }
    await connection.execute(
      `UPDATE report_appeals
       SET status = ?, reviewed_by = ?, reviewed_at = ?, review_note = ?
       WHERE id = ?`,
      [status, adminUserId, getNowForDB(), reviewNote, appealId]
    );

    if (status === 'accepted') {
      await connection.execute(
        `UPDATE posts
         SET is_hidden = FALSE, hidden_reason = NULL, hidden_at = NULL
         WHERE id = ?`,
        [rows[0].post_id]
      );
    }

    await writeAuditLog(connection, {
      adminUserId,
      actionType: 'appeal_update',
      targetType: 'appeal',
      targetId: appealId,
      note: reviewNote,
      extra: { status },
    });

    await connection.commit();
    res.json({ success: true, message: '이의신청 상태를 업데이트했습니다.' });
  } catch (error) {
    await connection.rollback();
    console.error('관리자 이의신청 처리 오류:', error);
    res.status(500).json({ success: false, message: '이의신청 처리 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

router.get('/users', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const {
      q = '',
      filter = '',
      minViolationWarning = '',
      minFalseReportWarning = '',
      minReported = '',
      sanction = '', // all | suspended | banned | whitelisted
    } = req.query;
    const conditions = ['u.is_deleted = FALSE'];
    const params = [];
    if (q) {
      conditions.push('(CAST(u.id AS CHAR) LIKE ? OR u.username LIKE ?)');
      const like = `%${String(q).trim()}%`;
      params.push(like, like);
    }
    if (filter === 'warned') conditions.push('(u.violation_warning_count > 0 OR u.false_report_warning_count > 0)');
    if (filter === 'suspended') conditions.push('u.is_suspended = TRUE');
    if (filter === 'whitelisted') conditions.push('u.is_whitelisted = TRUE');
    const minViolation = Number(minViolationWarning);
    if (Number.isFinite(minViolation) && minViolation > 0) {
      conditions.push('u.violation_warning_count >= ?');
      params.push(minViolation);
    }
    const minFalse = Number(minFalseReportWarning);
    if (Number.isFinite(minFalse) && minFalse > 0) {
      conditions.push('u.false_report_warning_count >= ?');
      params.push(minFalse);
    }
    if (String(sanction).trim() === 'banned') conditions.push('u.is_banned = TRUE');
    if (String(sanction).trim() === 'suspended') conditions.push('u.is_suspended = TRUE');
    if (String(sanction).trim() === 'whitelisted') conditions.push('u.is_whitelisted = TRUE');
    const whereSql = conditions.join(' AND ');

    const minReportedNum = Number(minReported);
    const havingSql = Number.isFinite(minReportedNum) && minReportedNum > 0 ? ' HAVING reported_count >= ? ' : '';
    const [rows] = await pool.execute(
      `SELECT
         u.id,
         u.username,
         u.name_enc,
         u.violation_warning_count,
         u.false_report_warning_count,
         u.is_suspended,
         u.suspended_until,
         u.is_banned,
         u.is_whitelisted,
         u.is_shadow_muted,
         (SELECT COUNT(*) FROM user_blocks ub WHERE ub.user_id = u.id) AS block_count,
         (SELECT COUNT(*) FROM user_blocks ub2 WHERE ub2.blocked_user_id = u.id) AS blocked_by_count,
         (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id AND p.is_deleted = FALSE) AS post_count,
         (SELECT COUNT(*) FROM reports r2
          WHERE (r2.target_type = 'post' AND r2.target_id IN (SELECT p2.id FROM posts p2 WHERE p2.user_id = u.id))
             OR (r2.target_type = 'comment' AND r2.target_id IN (SELECT c2.id FROM comments c2 WHERE c2.user_id = u.id))
         ) AS reported_count
       FROM users u
       WHERE ${whereSql}
       ${havingSql}
       ORDER BY u.id DESC
       LIMIT 100`,
      Number.isFinite(minReportedNum) && minReportedNum > 0 ? [...params, minReportedNum] : params
    );
    res.json({ success: true, data: { users: rows } });
  } catch (error) {
    console.error('관리자 사용자 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '관리자 사용자 목록 조회 중 오류가 발생했습니다.' });
  }
});

router.post('/users/:userId/suspend', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const userId = Number(req.params.userId);
  const days = Math.max(1, Math.min(365, Number(req.body?.days ?? 3)));
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 사용자 ID입니다.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE users
       SET is_suspended = TRUE,
           suspended_until = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY)
       WHERE id = ?`,
      [days, userId]
    );
    await incrementTokenVersion(userId, connection);
    await revokeAllRefreshTokens(userId);
    await writeAuditLog(connection, {
      adminUserId,
      actionType: 'user_suspend',
      targetType: 'user',
      targetId: userId,
      extra: { days },
    });
    await writeUserSanction(connection, {
      userId,
      sanctionType: 'suspend',
      reason: req.body?.reason || null,
      adminUserId,
      expiresAt: null,
    });
    await connection.commit();
    notifyUserSessionRevoked(userId, {
      code: 'ACCOUNT_SUSPENDED',
      message: `계정이 ${days}일간 정지되었습니다. 다시 로그인해주세요.`,
    });
    res.json({ success: true, message: `사용자를 ${days}일 정지 처리했습니다.` });
  } catch (error) {
    await connection.rollback();
    console.error('관리자 사용자 정지 오류:', error);
    res.status(500).json({ success: false, message: '사용자 정지 처리 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

router.post('/users/:userId/whitelist', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const userId = Number(req.params.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 사용자 ID입니다.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(`UPDATE users SET is_whitelisted = TRUE WHERE id = ?`, [userId]);
    await writeAuditLog(connection, {
      adminUserId,
      actionType: 'user_whitelist',
      targetType: 'user',
      targetId: userId,
    });
    await connection.commit();
    res.json({ success: true, message: '화이트리스트에 추가했습니다.' });
  } catch (error) {
    await connection.rollback();
    console.error('관리자 화이트리스트 추가 오류:', error);
    res.status(500).json({ success: false, message: '화이트리스트 추가 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

router.delete('/users/:userId/whitelist', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const userId = Number(req.params.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 사용자 ID입니다.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(`UPDATE users SET is_whitelisted = FALSE WHERE id = ?`, [userId]);
    await writeAuditLog(connection, {
      adminUserId,
      actionType: 'user_unwhitelist',
      targetType: 'user',
      targetId: userId,
    });
    await connection.commit();
    res.json({ success: true, message: '화이트리스트에서 해제했습니다.' });
  } catch (error) {
    await connection.rollback();
    console.error('관리자 화이트리스트 해제 오류:', error);
    res.status(500).json({ success: false, message: '화이트리스트 해제 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

router.post('/users/:userId/ban', requireAdminApi, requireAdminRole(ADMIN_ROLES.SUPER), async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const userId = Number(req.params.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 사용자 ID입니다.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE users
       SET is_banned = TRUE, is_suspended = TRUE, suspended_until = NULL
       WHERE id = ?`,
      [userId]
    );
    await incrementTokenVersion(userId, connection);
    await revokeAllRefreshTokens(userId);
    await writeAuditLog(connection, {
      adminUserId,
      actionType: 'user_ban',
      targetType: 'user',
      targetId: userId,
      note: req.body?.reason || null,
    });
    await writeUserSanction(connection, {
      userId,
      sanctionType: 'ban',
      reason: req.body?.reason || null,
      adminUserId,
    });
    await connection.commit();
    notifyUserSessionRevoked(userId, {
      code: 'ACCOUNT_BANNED',
      message: '영구 정지된 계정입니다. 다시 로그인해주세요.',
    });
    res.json({ success: true, message: '영구 정지 처리했습니다.' });
  } catch (error) {
    await connection.rollback();
    console.error('관리자 사용자 밴 오류:', error);
    res.status(500).json({ success: false, message: '영구 정지 처리 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

router.post('/users/:userId/shadow-mute', requireAdminApi, requireAdminRole(ADMIN_ROLES.SUPER, ADMIN_ROLES.MODERATOR), async (req, res) => {
  const adminUserId = req.user.userId;
  const userId = Number(req.params.userId);
  const enabled = req.body?.enabled !== false;
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 사용자 ID입니다.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(`UPDATE users SET is_shadow_muted = ? WHERE id = ?`, [enabled, userId]);
    await writeAuditLog(connection, {
      adminUserId,
      actionType: enabled ? 'user_shadow_mute' : 'user_shadow_unmute',
      targetType: 'user',
      targetId: userId,
      note: req.body?.reason || null,
    });
    await writeUserSanction(connection, {
      userId,
      sanctionType: enabled ? 'shadow_mute' : 'shadow_unmute',
      reason: req.body?.reason || null,
      adminUserId,
    });
    await connection.commit();
    res.json({
      success: true,
      message: enabled ? '섀도우 뮤트를 적용했습니다.' : '섀도우 뮤트를 해제했습니다.',
    });
  } catch (error) {
    await connection.rollback();
    console.error('섀도우 뮤트 오류:', error);
    res.status(500).json({ success: false, message: '섀도우 뮤트 처리 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

router.get('/users/:userId/sanctions', requireAdminApi, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 사용자 ID' });
  }
  try {
    const { getUserSanctionHistory } = await import('../services/userSanctions.service.js');
    const rows = await getUserSanctionHistory(userId, req.query.limit);
    return res.json({ success: true, data: { sanctions: rows } });
  } catch (error) {
    console.error('제재 이력 조회 오류:', error);
    return res.status(500).json({ success: false, message: '제재 이력 조회 실패' });
  }
});

router.get('/blocks', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const [rows] = await pool.execute(
      `SELECT
         ub.id,
         ub.user_id,
         u1.username AS user_username,
         u1.name_enc AS user_name_enc,
         ub.blocked_user_id,
         u2.username AS blocked_username,
         u2.name_enc AS blocked_name_enc,
         ub.reason,
         ub.created_at
       FROM user_blocks ub
       LEFT JOIN users u1 ON u1.id = ub.user_id
       LEFT JOIN users u2 ON u2.id = ub.blocked_user_id
       ORDER BY ub.created_at DESC
       LIMIT 500`
    );
    return res.json({ success: true, data: { blocks: rows } });
  } catch (error) {
    console.error('관리자 차단 목록 조회 오류:', error);
    return res.status(500).json({ success: false, message: '차단 목록 조회 중 오류가 발생했습니다.' });
  }
});

router.delete('/blocks/:blockId', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const blockId = Number(req.params.blockId);
  if (!Number.isFinite(blockId) || blockId <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 차단 ID입니다.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT id, user_id, blocked_user_id FROM user_blocks WHERE id = ? FOR UPDATE`,
      [blockId]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '차단 내역을 찾을 수 없습니다.' });
    }
    await connection.execute(`DELETE FROM user_blocks WHERE id = ?`, [blockId]);
    await writeAuditLog(connection, {
      adminUserId,
      actionType: 'user_block_release',
      targetType: 'user_block',
      targetId: blockId,
      extra: {
        userId: rows[0].user_id,
        blockedUserId: rows[0].blocked_user_id,
      },
    });
    await connection.commit();
    return res.json({ success: true, message: '차단을 해제했습니다.' });
  } catch (error) {
    await connection.rollback();
    console.error('관리자 차단 해제 오류:', error);
    return res.status(500).json({ success: false, message: '차단 해제 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

router.get('/logs', requireAdminApi, async (req, res) => {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  try {
    const { action = '', q = '', fromDate = '', toDate = '', page = 1, limit = 50 } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const offsetNum = (pageNum - 1) * limitNum;
    const conditions = ['1=1'];
    const params = [];
    if (action) {
      conditions.push('l.action_type = ?');
      params.push(String(action).trim());
    }
    if (q) {
      conditions.push('(CAST(l.target_id AS CHAR) LIKE ? OR CAST(l.admin_user_id AS CHAR) LIKE ?)');
      const like = `%${String(q).trim()}%`;
      params.push(like, like);
    }
    if (fromDate) {
      conditions.push('DATE(l.created_at) >= ?');
      params.push(String(fromDate).trim());
    }
    if (toDate) {
      conditions.push('DATE(l.created_at) <= ?');
      params.push(String(toDate).trim());
    }
    const whereSql = conditions.join(' AND ');
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS c FROM admin_audit_logs l WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.c || 0);
    const [rows] = await pool.execute(
      `SELECT
         l.id,
         l.created_at,
         l.admin_user_id,
         l.action_type,
         l.target_type,
         l.target_id,
         l.note,
         l.extra
       FROM admin_audit_logs l
       WHERE ${whereSql}
       ORDER BY l.created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      params,
    );
    res.json({
      success: true,
      data: {
        logs: rows,
        pagination: { page: pageNum, limit: limitNum, total },
      },
    });
  } catch (error) {
    console.error('관리자 감사 로그 조회 오류:', error);
    res.status(500).json({ success: false, message: '감사 로그 조회 중 오류가 발생했습니다.' });
  }
});

router.patch('/reports/:reportId', requireAdminApi, async (req, res) => {
  const reviewerId = req.user.userId;
  if (!isAdminUser(reviewerId)) {
    return res.status(403).json({
      success: false,
      message: '관리자 권한이 필요합니다.',
    });
  }

  const reportId = Number(req.params.reportId);
  const actionRaw = String(req.body?.action ?? '').toUpperCase();
  const note = req.body?.note != null ? String(req.body.note).trim() : null;
  const malicious = req.body?.malicious === true || req.body?.malicious === 'true';

  if (!Number.isFinite(reportId) || reportId <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 신고 ID입니다.' });
  }
  if (actionRaw !== 'CONFIRM' && actionRaw !== 'REJECT') {
    return res.status(400).json({ success: false, message: 'action은 CONFIRM 또는 REJECT 이어야 합니다.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id, reporter_id, target_type, target_id, status, penalty_applied
       FROM reports
       WHERE id = ?
       FOR UPDATE`,
      [reportId]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '신고를 찾을 수 없습니다.' });
    }
    const report = rows[0];
    if (report.status !== 'pending') {
      await connection.rollback();
      return res.status(409).json({ success: false, message: '이미 처리된 신고입니다.' });
    }

    const nextStatus = actionRaw === 'CONFIRM' ? 'resolved' : 'rejected';
    await connection.execute(
      `UPDATE reports
       SET status = ?,
           reviewed_by = ?,
           reviewed_at = ?,
           review_note = ?,
           is_malicious = ?,
           penalty_applied = IF(? = TRUE, TRUE, penalty_applied)
       WHERE id = ?`,
      [nextStatus, reviewerId, getNowForDB(), note, malicious, malicious, reportId]
    );

    await applyReportTargetModeration(connection, report, actionRaw);

    // 정당 신고 확정 시 작성자 경고 +1
    if (actionRaw === 'CONFIRM') {
      const ownerId = await getTargetOwnerId(connection, report.target_type, report.target_id);
      if (ownerId) {
        await connection.execute(
          `UPDATE users
           SET violation_warning_count = violation_warning_count + 1
           WHERE id = ?`,
          [ownerId]
        );
      }
    }

    // 허위 신고 판정 시 신고자 경고 +1
    if (actionRaw === 'REJECT' && malicious && !report.penalty_applied) {
      await connection.execute(
        `UPDATE users
         SET false_report_warning_count = false_report_warning_count + 1
         WHERE id = ?`,
        [report.reporter_id]
      );
      await connection.execute('UPDATE reports SET penalty_applied = TRUE WHERE id = ?', [reportId]);
    }

    await writeAuditLog(connection, {
      adminUserId: reviewerId,
      actionType: actionRaw === 'CONFIRM' ? 'report_confirm' : 'report_reject',
      targetType: 'report',
      targetId: reportId,
      note,
      extra: { malicious },
    });

    await connection.commit();
    return res.json({
      success: true,
      message: actionRaw === 'CONFIRM' ? '신고를 확정 처리했습니다.' : '신고를 기각 처리했습니다.',
    });
  } catch (error) {
    await connection.rollback();
    console.error('관리자 신고 판정 오류:', error);
    return res.status(500).json({
      success: false,
      message: '관리자 신고 판정 처리 중 오류가 발생했습니다.',
    });
  } finally {
    connection.release();
  }
});

router.post('/reports/bulk-confirm', requireAdminApi, async (req, res) => {
  req.body = { ...(req.body || {}), action: 'CONFIRM', malicious: false, note: req.body?.note || null };
  return bulkHandle(req, res);
});

router.post('/reports/bulk-reject', requireAdminApi, async (req, res) => {
  req.body = { ...(req.body || {}), action: 'REJECT', malicious: !!req.body?.malicious, note: req.body?.note || null };
  return bulkHandle(req, res);
});

async function bulkHandle(req, res) {
  const adminUserId = req.user.userId;
  if (!isAdminUser(adminUserId)) {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0) : [];
  const BULK_MAX = Number(process.env.ADMIN_BULK_MAX || 50);
  if (!ids.length) {
    return res.status(400).json({ success: false, message: '처리할 신고 ID가 없습니다.' });
  }
  if (ids.length > BULK_MAX) {
    return res.status(400).json({
      success: false,
      message: `일괄 처리는 최대 ${BULK_MAX}건까지 가능합니다.`,
    });
  }
  const actionRaw = String(req.body?.action || '').toUpperCase();
  if (!['CONFIRM', 'REJECT'].includes(actionRaw)) {
    return res.status(400).json({ success: false, message: 'action은 CONFIRM/REJECT 이어야 합니다.' });
  }
  const malicious = req.body?.malicious === true;
  const note = req.body?.note != null ? String(req.body.note).trim() : null;
  const connection = await pool.getConnection();
  let processed = 0;
  try {
    await connection.beginTransaction();
    for (const reportId of ids) {
      const [rows] = await connection.execute(
        `SELECT id, reporter_id, target_type, target_id, status, penalty_applied
         FROM reports
         WHERE id = ?
         FOR UPDATE`,
        [reportId]
      );
      if (!rows.length) continue;
      const report = rows[0];
      if (report.status !== 'pending') continue;

      const nextStatus = actionRaw === 'CONFIRM' ? 'resolved' : 'rejected';
      await connection.execute(
        `UPDATE reports
         SET status = ?, reviewed_by = ?, reviewed_at = ?, review_note = ?, is_malicious = ?, penalty_applied = IF(? = TRUE, TRUE, penalty_applied)
         WHERE id = ?`,
        [nextStatus, adminUserId, getNowForDB(), note, malicious, malicious, reportId]
      );

      await applyReportTargetModeration(connection, report, actionRaw);
      if (actionRaw === 'CONFIRM') {
        const ownerId = await getTargetOwnerId(connection, report.target_type, report.target_id);
        if (ownerId) {
          await connection.execute(
            `UPDATE users SET violation_warning_count = violation_warning_count + 1 WHERE id = ?`,
            [ownerId]
          );
        }
      }
      if (actionRaw === 'REJECT' && malicious && !report.penalty_applied) {
        await connection.execute(
          `UPDATE users SET false_report_warning_count = false_report_warning_count + 1 WHERE id = ?`,
          [report.reporter_id]
        );
        await connection.execute(`UPDATE reports SET penalty_applied = TRUE WHERE id = ?`, [reportId]);
      }
      await writeAuditLog(connection, {
        adminUserId,
        actionType: actionRaw === 'CONFIRM' ? 'report_confirm' : 'report_reject',
        targetType: 'report',
        targetId: reportId,
        note,
        extra: { bulk: true, malicious },
      });
      processed += 1;
    }
    await connection.commit();
    return res.json({ success: true, message: `${processed}건 처리 완료`, data: { processed } });
  } catch (error) {
    await connection.rollback();
    console.error('관리자 신고 일괄 처리 오류:', error);
    return res.status(500).json({ success: false, message: '일괄 처리 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
}

export default router;

import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { enqueueNotification } from '../utils/notificationWorker.js';
import { getNowForDB } from '../utils/dateUtils.js';

const router = express.Router();

// ==================== 개인 우편 API ====================

// 개인 우편 목록 조회 (받은 우편)
router.get('/personal/received', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, isRead } = req.query;
    const params = [userId];
    const conditions = ['pm.recipient_id = ?', 'pm.is_deleted = FALSE'];

    // 읽음 여부 필터
    if (isRead !== undefined) {
      conditions.push('pm.is_read = ?');
      params.push(isRead === 'true' ? 1 : 0);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    // 받은 우편 조회 (pm. 한정으로 is_deleted 모호함 제거)
    const [mails] = await pool.execute(
      `SELECT 
        pm.id,
        pm.sender_id,
        pm.recipient_id,
        pm.content,
        pm.is_read,
        pm.is_deleted,
        pm.created_at,
        u.name as sender_name,
        u.color_id as sender_color_id
      FROM personal_mails pm
      LEFT JOIN users u ON pm.sender_id = u.id
      WHERE pm.recipient_id = ? AND pm.is_deleted = FALSE${isRead !== undefined ? ' AND pm.is_read = ?' : ''}
      ORDER BY pm.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}`,
      params
    );

    // 전체 개수 조회
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM personal_mails pm
       WHERE pm.recipient_id = ? AND pm.is_deleted = FALSE${isRead !== undefined ? ' AND pm.is_read = ?' : ''}`,
      params
    );
    const total = Number(countResult[0]?.total ?? 0);

    res.json({
      success: true,
      data: {
        mails,
        pagination: {
          page: parseInt(page, 10),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (error) {
    console.error('받은 우편 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '받은 우편 목록 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 개인 우편 목록 조회 (보낸 우편)
router.get('/personal/sent', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    // 보낸 우편 조회
    const [mails] = await pool.execute(
      `SELECT 
        pm.id,
        pm.sender_id,
        pm.recipient_id,
        pm.content,
        pm.is_read,
        pm.is_deleted,
        pm.created_at,
        u.name as recipient_name,
        u.color_id as recipient_color_id
      FROM personal_mails pm
      LEFT JOIN users u ON pm.recipient_id = u.id
      WHERE pm.sender_id = ? AND pm.is_deleted = FALSE
      ORDER BY pm.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [userId]
    );

    // 전체 개수 조회
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM personal_mails 
       WHERE sender_id = ? AND is_deleted = FALSE`,
      [userId]
    );
    const total = Number(countResult[0]?.total ?? 0);

    res.json({
      success: true,
      data: {
        mails,
        pagination: {
          page: parseInt(page, 10),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (error) {
    console.error('보낸 우편 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '보낸 우편 목록 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 개인 우편 상세 조회
router.get('/personal/:mailId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mailId } = req.params;

    // 우편 조회 (받은 우편 또는 보낸 우편)
    const [mails] = await pool.execute(
      `SELECT 
        pm.id,
        pm.sender_id,
        pm.recipient_id,
        pm.content,
        pm.is_read,
        pm.is_deleted,
        pm.created_at,
        u1.name as sender_name,
        u1.color_id as sender_color_id,
        u2.name as recipient_name,
        u2.color_id as recipient_color_id
      FROM personal_mails pm
      LEFT JOIN users u1 ON pm.sender_id = u1.id
      LEFT JOIN users u2 ON pm.recipient_id = u2.id
      WHERE pm.id = ? 
        AND (pm.sender_id = ? OR pm.recipient_id = ?)
        AND pm.is_deleted = FALSE`,
      [mailId, userId, userId]
    );

    if (mails.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '우편을 찾을 수 없거나 접근 권한이 없습니다.' 
      });
    }

    const mail = mails[0];

    // 받은 우편인 경우 읽음 처리
    if (mail.recipient_id === userId && !mail.is_read) {
      await pool.execute(
        'UPDATE personal_mails SET is_read = TRUE WHERE id = ?',
        [mailId]
      );
      mail.is_read = true;
    }

    res.json({
      success: true,
      data: mail
    });
  } catch (error) {
    console.error('개인 우편 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '개인 우편 상세 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 개인 우편 작성
router.post('/personal', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { recipientId, content } = req.body;

    if (!recipientId || !content) {
      return res.status(400).json({ 
        success: false, 
        message: '수신자 ID와 내용을 입력해주세요.' 
      });
    }

    if (userId === parseInt(recipientId)) {
      return res.status(400).json({ 
        success: false, 
        message: '자기 자신에게는 우편을 보낼 수 없습니다.' 
      });
    }

    // 수신자 존재 확인
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND is_deleted = FALSE',
      [recipientId]
    );
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '수신자를 찾을 수 없습니다.' 
      });
    }

    // 우편 생성
    const [result] = await pool.execute(
      `INSERT INTO personal_mails (sender_id, recipient_id, content, created_at)
       VALUES (?, ?, ?, ?)`,
      [userId, recipientId, content.trim(), getNowForDB()]
    );

    // 생성된 우편 정보 조회
    const [newMails] = await pool.execute(
      `SELECT 
        pm.id,
        pm.sender_id,
        pm.recipient_id,
        pm.content,
        pm.is_read,
        pm.is_deleted,
        pm.created_at,
        u.name as recipient_name,
        u.color_id as recipient_color_id
      FROM personal_mails pm
      LEFT JOIN users u ON pm.recipient_id = u.id
      WHERE pm.id = ?`,
      [result.insertId]
    );

    // 수신자에게 알림 생성 (비동기 큐 + 소켓 emit)
    await enqueueNotification({
      userId: Number(recipientId),
      type: 'mail',
      category: 'mail',
      title: '새로운 익명 우편이 도착했습니다',
      body: content.trim().slice(0, 80),
      relatedType: 'personal_mail',
      relatedId: result.insertId,
    });

    res.status(201).json({
      success: true,
      message: '우편이 전송되었습니다.',
      data: newMails[0]
    });
  } catch (error) {
    console.error('개인 우편 작성 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '우편 작성 중 오류가 발생했습니다.' 
    });
  }
});

// 개인 우편 답장
router.post('/personal/:mailId/reply', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mailId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ 
        success: false, 
        message: '답장 내용을 입력해주세요.' 
      });
    }

    // 원본 우편 조회 (받은 우편인지 확인)
    const [mails] = await pool.execute(
      `SELECT sender_id, recipient_id 
       FROM personal_mails 
       WHERE id = ? AND recipient_id = ? AND is_deleted = FALSE`,
      [mailId, userId]
    );

    if (mails.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '답장할 우편을 찾을 수 없거나 권한이 없습니다.' 
      });
    }

    const originalMail = mails[0];
    const recipientId = originalMail.sender_id; // 원본 발신자에게 답장

    // 답장 우편 생성
    const [result] = await pool.execute(
      `INSERT INTO personal_mails (sender_id, recipient_id, content, created_at)
       VALUES (?, ?, ?, ?)`,
      [userId, recipientId, content.trim(), getNowForDB()]
    );

    // 생성된 답장 정보 조회
    const [replyMails] = await pool.execute(
      `SELECT 
        pm.id,
        pm.sender_id,
        pm.recipient_id,
        pm.content,
        pm.is_read,
        pm.is_deleted,
        pm.created_at,
        u.name as recipient_name,
        u.color_id as recipient_color_id
      FROM personal_mails pm
      LEFT JOIN users u ON pm.recipient_id = u.id
      WHERE pm.id = ?`,
      [result.insertId]
    );

    // 원본 발신자(=이번 답장 수신자)에게 알림 생성 (비동기 큐 + 소켓 emit)
    await enqueueNotification({
      userId: Number(recipientId),
      type: 'mail',
      category: 'mail',
      title: '새로운 익명 우편 답장이 도착했습니다',
      body: content.trim().slice(0, 80),
      relatedType: 'personal_mail',
      relatedId: result.insertId,
    });

    res.status(201).json({
      success: true,
      message: '답장이 전송되었습니다.',
      data: replyMails[0]
    });
  } catch (error) {
    console.error('개인 우편 답장 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '답장 전송 중 오류가 발생했습니다.' 
    });
  }
});

// 개인 우편 읽음 처리
router.put('/personal/:mailId/read', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mailId } = req.params;

    // 우편 존재 및 권한 확인 (받은 우편만 읽음 처리 가능)
    const [mails] = await pool.execute(
      `SELECT id FROM personal_mails 
       WHERE id = ? AND recipient_id = ? AND is_deleted = FALSE`,
      [mailId, userId]
    );

    if (mails.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '우편을 찾을 수 없거나 읽음 처리할 권한이 없습니다.' 
      });
    }

    // 읽음 처리
    await pool.execute(
      'UPDATE personal_mails SET is_read = TRUE WHERE id = ?',
      [mailId]
    );

    res.json({
      success: true,
      message: '우편이 읽음 처리되었습니다.'
    });
  } catch (error) {
    console.error('개인 우편 읽음 처리 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '읽음 처리 중 오류가 발생했습니다.' 
    });
  }
});

// 개인 우편 삭제
router.delete('/personal/:mailId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mailId } = req.params;

    // 우편 존재 및 권한 확인
    const [mails] = await pool.execute(
      `SELECT id FROM personal_mails 
       WHERE id = ? AND (sender_id = ? OR recipient_id = ?) AND is_deleted = FALSE`,
      [mailId, userId, userId]
    );

    if (mails.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '우편을 찾을 수 없거나 삭제할 권한이 없습니다.' 
      });
    }

    // 삭제 처리 (소프트 삭제)
    await pool.execute(
      'UPDATE personal_mails SET is_deleted = TRUE WHERE id = ?',
      [mailId]
    );

    res.json({
      success: true,
      message: '우편이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('개인 우편 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '우편 삭제 중 오류가 발생했습니다.' 
    });
  }
});

// 읽지 않은 개인 우편 수 조회
router.get('/personal/unread-count', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [result] = await pool.execute(
      `SELECT COUNT(*) as total_unread
       FROM personal_mails
       WHERE recipient_id = ? AND is_read = FALSE AND is_deleted = FALSE`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        unreadCount: result[0].total_unread
      }
    });
  } catch (error) {
    console.error('읽지 않은 개인 우편 수 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '읽지 않은 우편 수 조회 중 오류가 발생했습니다.' 
    });
  }
});

// ==================== 학교 우편 API ====================

// 학교 우편 목록 조회
router.get('/school', async (req, res) => {
  try {
    const { schoolId, page = 1, limit = 20 } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    if (!schoolId) {
      return res.status(400).json({ 
        success: false, 
        message: '학교 ID를 입력해주세요.' 
      });
    }

    // 학교 우편 조회
    const [mails] = await pool.execute(
      `SELECT 
        sm.id,
        sm.school_id,
        sm.user_id,
        sm.content,
        sm.comment_count,
        sm.is_deleted,
        sm.created_at,
        u.name as author_name,
        u.color_id as author_color_id,
        s.name as school_name
      FROM school_mails sm
      LEFT JOIN users u ON sm.user_id = u.id
      LEFT JOIN schools s ON sm.school_id = s.school_id
      WHERE sm.school_id = ? AND sm.is_deleted = FALSE
      ORDER BY sm.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [schoolId]
    );

    // 전체 개수 조회
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM school_mails 
       WHERE school_id = ? AND is_deleted = FALSE`,
      [schoolId]
    );
    const total = Number(countResult[0]?.total ?? 0);

    res.json({
      success: true,
      data: {
        mails,
        pagination: {
          page: parseInt(page, 10),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (error) {
    console.error('학교 우편 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '학교 우편 목록 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 학교 우편 상세 조회
router.get('/school/:mailId', async (req, res) => {
  try {
    const { mailId } = req.params;

    // 학교 우편 조회
    const [mails] = await pool.execute(
      `SELECT 
        sm.id,
        sm.school_id,
        sm.user_id,
        sm.content,
        sm.comment_count,
        sm.is_deleted,
        sm.created_at,
        u.name as author_name,
        u.color_id as author_color_id,
        s.name as school_name
      FROM school_mails sm
      LEFT JOIN users u ON sm.user_id = u.id
      LEFT JOIN schools s ON sm.school_id = s.school_id
      WHERE sm.id = ? AND sm.is_deleted = FALSE`,
      [mailId]
    );

    if (mails.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '학교 우편을 찾을 수 없습니다.' 
      });
    }

    res.json({
      success: true,
      data: mails[0]
    });
  } catch (error) {
    console.error('학교 우편 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '학교 우편 상세 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 학교 우편 작성
router.post('/school', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { schoolId, content } = req.body;

    if (!schoolId || !content) {
      return res.status(400).json({ 
        success: false, 
        message: '학교 ID와 내용을 입력해주세요.' 
      });
    }

    // 사용자 정보 확인
    const [users] = await pool.execute(
      'SELECT school_id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다.' 
      });
    }

    const user = users[0];

    // 학교 게시판인 경우 사용자의 학교와 일치하는지 확인
    if (user.school_id !== String(schoolId)) {
      return res.status(403).json({ 
        success: false, 
        message: '본인 학교에만 우편을 작성할 수 있습니다.' 
      });
    }

    // 학교 존재 확인
    const [schools] = await pool.execute(
      'SELECT school_id FROM schools WHERE school_id = ?',
      [schoolId]
    );

    if (schools.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '학교를 찾을 수 없습니다.' 
      });
    }

    // 학교 우편 생성
    const [result] = await pool.execute(
      `INSERT INTO school_mails (school_id, user_id, content, created_at) 
       VALUES (?, ?, ?, ?)`,
      [schoolId, userId, content.trim(), getNowForDB()]
    );

    // 생성된 우편 정보 조회
    const [newMails] = await pool.execute(
      `SELECT 
        sm.id,
        sm.school_id,
        sm.user_id,
        sm.content,
        sm.comment_count,
        sm.is_deleted,
        sm.created_at,
        u.name as author_name,
        u.color_id as author_color_id,
        s.name as school_name
      FROM school_mails sm
      LEFT JOIN users u ON sm.user_id = u.id
      LEFT JOIN schools s ON sm.school_id = s.school_id
      WHERE sm.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: '학교 우편이 작성되었습니다.',
      data: newMails[0]
    });
  } catch (error) {
    console.error('학교 우편 작성 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '학교 우편 작성 중 오류가 발생했습니다.' 
    });
  }
});

// 학교 우편 삭제
router.delete('/school/:mailId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mailId } = req.params;

    // 우편 존재 및 작성자 확인
    const [mails] = await pool.execute(
      `SELECT id FROM school_mails 
       WHERE id = ? AND user_id = ? AND is_deleted = FALSE`,
      [mailId, userId]
    );

    if (mails.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '학교 우편을 찾을 수 없거나 삭제할 권한이 없습니다.' 
      });
    }

    // 삭제 처리 (소프트 삭제)
    await pool.execute(
      'UPDATE school_mails SET is_deleted = TRUE WHERE id = ?',
      [mailId]
    );

    res.json({
      success: true,
      message: '학교 우편이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('학교 우편 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '학교 우편 삭제 중 오류가 발생했습니다.' 
    });
  }
});

// 학교 우편 댓글 작성
// 주의: 현재 DB 구조에는 school_mail_comments 테이블이 없습니다.
// 댓글 기능을 사용하려면 별도의 school_mail_comments 테이블이 필요합니다.
// 이 API는 테이블이 생성된 후 사용할 수 있습니다.
router.post('/school/:mailId/comments', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mailId } = req.params;
    const { content, parentCommentId } = req.body;

    if (!content) {
      return res.status(400).json({ 
        success: false, 
        message: '댓글 내용을 입력해주세요.' 
      });
    }

    // 학교 우편 존재 확인
    const [mails] = await pool.execute(
      'SELECT id, school_id FROM school_mails WHERE id = ? AND is_deleted = FALSE',
      [mailId]
    );
    if (mails.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '학교 우편을 찾을 수 없습니다.' 
      });
    }

    // 사용자 학교 확인
    const [users] = await pool.execute(
      'SELECT school_id FROM users WHERE id = ?',
      [userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다.' 
      });
    }

    const mail = mails[0];
    const user = users[0];

    // 같은 학교 사용자만 댓글 작성 가능
    if (mail.school_id !== user.school_id) {
      return res.status(403).json({ 
        success: false, 
        message: '같은 학교 사용자만 댓글을 작성할 수 있습니다.' 
      });
    }

    // TODO: school_mail_comments 테이블이 생성되면 아래 코드를 활성화하세요
    // 현재는 DB 구조에 school_mail_comments 테이블이 없으므로 에러를 반환합니다.
    return res.status(501).json({ 
      success: false, 
      message: '학교 우편 댓글 기능은 아직 구현되지 않았습니다. school_mail_comments 테이블이 필요합니다.' 
    });

    /* 
    // 대댓글인 경우 부모 댓글 확인
    if (parentCommentId) {
      const [parentComments] = await pool.execute(
        'SELECT id FROM school_mail_comments WHERE id = ? AND mail_id = ?',
        [parentCommentId, mailId]
      );
      if (parentComments.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: '부모 댓글을 찾을 수 없습니다.' 
        });
      }
    }

    // 해당 우편의 댓글 수 계산하여 익명 번호 부여
    const [commentCountResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM school_mail_comments WHERE mail_id = ?',
      [mailId]
    );
    const anonymousIndex = (commentCountResult[0].count % 100) + 1;

    // 댓글 생성
    const [result] = await pool.execute(
      `INSERT INTO school_mail_comments (mail_id, user_id, parent_comment_id, content, anonymous_index, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [mailId, userId, parentCommentId || null, content, anonymousIndex, getNowForDB()]
    );

    // 학교 우편의 댓글 수 증가
    await pool.execute(
      'UPDATE school_mails SET comment_count = comment_count + 1 WHERE id = ?',
      [mailId]
    );

    // 생성된 댓글 정보 조회
    const [comments] = await pool.execute(
      `SELECT 
        smc.id,
        smc.mail_id,
        smc.user_id,
        smc.parent_comment_id,
        smc.content,
        smc.anonymous_index,
        smc.created_at,
        u.name as author_name,
        u.color_id
      FROM school_mail_comments smc
      LEFT JOIN users u ON smc.user_id = u.id
      WHERE smc.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: '댓글이 작성되었습니다.',
      data: comments[0]
    });
    */
  } catch (error) {
    console.error('학교 우편 댓글 작성 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '댓글 작성 중 오류가 발생했습니다.' 
    });
  }
});

// 학교 우편 댓글 목록 조회
// 주의: 현재 DB 구조에는 school_mail_comments 테이블이 없습니다.
router.get('/school/:mailId/comments', async (req, res) => {
  try {
    const { mailId } = req.params;
    const userId = req.headers.authorization ? req.user?.userId : null;

    // 학교 우편 존재 확인
    const [mails] = await pool.execute(
      'SELECT id FROM school_mails WHERE id = ? AND is_deleted = FALSE',
      [mailId]
    );
    if (mails.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '학교 우편을 찾을 수 없습니다.' 
      });
    }

    // TODO: school_mail_comments 테이블이 생성되면 아래 코드를 활성화하세요
    return res.status(501).json({ 
      success: false, 
      message: '학교 우편 댓글 기능은 아직 구현되지 않았습니다. school_mail_comments 테이블이 필요합니다.' 
    });

    /*
    // 댓글 조회 (대댓글 포함)
    const [comments] = await pool.execute(
      `SELECT 
        smc.id,
        smc.mail_id,
        smc.user_id,
        smc.parent_comment_id,
        smc.content,
        smc.anonymous_index,
        smc.created_at,
        u.name as author_name,
        u.color_id
      FROM school_mail_comments smc
      LEFT JOIN users u ON smc.user_id = u.id
      WHERE smc.mail_id = ?
      ORDER BY smc.parent_comment_id IS NULL DESC, smc.created_at ASC`,
      [mailId]
    );

    res.json({
      success: true,
      data: {
        comments
      }
    });
    */
  } catch (error) {
    console.error('학교 우편 댓글 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '댓글 목록 조회 중 오류가 발생했습니다.' 
    });
  }
});

export default router;

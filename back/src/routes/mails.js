import express from 'express';
import pool from '../config/database.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { enqueueNotification } from '../utils/notificationWorker.js';
import { getNowForDB } from '../utils/dateUtils.js';

const router = express.Router();

// ==================== 개인 우편 API ====================

// 개인 우편 목록 조회 (받은 우편)
router.get('/personal/received', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, isRead } = req.query;
    const params = [userId, userId];
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
        pm.parent_mail_id,
        pm.root_mail_id,
        pm.room_id,
        COALESCE(pm.root_mail_id, pm.id) AS thread_key,
        root_pm.sender_id AS root_sender_id,
        (root_pm.sender_id = ?) AS is_root_author_for_current_user,
        (
          SELECT COUNT(*)
          FROM personal_mails r
          WHERE r.parent_mail_id = pm.id
            AND r.is_deleted = FALSE
        ) > 0 AS has_reply,
        pm.created_at,
        u.name as sender_name,
        u.color_id as sender_color_id,
        (pm.parent_mail_id IS NOT NULL AND par.sender_id = ?) AS reply_to_my_sent
      FROM personal_mails pm
      LEFT JOIN users u ON pm.sender_id = u.id
      LEFT JOIN personal_mails par ON par.id = pm.parent_mail_id AND par.is_deleted = FALSE
      LEFT JOIN personal_mails root_pm ON root_pm.id = COALESCE(pm.root_mail_id, pm.id) AND root_pm.is_deleted = FALSE
      WHERE pm.recipient_id = ? AND pm.is_deleted = FALSE${isRead !== undefined ? ' AND pm.is_read = ?' : ''}
      ORDER BY pm.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [userId, ...params]
    );

    // 전체 개수 조회 (목록 SELECT와 플레이스홀더 개수가 다름)
    const countParams =
      isRead !== undefined ? [userId, isRead === 'true' ? 1 : 0] : [userId];
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM personal_mails pm
       WHERE pm.recipient_id = ? AND pm.is_deleted = FALSE${isRead !== undefined ? ' AND pm.is_read = ?' : ''}`,
      countParams
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
        pm.parent_mail_id,
        pm.root_mail_id,
        pm.room_id,
        COALESCE(pm.root_mail_id, pm.id) AS thread_key,
        root_pm.sender_id AS root_sender_id,
        (root_pm.sender_id = ?) AS is_root_author_for_current_user,
        (
          SELECT COUNT(*)
          FROM personal_mails r
          WHERE r.parent_mail_id = pm.id
            AND r.is_deleted = FALSE
        ) > 0 AS has_reply,
        pm.created_at,
        u.name as recipient_name,
        u.color_id as recipient_color_id
      FROM personal_mails pm
      LEFT JOIN users u ON pm.recipient_id = u.id
      LEFT JOIN personal_mails root_pm ON root_pm.id = COALESCE(pm.root_mail_id, pm.id) AND root_pm.is_deleted = FALSE
      WHERE pm.sender_id = ? AND pm.is_deleted = FALSE
      ORDER BY pm.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [userId, userId]
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

// 개인 우편 스레드 전체 조회
router.get('/personal/:mailId/thread', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mailId } = req.params;

    const [baseRows] = await pool.execute(
      `SELECT id, sender_id, recipient_id, root_mail_id
       FROM personal_mails
       WHERE id = ? AND is_deleted = FALSE`,
      [mailId]
    );

    if (baseRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '우편을 찾을 수 없습니다.',
      });
    }

    const base = baseRows[0];
    const threadRootId = base.root_mail_id == null ? Number(mailId) : Number(base.root_mail_id);

    const [participationRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM personal_mails pm
       WHERE (pm.id = ? OR pm.root_mail_id = ?)
         AND pm.is_deleted = FALSE
         AND (pm.sender_id = ? OR pm.recipient_id = ?)`,
      [threadRootId, threadRootId, userId, userId]
    );

    if (Number(participationRows[0]?.cnt ?? 0) === 0) {
      return res.status(403).json({
        success: false,
        message: '해당 스레드에 접근할 권한이 없습니다.',
      });
    }

    const [messages] = await pool.execute(
      `SELECT
        pm.id,
        pm.sender_id,
        s.name as sender_name,
        pm.recipient_id,
        r.name as recipient_name,
        pm.content,
        pm.created_at,
        pm.parent_mail_id,
        pm.root_mail_id,
        pm.room_id,
        root_pm.sender_id AS root_sender_id,
        (root_pm.sender_id = ?) AS is_root_author_for_current_user
       FROM personal_mails pm
       JOIN users s ON pm.sender_id = s.id
       JOIN users r ON pm.recipient_id = r.id
       LEFT JOIN personal_mails root_pm ON root_pm.id = COALESCE(pm.root_mail_id, pm.id) AND root_pm.is_deleted = FALSE
       WHERE (pm.id = ? OR pm.root_mail_id = ?)
         AND pm.is_deleted = FALSE
       ORDER BY pm.created_at ASC`,
      [userId, threadRootId, threadRootId]
    );

    res.json({
      success: true,
      data: {
        thread_root_id: threadRootId,
        messages,
      },
    });
  } catch (error) {
    console.error('개인 우편 스레드 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '개인 우편 스레드 조회 중 오류가 발생했습니다.',
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
        pm.parent_mail_id,
        pm.root_mail_id,
        root_pm.sender_id AS root_sender_id,
        (root_pm.sender_id = ?) AS is_root_author_for_current_user,
        pm.created_at,
        u1.name as sender_name,
        u1.color_id as sender_color_id,
        u2.name as recipient_name,
        u2.color_id as recipient_color_id,
        (pm.parent_mail_id IS NOT NULL AND par.sender_id = ?) AS reply_to_my_sent
      FROM personal_mails pm
      LEFT JOIN users u1 ON pm.sender_id = u1.id
      LEFT JOIN users u2 ON pm.recipient_id = u2.id
      LEFT JOIN personal_mails par ON par.id = pm.parent_mail_id AND par.is_deleted = FALSE
      LEFT JOIN personal_mails root_pm ON root_pm.id = COALESCE(pm.root_mail_id, pm.id) AND root_pm.is_deleted = FALSE
      WHERE pm.id = ? 
        AND (pm.sender_id = ? OR pm.recipient_id = ?)
        AND pm.is_deleted = FALSE`,
      [userId, userId, mailId, userId, userId]
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

    const [replies] = await pool.execute(
      `SELECT
         id,
         sender_id,
         recipient_id,
         content,
         created_at,
         parent_mail_id,
         root_mail_id
       FROM personal_mails
       WHERE parent_mail_id = ?
         AND is_deleted = FALSE
       ORDER BY created_at ASC`,
      [mailId]
    );

    res.json({
      success: true,
      data: {
        ...mail,
        replies,
      }
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

    const connection = await pool.getConnection();
    let result;
    try {
      await connection.beginTransaction();
      // 루트 우편 생성 (room_id는 생성 후 업데이트)
      [result] = await connection.execute(
        `INSERT INTO personal_mails (sender_id, recipient_id, content, root_mail_id, created_at)
         VALUES (?, ?, ?, NULL, ?)`,
        [userId, recipientId, content.trim(), getNowForDB()]
      );
      const rootMailId = Number(result.insertId);

      const [roomResult] = await connection.execute(
        `INSERT INTO personal_mail_rooms (
          root_mail_id,
          root_author_id,
          user1_id,
          user2_id,
          last_mail_id,
          last_mail_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          rootMailId,
          userId,
          Math.min(Number(userId), Number(recipientId)),
          Math.max(Number(userId), Number(recipientId)),
          rootMailId,
          getNowForDB(),
        ]
      );
      const roomId = Number(roomResult.insertId);

      await connection.execute(
        `UPDATE personal_mails
         SET root_mail_id = ?, room_id = ?
         WHERE id = ?`,
        [rootMailId, roomId, rootMailId]
      );
      await connection.commit();
    } catch (txError) {
      await connection.rollback();
      throw txError;
    } finally {
      connection.release();
    }

    // 생성된 우편 정보 조회
    const [newMails] = await pool.execute(
      `SELECT 
        pm.id,
        pm.sender_id,
        pm.recipient_id,
        pm.content,
        pm.is_read,
        pm.is_deleted,
        pm.room_id,
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
  const connection = await pool.getConnection();
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

    await connection.beginTransaction();

    // 원본 우편 조회 (받은 우편인지 확인) + 잠금
    const [mails] = await connection.execute(
      `SELECT id, sender_id, recipient_id, root_mail_id, parent_mail_id, room_id
       FROM personal_mails 
       WHERE id = ? AND recipient_id = ? AND is_deleted = FALSE
       FOR UPDATE`,
      [mailId, userId]
    );

    if (mails.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: '답장할 우편을 찾을 수 없거나 권한이 없습니다.' 
      });
    }

    const originalMail = mails[0];
    const recipientId = originalMail.sender_id; // 원본 발신자에게 답장
    const rootMailId = originalMail.root_mail_id == null ? Number(mailId) : Number(originalMail.root_mail_id);

    // 루트 우편 무결성 검증: 루트는 parent_mail_id 가 없어야 한다.
    const [rootRows] = await connection.execute(
      `SELECT id, sender_id, recipient_id, parent_mail_id
       FROM personal_mails
       WHERE id = ? AND is_deleted = FALSE
       FOR UPDATE`,
      [rootMailId]
    );
    if (rootRows.length === 0 || rootRows[0].parent_mail_id != null) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: '스레드 구조가 올바르지 않아 답장을 보낼 수 없습니다.',
      });
    }

    // 스레드 사용자쌍 일관성 검증: 같은 root 아래 모든 메일은 동일 2인 쌍이어야 한다.
    const [threadRows] = await connection.execute(
      `SELECT sender_id, recipient_id
       FROM personal_mails
       WHERE (id = ? OR root_mail_id = ?)
         AND is_deleted = FALSE`,
      [rootMailId, rootMailId]
    );
    const normalizePair = (a, b) => {
      const x = Number(a);
      const y = Number(b);
      return x < y ? `${x}:${y}` : `${y}:${x}`;
    };
    const expectedPair = normalizePair(userId, recipientId);
    const hasMismatchedPair = threadRows.some(
      (row) => normalizePair(row.sender_id, row.recipient_id) !== expectedPair
    );
    if (hasMismatchedPair) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: '스레드 참여자 정보가 일치하지 않아 답장을 보낼 수 없습니다.',
      });
    }

    // 룸 조회/검증
    const [roomRows] = await connection.execute(
      `SELECT id, root_author_id, user1_id, user2_id
       FROM personal_mail_rooms
       WHERE root_mail_id = ?
       FOR UPDATE`,
      [rootMailId]
    );
    if (roomRows.length === 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: '메일 룸 정보가 없어 답장을 보낼 수 없습니다.',
      });
    }
    const room = roomRows[0];
    const expectedPairSorted = [Math.min(Number(userId), Number(recipientId)), Math.max(Number(userId), Number(recipientId))];
    if (
      Number(room.user1_id) !== expectedPairSorted[0] ||
      Number(room.user2_id) !== expectedPairSorted[1]
    ) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: '메일 룸 참여자 정보가 일치하지 않습니다.',
      });
    }

    // 답장 우편 생성
    const [result] = await connection.execute(
      `INSERT INTO personal_mails (sender_id, recipient_id, content, parent_mail_id, root_mail_id, room_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, recipientId, content.trim(), Number(mailId), rootMailId, Number(room.id), getNowForDB()]
    );

    await connection.execute(
      `UPDATE personal_mail_rooms
       SET last_mail_id = ?, last_mail_at = ?
       WHERE id = ?`,
      [Number(result.insertId), getNowForDB(), Number(room.id)]
    );

    // 생성된 답장 정보 조회
    const [replyMails] = await connection.execute(
      `SELECT 
        pm.id,
        pm.sender_id,
        pm.recipient_id,
        pm.content,
        pm.is_read,
        pm.is_deleted,
        pm.parent_mail_id,
        pm.root_mail_id,
        pm.room_id,
        pm.created_at,
        u.name as recipient_name,
        u.color_id as recipient_color_id
      FROM personal_mails pm
      LEFT JOIN users u ON pm.recipient_id = u.id
      WHERE pm.id = ?`,
      [result.insertId]
    );

    await connection.commit();

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
    try {
      await connection.rollback();
    } catch (_) {
      // no-op
    }
    console.error('개인 우편 답장 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '답장 전송 중 오류가 발생했습니다.' 
    });
  } finally {
    connection.release();
  }
});

// 개인 우편 읽음 처리
const markPersonalMailAsRead = async (req, res) => {
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
};

router.put('/personal/:mailId/read', authenticate, markPersonalMailAsRead);
router.patch('/personal/:mailId/read', authenticate, markPersonalMailAsRead);

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
        sm.like_count,
        sm.is_deleted,
        sm.created_at,
        u.name as author_name,
        u.school_id as author_school_id,
        u.color_id as author_color_id,
        (SELECT s2.name FROM schools s2 WHERE s2.school_id = u.school_id) AS author_school_name,
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

// 학교 우편 상세 조회 (비로그인 가능 — is_liked 는 로그인 시만)
router.get('/school/:mailId', optionalAuthenticate, async (req, res) => {
  try {
    const { mailId } = req.params;
    const uid = req.user?.userId ?? 0;

    const [mails] = await pool.execute(
      `SELECT 
        sm.id,
        sm.school_id,
        sm.user_id,
        sm.content,
        sm.comment_count,
        sm.like_count,
        sm.is_deleted,
        sm.created_at,
        u.name as author_name,
        u.school_id as author_school_id,
        u.color_id as author_color_id,
        (SELECT s2.name FROM schools s2 WHERE s2.school_id = u.school_id) AS author_school_name,
        s.name as school_name,
        (SELECT COUNT(*) FROM school_mail_likes sml WHERE sml.mail_id = sm.id AND sml.user_id = ?) AS is_liked
      FROM school_mails sm
      LEFT JOIN users u ON sm.user_id = u.id
      LEFT JOIN schools s ON sm.school_id = s.school_id
      WHERE sm.id = ? AND sm.is_deleted = FALSE`,
      [uid, mailId]
    );

    if (mails.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '학교 우편을 찾을 수 없습니다.' 
      });
    }

    const row = mails[0];
    row.is_liked = Number(row.is_liked) > 0;

    res.json({
      success: true,
      data: row
    });
  } catch (error) {
    console.error('학교 우편 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '학교 우편 상세 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 학교 우편 좋아요 토글
router.post('/school/:mailId/like', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const { mailId } = req.params;
  const connection = await pool.getConnection();
  try {
    const [mrows] = await connection.execute(
      'SELECT id, like_count FROM school_mails WHERE id = ? AND is_deleted = FALSE',
      [mailId]
    );
    if (mrows.length === 0) {
      return res.status(404).json({ success: false, message: '학교 우편을 찾을 수 없습니다.' });
    }

    await connection.beginTransaction();
    const [likes] = await connection.execute(
      'SELECT 1 FROM school_mail_likes WHERE mail_id = ? AND user_id = ?',
      [mailId, userId]
    );
    let liked;
    if (likes.length > 0) {
      await connection.execute(
        'DELETE FROM school_mail_likes WHERE mail_id = ? AND user_id = ?',
        [mailId, userId]
      );
      await connection.execute(
        'UPDATE school_mails SET like_count = GREATEST(0, like_count - 1) WHERE id = ?',
        [mailId]
      );
      liked = false;
    } else {
      await connection.execute(
        'INSERT INTO school_mail_likes (mail_id, user_id) VALUES (?, ?)',
        [mailId, userId]
      );
      await connection.execute(
        'UPDATE school_mails SET like_count = like_count + 1 WHERE id = ?',
        [mailId]
      );
      liked = true;
    }
    await connection.commit();

    const [lcRows] = await pool.execute('SELECT like_count FROM school_mails WHERE id = ?', [mailId]);
    const likeCount = Number(lcRows[0]?.like_count ?? 0);
    res.json({ success: true, liked, likeCount });
  } catch (error) {
    await connection.rollback();
    console.error('학교 우편 좋아요 오류:', error);
    res.status(500).json({ success: false, message: '좋아요 처리 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// 학교 우편 댓글 좋아요 토글
router.post('/school/comments/:commentId/like', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const { commentId } = req.params;
  const connection = await pool.getConnection();
  try {
    const [crows] = await connection.execute(
      'SELECT id, like_count FROM school_mail_comments WHERE id = ? AND is_deleted = FALSE',
      [commentId]
    );
    if (crows.length === 0) {
      return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
    }

    await connection.beginTransaction();
    const [likes] = await connection.execute(
      'SELECT 1 FROM school_mail_comment_likes WHERE comment_id = ? AND user_id = ?',
      [commentId, userId]
    );
    let liked;
    if (likes.length > 0) {
      await connection.execute(
        'DELETE FROM school_mail_comment_likes WHERE comment_id = ? AND user_id = ?',
        [commentId, userId]
      );
      await connection.execute(
        'UPDATE school_mail_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = ?',
        [commentId]
      );
      liked = false;
    } else {
      await connection.execute(
        'INSERT INTO school_mail_comment_likes (comment_id, user_id) VALUES (?, ?)',
        [commentId, userId]
      );
      await connection.execute(
        'UPDATE school_mail_comments SET like_count = like_count + 1 WHERE id = ?',
        [commentId]
      );
      liked = true;
    }
    await connection.commit();

    const [ccRows] = await pool.execute('SELECT like_count FROM school_mail_comments WHERE id = ?', [
      commentId,
    ]);
    const likeCount = Number(ccRows[0]?.like_count ?? 0);
    res.json({ success: true, liked, likeCount });
  } catch (error) {
    await connection.rollback();
    console.error('학교 우편 댓글 좋아요 오류:', error);
    res.status(500).json({ success: false, message: '댓글 좋아요 처리 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
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
        sm.like_count,
        sm.is_deleted,
        sm.created_at,
        u.name as author_name,
        u.school_id as author_school_id,
        u.color_id as author_color_id,
        (SELECT s2.name FROM schools s2 WHERE s2.school_id = u.school_id) AS author_school_name,
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

// 학교 우편 댓글 목록 조회 (게시글보다 먼저 등록: /comments 가 :mailId에 안 먹히도록)
router.get('/school/:mailId/comments', optionalAuthenticate, async (req, res) => {
  try {
    const { mailId } = req.params;
    const uid = req.user?.userId ?? 0;

    const [mails] = await pool.execute(
      'SELECT id FROM school_mails WHERE id = ? AND is_deleted = FALSE',
      [mailId]
    );
    if (mails.length === 0) {
      return res.status(404).json({
        success: false,
        message: '학교 우편을 찾을 수 없습니다.',
      });
    }

    const [rows] = await pool.execute(
      `SELECT 
        smc.id,
        smc.mail_id,
        smc.user_id,
        smc.parent_id,
        smc.content,
        smc.like_count,
        smc.is_deleted,
        smc.created_at,
        u.school_id AS author_school_id,
        (SELECT s.name FROM schools s WHERE s.school_id = u.school_id) AS author_school_name,
        (SELECT COUNT(*) FROM school_mail_comment_likes smcl WHERE smcl.comment_id = smc.id AND smcl.user_id = ?) AS is_liked
      FROM school_mail_comments smc
      LEFT JOIN users u ON smc.user_id = u.id
      WHERE smc.mail_id = ? AND smc.is_deleted = FALSE
      ORDER BY smc.created_at ASC`,
      [uid, mailId]
    );

    const comments = rows.map((r) => ({
      ...r,
      is_liked: Number(r.is_liked) > 0,
    }));

    res.json({
      success: true,
      data: { comments },
    });
  } catch (error) {
    console.error('학교 우편 댓글 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '댓글 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

// 학교 우편 댓글 작성
router.post('/school/:mailId/comments', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mailId } = req.params;
    const { content, parentId } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({
        success: false,
        message: '댓글 내용을 입력해주세요.',
      });
    }

    const [mails] = await pool.execute(
      'SELECT id, school_id FROM school_mails WHERE id = ? AND is_deleted = FALSE',
      [mailId]
    );
    if (mails.length === 0) {
      return res.status(404).json({
        success: false,
        message: '학교 우편을 찾을 수 없습니다.',
      });
    }

    let parentIdVal = parentId != null ? Number(parentId) : null;
    if (parentIdVal) {
      const [parents] = await pool.execute(
        'SELECT id FROM school_mail_comments WHERE id = ? AND mail_id = ? AND is_deleted = FALSE',
        [parentIdVal, mailId]
      );
      if (parents.length === 0) {
        return res.status(404).json({
          success: false,
          message: '부모 댓글을 찾을 수 없습니다.',
        });
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO school_mail_comments (mail_id, user_id, parent_id, content, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [mailId, userId, parentIdVal, String(content).trim(), getNowForDB()]
    );

    await pool.execute('UPDATE school_mails SET comment_count = comment_count + 1 WHERE id = ?', [mailId]);

    const [created] = await pool.execute(
      `SELECT 
        smc.id,
        smc.mail_id,
        smc.user_id,
        smc.parent_id,
        smc.content,
        smc.like_count,
        smc.is_deleted,
        smc.created_at,
        u.school_id AS author_school_id,
        (SELECT s.name FROM schools s WHERE s.school_id = u.school_id) AS author_school_name
      FROM school_mail_comments smc
      LEFT JOIN users u ON smc.user_id = u.id
      WHERE smc.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: '댓글이 작성되었습니다.',
      data: created[0],
    });
  } catch (error) {
    console.error('학교 우편 댓글 작성 오류:', error);
    res.status(500).json({
      success: false,
      message: '댓글 작성 중 오류가 발생했습니다.',
    });
  }
});

export default router;

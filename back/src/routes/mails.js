import express from 'express';
import pool from '../config/database.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { enqueueNotification } from '../utils/notificationWorker.js';
import { getKstTodayRangeUtcForSql, getNowForDB } from '../utils/dateUtils.js';
import { isBlockedBy } from '../utils/userBlock.js';
import { ensurePersonalMailSchema } from '../db/ensurePersonalMailSchema.js';
import { registerPersonalMailSendRoutes } from './personalMailSend.js';
import { PERSONAL_MAIL_STATUS } from '../constants/personalMail.js';
import { submitContentReport } from '../services/reportSubmission.service.js';

const router = express.Router();

registerPersonalMailSendRoutes(router, authenticate);
let ensurePersonalMailRoomSoftDeleteColumnsPromise = null;

async function addColumnIfMissing(tableName, columnName, definitionSql) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName],
  );
  const exists = Number(rows[0]?.cnt ?? 0) > 0;
  if (!exists) {
    await pool.execute(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`,
    );
  }
}

async function ensurePersonalMailRoomSoftDeleteColumns() {
  if (!ensurePersonalMailRoomSoftDeleteColumnsPromise) {
    ensurePersonalMailRoomSoftDeleteColumnsPromise = (async () => {
      await addColumnIfMissing(
        'personal_mail_rooms',
        'is_deleted_by_user1',
        'BOOLEAN DEFAULT FALSE',
      );
      await addColumnIfMissing(
        'personal_mail_rooms',
        'is_deleted_by_user2',
        'BOOLEAN DEFAULT FALSE',
      );
    })().catch((error) => {
      ensurePersonalMailRoomSoftDeleteColumnsPromise = null;
      throw error;
    });
  }
  return ensurePersonalMailRoomSoftDeleteColumnsPromise;
}

// ==================== 개인 우편 API ====================

// 개인 우편 목록 조회 (받은 우편)
router.get('/personal/received', authenticate, async (req, res) => {
  try {
    await ensurePersonalMailRoomSoftDeleteColumns();
    const userId = req.user.userId;
    const { page = 1, limit = 20, isRead } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    // 받은 우편 조회 (pm. 한정으로 is_deleted 모호함 제거)
    const [mails] = await pool.execute(
      `SELECT 
        pm.id,
        pm.sender_id,
        pm.recipient_id,
        pm.content,
        pm.status,
        pm.is_match_failed,
        pm.returned_at,
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
        pm.sent_at,
        u.name_enc as sender_name_enc,
        u.color_id as sender_color_id,
        (pm.parent_mail_id IS NOT NULL AND par.sender_id = ?) AS reply_to_my_sent
      FROM personal_mails pm
      INNER JOIN personal_mail_rooms pmr ON pm.room_id = pmr.id
      LEFT JOIN users u ON pm.sender_id = u.id
      LEFT JOIN personal_mails par ON par.id = pm.parent_mail_id AND par.is_deleted = FALSE
      LEFT JOIN personal_mails root_pm ON root_pm.id = COALESCE(pm.root_mail_id, pm.id) AND root_pm.is_deleted = FALSE
      WHERE pm.recipient_id = ? AND pm.is_deleted = FALSE
        AND pm.status != ?
        AND (pm.is_shadow_blocked = FALSE OR pm.shadow_blocked_for_user_id IS NULL OR pm.shadow_blocked_for_user_id != ?)
        AND (
          (pmr.user1_id = ? AND (pmr.is_deleted_by_user1 IS NULL OR pmr.is_deleted_by_user1 = FALSE))
          OR
          (pmr.user2_id = ? AND (pmr.is_deleted_by_user2 IS NULL OR pmr.is_deleted_by_user2 = FALSE))
        )${isRead !== undefined ? " AND pm.status = ?" : ''}
      ORDER BY pm.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}`,
      (() => {
        const base = [
          userId,
          userId,
          userId,
          PERSONAL_MAIL_STATUS.RETURNED,
          userId,
          userId,
          userId,
        ];
        return isRead !== undefined
          ? [
              ...base,
              isRead === 'true'
                ? PERSONAL_MAIL_STATUS.READ
                : PERSONAL_MAIL_STATUS.SENT,
            ]
          : base;
      })()
    );

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM personal_mails pm
       INNER JOIN personal_mail_rooms pmr ON pm.room_id = pmr.id
       WHERE pm.recipient_id = ? AND pm.is_deleted = FALSE
         AND pm.status != ?
         AND (pm.is_shadow_blocked = FALSE OR pm.shadow_blocked_for_user_id IS NULL OR pm.shadow_blocked_for_user_id != ?)
         AND (
           (pmr.user1_id = ? AND (pmr.is_deleted_by_user1 IS NULL OR pmr.is_deleted_by_user1 = FALSE))
           OR
           (pmr.user2_id = ? AND (pmr.is_deleted_by_user2 IS NULL OR pmr.is_deleted_by_user2 = FALSE))
         )${isRead !== undefined ? ' AND pm.status = ?' : ''}`,
      (() => {
        const base = [
          userId,
          PERSONAL_MAIL_STATUS.RETURNED,
          userId,
          userId,
          userId,
        ];
        return isRead !== undefined
          ? [
              ...base,
              isRead === 'true'
                ? PERSONAL_MAIL_STATUS.READ
                : PERSONAL_MAIL_STATUS.SENT,
            ]
          : base;
      })()
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
    await ensurePersonalMailRoomSoftDeleteColumns();
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    // 보낸 우편 조회 (매칭 실패·반송 포함)
    const [mails] = await pool.execute(
      `SELECT 
        pm.id,
        pm.sender_id,
        pm.recipient_id,
        pm.content,
        pm.status,
        pm.is_match_failed,
        pm.returned_at,
        pm.recipient_school_id,
        pm.recipient_grade,
        pm.recipient_class_num,
        pm.recipient_name_enc AS recipient_snapshot_name_enc,
        pm.recipient_user_id,
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
        pm.sent_at,
        u.name_enc as recipient_name_enc,
        u.color_id as recipient_color_id
      FROM personal_mails pm
      LEFT JOIN personal_mail_rooms pmr ON pm.room_id = pmr.id
      LEFT JOIN users u ON pm.recipient_id = u.id
      LEFT JOIN personal_mails root_pm ON root_pm.id = COALESCE(pm.root_mail_id, pm.id) AND root_pm.is_deleted = FALSE
      WHERE pm.sender_id = ? AND pm.is_deleted = FALSE
        AND pm.parent_mail_id IS NULL
        AND (
          pm.room_id IS NULL
          OR (
            (pmr.user1_id = ? AND (pmr.is_deleted_by_user1 IS NULL OR pmr.is_deleted_by_user1 = FALSE))
            OR
            (pmr.user2_id = ? AND (pmr.is_deleted_by_user2 IS NULL OR pmr.is_deleted_by_user2 = FALSE))
          )
        )
      ORDER BY COALESCE(pm.sent_at, pm.created_at) DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [userId, userId, userId, userId]
    );

    // 전체 개수 조회
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM personal_mails pm
       LEFT JOIN personal_mail_rooms pmr ON pm.room_id = pmr.id
       WHERE pm.sender_id = ? AND pm.is_deleted = FALSE
         AND pm.parent_mail_id IS NULL
         AND (
           pm.room_id IS NULL
           OR (
             (pmr.user1_id = ? AND (pmr.is_deleted_by_user1 IS NULL OR pmr.is_deleted_by_user1 = FALSE))
             OR
             (pmr.user2_id = ? AND (pmr.is_deleted_by_user2 IS NULL OR pmr.is_deleted_by_user2 = FALSE))
           )
         )`,
      [userId, userId, userId]
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

// 개인 우편 룸 삭제 (내 목록에서 숨김 처리)
router.delete('/personal/rooms/:roomId', authenticate, async (req, res) => {
  try {
    await ensurePersonalMailRoomSoftDeleteColumns();
    const userId = req.user.userId;
    const roomId = Number(req.params.roomId);

    if (!Number.isFinite(roomId)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 룸 ID입니다.',
      });
    }

    const [rooms] = await pool.execute(
      `SELECT id FROM personal_mail_rooms
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [roomId, userId, userId]
    );
    if (rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: '우편 룸을 찾을 수 없거나 삭제 권한이 없습니다.',
      });
    }

    await pool.execute(
      `UPDATE personal_mail_rooms
       SET is_deleted_by_user1 = IF(user1_id = ?, TRUE, is_deleted_by_user1),
           is_deleted_by_user2 = IF(user2_id = ?, TRUE, is_deleted_by_user2)
       WHERE id = ?`,
      [userId, userId, roomId]
    );

    res.json({
      success: true,
      message: '우편 대화가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('개인 우편 룸 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '우편 대화 삭제 중 오류가 발생했습니다.',
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
       WHERE id = ? AND is_deleted = FALSE
         AND (is_shadow_blocked = FALSE OR shadow_blocked_for_user_id IS NULL OR shadow_blocked_for_user_id != ?)`,
      [mailId, userId]
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
         AND (pm.is_shadow_blocked = FALSE OR pm.shadow_blocked_for_user_id IS NULL OR pm.shadow_blocked_for_user_id != ?)
         AND (pm.sender_id = ? OR pm.recipient_id = ?)`,
      [threadRootId, threadRootId, userId, userId, userId]
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
        s.name_enc as sender_name_enc,
        pm.recipient_id,
        r.name_enc as recipient_name_enc,
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
         AND (pm.is_shadow_blocked = FALSE OR pm.shadow_blocked_for_user_id IS NULL OR pm.shadow_blocked_for_user_id != ?)
       ORDER BY pm.created_at ASC`,
      [userId, threadRootId, threadRootId, userId]
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
        pm.status,
        pm.is_match_failed,
        pm.returned_at,
        pm.is_deleted,
        pm.parent_mail_id,
        pm.root_mail_id,
        root_pm.sender_id AS root_sender_id,
        (root_pm.sender_id = ?) AS is_root_author_for_current_user,
        pm.created_at,
        pm.sent_at,
        u1.name_enc as sender_name_enc,
        u1.color_id as sender_color_id,
        u2.name_enc as recipient_name_enc,
        u2.color_id as recipient_color_id,
        (pm.parent_mail_id IS NOT NULL AND par.sender_id = ?) AS reply_to_my_sent
      FROM personal_mails pm
      LEFT JOIN users u1 ON pm.sender_id = u1.id
      LEFT JOIN users u2 ON pm.recipient_id = u2.id
      LEFT JOIN personal_mails par ON par.id = pm.parent_mail_id AND par.is_deleted = FALSE
      LEFT JOIN personal_mails root_pm ON root_pm.id = COALESCE(pm.root_mail_id, pm.id) AND root_pm.is_deleted = FALSE
      WHERE pm.id = ? 
        AND (pm.sender_id = ? OR pm.recipient_id = ?)
        AND pm.is_deleted = FALSE
        AND (pm.is_shadow_blocked = FALSE OR pm.shadow_blocked_for_user_id IS NULL OR pm.shadow_blocked_for_user_id != ?)`,
      [userId, userId, mailId, userId, userId, userId]
    );

    if (mails.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '우편을 찾을 수 없거나 접근 권한이 없습니다.' 
      });
    }

    const mail = mails[0];

    // 받은 우편인 경우 읽음 처리
    if (
      mail.recipient_id === userId &&
      mail.status === PERSONAL_MAIL_STATUS.SENT
    ) {
      await pool.execute(
        'UPDATE personal_mails SET status = ? WHERE id = ?',
        [PERSONAL_MAIL_STATUS.READ, mailId]
      );
      mail.status = PERSONAL_MAIL_STATUS.READ;
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
        AND (is_shadow_blocked = FALSE OR shadow_blocked_for_user_id IS NULL OR shadow_blocked_for_user_id != ?)
       ORDER BY created_at ASC`,
      [mailId, userId]
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
    await ensurePersonalMailRoomSoftDeleteColumns();
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
      const isShadowBlocked = await isBlockedBy({
        blockerUserId: Number(recipientId),
        targetUserId: userId,
      });
      // 루트 우편 생성 (room_id는 생성 후 업데이트)
      const now = getNowForDB();
      [result] = await connection.execute(
        `INSERT INTO personal_mails (
          sender_id, recipient_id, content, status, sent_at, root_mail_id, created_at,
          is_shadow_blocked, shadow_blocked_for_user_id
        )
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
        [
          userId,
          recipientId,
          content.trim(),
          PERSONAL_MAIL_STATUS.SENT,
          now,
          now,
          isShadowBlocked,
          isShadowBlocked ? Number(recipientId) : null,
        ]
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
      await connection.execute(
        `UPDATE personal_mail_rooms
         SET is_deleted_by_user1 = IF(user2_id = ?, FALSE, is_deleted_by_user1),
             is_deleted_by_user2 = IF(user1_id = ?, FALSE, is_deleted_by_user2)
         WHERE id = ?`,
        [userId, userId, roomId]
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
        pm.status,
        pm.is_deleted,
        pm.room_id,
        pm.created_at,
        pm.sent_at,
        u.name_enc as recipient_name_enc,
        u.color_id as recipient_color_id
      FROM personal_mails pm
      LEFT JOIN users u ON pm.recipient_id = u.id
      WHERE pm.id = ?`,
      [result.insertId]
    );

    // 수신자에게 알림 생성 (비동기 큐 + 소켓 emit)
    const blockedForReceiver = await isBlockedBy({
      blockerUserId: Number(recipientId),
      targetUserId: userId,
    });
    if (!blockedForReceiver) {
      await enqueueNotification({
        userId: Number(recipientId),
        type: 'mail',
        category: 'mail',
        title: '우편함',
        body: '새로운 우편이 도착했습니다',
        relatedType: 'personal_mail',
        relatedId: result.insertId,
      });
    }

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
    await ensurePersonalMailRoomSoftDeleteColumns();
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

    const isShadowBlocked = await isBlockedBy({
      blockerUserId: Number(recipientId),
      targetUserId: userId,
    });
    // 답장 우편 생성
    const now = getNowForDB();
    const [result] = await connection.execute(
      `INSERT INTO personal_mails (
        sender_id, recipient_id, content, status, sent_at,
        parent_mail_id, root_mail_id, room_id, created_at,
        is_shadow_blocked, shadow_blocked_for_user_id
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        recipientId,
        content.trim(),
        PERSONAL_MAIL_STATUS.SENT,
        now,
        Number(mailId),
        rootMailId,
        Number(room.id),
        now,
        isShadowBlocked,
        isShadowBlocked ? Number(recipientId) : null,
      ]
    );

    await connection.execute(
      `UPDATE personal_mail_rooms
       SET last_mail_id = ?, last_mail_at = ?,
           is_deleted_by_user1 = IF(user2_id = ?, FALSE, is_deleted_by_user1),
           is_deleted_by_user2 = IF(user1_id = ?, FALSE, is_deleted_by_user2)
       WHERE id = ?`,
      [Number(result.insertId), getNowForDB(), userId, userId, Number(room.id)]
    );

    // 생성된 답장 정보 조회
    const [replyMails] = await connection.execute(
      `SELECT 
        pm.id,
        pm.sender_id,
        pm.recipient_id,
        pm.content,
        pm.status,
        pm.is_deleted,
        pm.parent_mail_id,
        pm.root_mail_id,
        pm.room_id,
        pm.created_at,
        pm.sent_at,
        u.name_enc as recipient_name_enc,
        u.color_id as recipient_color_id
      FROM personal_mails pm
      LEFT JOIN users u ON pm.recipient_id = u.id
      WHERE pm.id = ?`,
      [result.insertId]
    );

    await connection.commit();

    // 원본 발신자(=이번 답장 수신자)에게 알림 생성 (비동기 큐 + 소켓 emit)
    if (!isShadowBlocked) {
      const [senderRows] = await pool.execute(
        'SELECT name FROM users WHERE id = ?',
        [userId],
      );
      const replySenderName =
        String(senderRows[0]?.name ?? '').trim() || '상대방';
      await enqueueNotification({
        userId: Number(recipientId),
        type: 'mail',
        category: 'mail',
        title: '우편함',
        body: `${replySenderName} 님이 우편 답장을 보냈습니다`,
        relatedType: 'personal_mail',
        relatedId: result.insertId,
      });
    }

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
      'UPDATE personal_mails SET status = ? WHERE id = ?',
      [PERSONAL_MAIL_STATUS.READ, mailId]
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
       WHERE recipient_id = ?
         AND status = ?
         AND is_deleted = FALSE
         AND (is_shadow_blocked = FALSE OR shadow_blocked_for_user_id IS NULL OR shadow_blocked_for_user_id != ?)`,
      [userId, PERSONAL_MAIL_STATUS.SENT, userId]
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

// 댓글 삭제 — /school/:mailId 보다 먼저 등록 (경로 충돌 방지)
router.delete('/school/comments/:commentId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const commentId = Number(req.params.commentId);

    const [rows] = await pool.execute(
      `SELECT smc.id, smc.mail_id, smc.user_id
       FROM school_mail_comments smc
       INNER JOIN school_mails sm ON sm.id = smc.mail_id
       WHERE smc.id = ? AND smc.is_deleted = FALSE AND sm.is_deleted = FALSE`,
      [commentId],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: '댓글을 찾을 수 없습니다.',
      });
    }

    if (Number(rows[0].user_id) !== Number(userId)) {
      return res.status(403).json({
        success: false,
        message: '삭제 권한이 없습니다.',
      });
    }

    const mailId = rows[0].mail_id;
    await pool.execute(
      'UPDATE school_mail_comments SET is_deleted = TRUE WHERE id = ?',
      [commentId],
    );
    await pool.execute(
      `UPDATE school_mails
       SET comment_count = (
         SELECT COUNT(*) FROM school_mail_comments
         WHERE mail_id = ? AND is_deleted = FALSE
       )
       WHERE id = ?`,
      [mailId, mailId],
    );

    return res.json({
      success: true,
      message: '댓글이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('학교 우편 댓글 삭제 오류:', error);
    return res.status(500).json({
      success: false,
      message: '댓글 삭제 중 오류가 발생했습니다.',
    });
  }
});

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
        u.name_enc as author_name_enc,
        COALESCE(sm.author_school_id, u.school_id) as author_school_id,
        u.school_id AS author_current_school_id,
        u.color_id as author_color_id,
        (SELECT s2.name FROM schools s2 WHERE s2.school_id = COALESCE(sm.author_school_id, u.school_id)) AS author_school_name,
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

// 학교 우편 — 내가 쓴 글 (상세 :mailId 보다 먼저)
router.get('/school/my', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 20));
    const offsetNum = (page - 1) * limitNum;

    const [mails] = await pool.execute(
      `SELECT
        sm.id,
        sm.school_id,
        sm.user_id,
        sm.content,
        sm.comment_count,
        sm.like_count,
        sm.created_at,
        s.name AS school_name
      FROM school_mails sm
      LEFT JOIN schools s ON sm.school_id = s.school_id
      WHERE sm.user_id = ? AND sm.is_deleted = FALSE
      ORDER BY sm.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [userId],
    );

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) AS total FROM school_mails WHERE user_id = ? AND is_deleted = FALSE`,
      [userId],
    );
    const total = Number(countResult[0]?.total ?? 0);

    return res.json({
      success: true,
      data: {
        mails,
        pagination: {
          page,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error('내 학교 우편 목록 오류:', error);
    return res.status(500).json({
      success: false,
      message: '내 학교 우편 목록 조회 중 오류가 발생했습니다.',
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
        u.name_enc as author_name_enc,
        COALESCE(sm.author_school_id, u.school_id) as author_school_id,
        u.school_id AS author_current_school_id,
        u.color_id as author_color_id,
        (SELECT s2.name FROM schools s2 WHERE s2.school_id = COALESCE(sm.author_school_id, u.school_id)) AS author_school_name,
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

// 학교 우편 신고
router.post('/school/:mailId/report', authenticate, async (req, res) => {
  try {
    const reporterId = req.user.userId;
    const { mailId } = req.params;
    const { reason, description } = req.body;

    const result = await submitContentReport({
      reporterId,
      targetType: 'school_mail',
      targetId: mailId,
      reason,
      description,
      options: {
        targetExistsCheck: {
          notFoundMessage: '학교 우편을 찾을 수 없습니다.',
          check: async (db) => {
            const [rows] = await db.execute(
              'SELECT id FROM school_mails WHERE id = ? AND is_deleted = FALSE',
              [mailId],
            );
            return rows.length > 0;
          },
        },
      },
    });

    return res.status(result.httpStatus).json(result.body);
  } catch (error) {
    console.error('학교 우편 신고 오류:', error);
    res.status(500).json({
      success: false,
      message: '신고 처리 중 오류가 발생했습니다.',
    });
  }
});

// 학교 우편 댓글 신고
router.post('/school/comments/:commentId/report', authenticate, async (req, res) => {
  try {
    const reporterId = req.user.userId;
    const { commentId } = req.params;
    const { reason, description } = req.body;

    const result = await submitContentReport({
      reporterId,
      targetType: 'school_mail_comment',
      targetId: commentId,
      reason,
      description,
      options: {
        targetExistsCheck: {
          notFoundMessage: '댓글을 찾을 수 없습니다.',
          check: async (db) => {
            const [rows] = await db.execute(
              'SELECT id FROM school_mail_comments WHERE id = ? AND is_deleted = FALSE',
              [commentId],
            );
            return rows.length > 0;
          },
        },
      },
    });

    return res.status(result.httpStatus).json(result.body);
  } catch (error) {
    console.error('학교 우편 댓글 신고 오류:', error);
    res.status(500).json({
      success: false,
      message: '신고 처리 중 오류가 발생했습니다.',
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

    const authorSchoolId = users[0].school_id;

    // 학교 우편 생성
    const [result] = await pool.execute(
      `INSERT INTO school_mails (school_id, user_id, author_school_id, content, created_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [schoolId, userId, authorSchoolId, content.trim(), getNowForDB()]
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
        u.name_enc as author_name_enc,
        COALESCE(sm.author_school_id, u.school_id) as author_school_id,
        u.school_id AS author_current_school_id,
        u.color_id as author_color_id,
        (SELECT s2.name FROM schools s2 WHERE s2.school_id = COALESCE(sm.author_school_id, u.school_id)) AS author_school_name,
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

    // 삭제 처리 (소프트 삭제 + 연관 댓글)
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        'UPDATE school_mails SET is_deleted = TRUE WHERE id = ?',
        [mailId],
      );
      await connection.execute(
        'UPDATE school_mail_comments SET is_deleted = TRUE WHERE mail_id = ? AND is_deleted = FALSE',
        [mailId],
      );
      await connection.execute(
        'UPDATE school_mails SET comment_count = 0 WHERE id = ?',
        [mailId],
      );
      await connection.commit();
    } catch (txErr) {
      await connection.rollback();
      throw txErr;
    } finally {
      connection.release();
    }

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

// 학교 우편 댓글 고정 (우편 작성자만) — /school/:mailId 보다 먼저
router.patch(
  '/school/:mailId/comments/:commentId/pin',
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const mailId = Number(req.params.mailId);
      const commentId = Number(req.params.commentId);
      const pin = req.body?.pin !== false;

      const [mails] = await pool.execute(
        'SELECT id, user_id FROM school_mails WHERE id = ? AND is_deleted = FALSE',
        [mailId],
      );
      if (!mails.length) {
        return res.status(404).json({
          success: false,
          message: '학교 우편을 찾을 수 없습니다.',
        });
      }
      if (Number(mails[0].user_id) !== Number(userId)) {
        return res.status(403).json({
          success: false,
          message: '우편 작성자만 댓글을 고정할 수 있습니다.',
        });
      }

      const [comments] = await pool.execute(
        `SELECT id FROM school_mail_comments
         WHERE id = ? AND mail_id = ? AND is_deleted = FALSE`,
        [commentId, mailId],
      );
      if (!comments.length) {
        return res.status(404).json({
          success: false,
          message: '댓글을 찾을 수 없습니다.',
        });
      }

      if (pin) {
        await pool.execute(
          `UPDATE school_mail_comments
           SET is_pinned = FALSE, pinned_at = NULL
           WHERE mail_id = ? AND is_deleted = FALSE`,
          [mailId],
        );
        await pool.execute(
          `UPDATE school_mail_comments
           SET is_pinned = TRUE, pinned_at = NOW()
           WHERE id = ?`,
          [commentId],
        );
      } else {
        await pool.execute(
          `UPDATE school_mail_comments
           SET is_pinned = FALSE, pinned_at = NULL
           WHERE id = ? AND mail_id = ?`,
          [commentId, mailId],
        );
      }

      return res.json({
        success: true,
        message: pin ? '댓글이 고정되었습니다.' : '댓글 고정이 해제되었습니다.',
        data: { mailId, commentId, isPinned: pin },
      });
    } catch (error) {
      console.error('학교 우편 댓글 고정 오류:', error);
      return res.status(500).json({
        success: false,
        message: '댓글 고정 처리 중 오류가 발생했습니다.',
      });
    }
  },
);

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
        smc.is_pinned,
        smc.pinned_at,
        smc.created_at,
        COALESCE(smc.author_school_id, u.school_id) AS author_school_id,
        u.school_id AS author_current_school_id,
        (SELECT s.name FROM schools s WHERE s.school_id = COALESCE(smc.author_school_id, u.school_id)) AS author_school_name,
        (SELECT COUNT(*) FROM school_mail_comment_likes smcl WHERE smcl.comment_id = smc.id AND smcl.user_id = ?) AS is_liked
      FROM school_mail_comments smc
      LEFT JOIN users u ON smc.user_id = u.id
      WHERE smc.mail_id = ? AND smc.is_deleted = FALSE
      ORDER BY smc.is_pinned DESC, smc.created_at ASC`,
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

    const [authorRows] = await pool.execute(
      'SELECT school_id FROM users WHERE id = ? LIMIT 1',
      [userId],
    );
    const authorSchoolId = authorRows[0]?.school_id || null;

    const [result] = await pool.execute(
      `INSERT INTO school_mail_comments (mail_id, user_id, parent_id, author_school_id, content, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [mailId, userId, parentIdVal, authorSchoolId, String(content).trim(), getNowForDB()]
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
        COALESCE(smc.author_school_id, u.school_id) AS author_school_id,
        u.school_id AS author_current_school_id,
        (SELECT s.name FROM schools s WHERE s.school_id = COALESCE(smc.author_school_id, u.school_id)) AS author_school_name
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

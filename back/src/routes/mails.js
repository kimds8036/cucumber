import express from 'express';
import pool from '../config/database.js';
import { authenticate, optionalAuthenticate, requireStudentVerified } from '../middleware/auth.js';
import { enqueueNotification } from '../utils/notificationWorker.js';
import { getKstTodayRangeUtcForSql, getNowForDB } from '../utils/dateUtils.js';
import { isBlockedBy } from '../utils/userBlock.js';
import { ensurePersonalMailSchema } from '../db/ensurePersonalMailSchema.js';
import { registerPersonalMailSendRoutes } from './personalMailSend.js';
import { PERSONAL_MAIL_STATUS } from '../constants/personalMail.js';
import { submitContentReport } from '../services/reportSubmission.service.js';

const router = express.Router();

registerPersonalMailSendRoutes(router, authenticate, requireStudentVerified);
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

// ==================== 개인 ?�편 API ====================

// 개인 ?�편 목록 조회 (받�? ?�편)
router.get('/personal/received', authenticate, requireStudentVerified, async (req, res) => {
  try {
    await ensurePersonalMailRoomSoftDeleteColumns();
    const userId = req.user.userId;
    const { page = 1, limit = 20, isRead } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    // 받�? ?�편 조회 (pm. ?�정?�로 is_deleted 모호???�거)
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
    console.error('받�? ?�편 목록 조회 ?�류:', error);
    res.status(500).json({ 
      success: false, 
      message: '받�? ?�편 목록 조회 �??�류가 발생?�습?�다.' 
    });
  }
});

// 개인 ?�편 목록 조회 (보낸 ?�편)
router.get('/personal/sent', authenticate, requireStudentVerified, async (req, res) => {
  try {
    await ensurePersonalMailRoomSoftDeleteColumns();
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    // 보낸 ?�편 조회 (매칭 ?�패·반송 ?�함)
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

    // ?�체 개수 조회
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
    console.error('보낸 ?�편 목록 조회 ?�류:', error);
    res.status(500).json({ 
      success: false, 
      message: '보낸 ?�편 목록 조회 �??�류가 발생?�습?�다.' 
    });
  }
});

// 개인 ?�편 �???�� (??목록?�서 ?��? 처리)
router.delete('/personal/rooms/:roomId', authenticate, requireStudentVerified, async (req, res) => {
  try {
    await ensurePersonalMailRoomSoftDeleteColumns();
    const userId = req.user.userId;
    const roomId = Number(req.params.roomId);

    if (!Number.isFinite(roomId)) {
      return res.status(400).json({
        success: false,
        message: '?�효?��? ?��? �?ID?�니??',
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
        message: '?�편 룸을 찾을 ???�거????�� 권한???�습?�다.',
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
      message: '?�편 ?�?��? ??��?�었?�니??',
    });
  } catch (error) {
    console.error('개인 ?�편 �???�� ?�류:', error);
    res.status(500).json({
      success: false,
      message: '?�편 ?�????�� �??�류가 발생?�습?�다.',
    });
  }
});

// 개인 ?�편 ?�레???�체 조회
router.get('/personal/:mailId/thread', authenticate, requireStudentVerified, async (req, res) => {
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
        message: '?�편??찾을 ???�습?�다.',
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
        message: '?�당 ?�레?�에 ?�근??권한???�습?�다.',
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
    console.error('개인 ?�편 ?�레??조회 ?�류:', error);
    res.status(500).json({
      success: false,
      message: '개인 ?�편 ?�레??조회 �??�류가 발생?�습?�다.',
    });
  }
});

// 개인 ?�편 ?�세 조회
router.get('/personal/:mailId', authenticate, requireStudentVerified, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mailId } = req.params;

    // ?�편 조회 (받�? ?�편 ?�는 보낸 ?�편)
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
        message: '?�편??찾을 ???�거???�근 권한???�습?�다.' 
      });
    }

    const mail = mails[0];

    // 받�? ?�편??경우 ?�음 처리
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
    console.error('개인 ?�편 ?�세 조회 ?�류:', error);
    res.status(500).json({ 
      success: false, 
      message: '개인 ?�편 ?�세 조회 �??�류가 발생?�습?�다.' 
    });
  }
});

// 개인 ?�편 ?�성
router.post('/personal', authenticate, requireStudentVerified, async (req, res) => {
  try {
    await ensurePersonalMailRoomSoftDeleteColumns();
    const userId = req.user.userId;
    const { recipientId, content } = req.body;

    if (!recipientId || !content) {
      return res.status(400).json({ 
        success: false, 
        message: '?�신??ID?� ?�용???�력?�주?�요.' 
      });
    }

    if (userId === parseInt(recipientId)) {
      return res.status(400).json({ 
        success: false, 
        message: '?�기 ?�신?�게???�편??보낼 ???�습?�다.' 
      });
    }

    // ?�신??존재 ?�인
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND is_deleted = FALSE',
      [recipientId]
    );
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '?�신?��? 찾을 ???�습?�다.' 
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
      // 루트 ?�편 ?�성 (room_id???�성 ???�데?�트)
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

    // ?�성???�편 ?�보 조회
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

    // ?�신?�에�??�림 ?�성 (비동�???+ ?�켓 emit)
    const blockedForReceiver = await isBlockedBy({
      blockerUserId: Number(recipientId),
      targetUserId: userId,
    });
    if (!blockedForReceiver) {
      await enqueueNotification({
        userId: Number(recipientId),
        type: 'mail',
        category: 'mail',
        title: '?�편??,
        body: '?�로???�편???�착?�습?�다',
        relatedType: 'personal_mail',
        relatedId: result.insertId,
        sourceId: `personal_mail:${result.insertId}`,
      });
    }

    res.status(201).json({
      success: true,
      message: '?�편???�송?�었?�니??',
      data: newMails[0]
    });
  } catch (error) {
    console.error('개인 ?�편 ?�성 ?�류:', error);
    res.status(500).json({ 
      success: false, 
      message: '?�편 ?�성 �??�류가 발생?�습?�다.' 
    });
  }
});

// 개인 ?�편 ?�장
router.post('/personal/:mailId/reply', authenticate, requireStudentVerified, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await ensurePersonalMailRoomSoftDeleteColumns();
    const userId = req.user.userId;
    const { mailId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ 
        success: false, 
        message: '?�장 ?�용???�력?�주?�요.' 
      });
    }

    await connection.beginTransaction();

    // ?�본 ?�편 조회 (받�? ?�편?��? ?�인) + ?�금
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
        message: '?�장???�편??찾을 ???�거??권한???�습?�다.' 
      });
    }

    const originalMail = mails[0];
    const recipientId = originalMail.sender_id; // ?�본 발신?�에�??�장
    const rootMailId = originalMail.root_mail_id == null ? Number(mailId) : Number(originalMail.root_mail_id);

    // 루트 ?�편 무결??검�? 루트??parent_mail_id 가 ?�어???�다.
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
        message: '?�레??구조가 ?�바르�? ?�아 ?�장??보낼 ???�습?�다.',
      });
    }

    // ?�레???�용?�쌍 ?��???검�? 같�? root ?�래 모든 메일?� ?�일 2???�이?�야 ?�다.
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
        message: '?�레??참여???�보가 ?�치?��? ?�아 ?�장??보낼 ???�습?�다.',
      });
    }

    // �?조회/검�?
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
        message: '메일 �??�보가 ?�어 ?�장??보낼 ???�습?�다.',
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
        message: '메일 �?참여???�보가 ?�치?��? ?�습?�다.',
      });
    }

    const isShadowBlocked = await isBlockedBy({
      blockerUserId: Number(recipientId),
      targetUserId: userId,
    });
    // ?�장 ?�편 ?�성
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

    // ?�성???�장 ?�보 조회
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

    // ?�본 발신??=?�번 ?�장 ?�신???�게 ?�림 ?�성 (비동�???+ ?�켓 emit)
    if (!isShadowBlocked) {
      const [senderRows] = await pool.execute(
        'SELECT name FROM users WHERE id = ?',
        [userId],
      );
      const replySenderName =
        String(senderRows[0]?.name ?? '').trim() || '?��?�?;
      await enqueueNotification({
        userId: Number(recipientId),
        type: 'mail',
        category: 'mail',
        title: '?�편??,
        body: `${replySenderName} ?�이 ?�편 ?�장??보냈?�니??,
        relatedType: 'personal_mail',
        relatedId: result.insertId,
        sourceId: `personal_mail:${result.insertId}`,
      });
    }

    res.status(201).json({
      success: true,
      message: '?�장???�송?�었?�니??',
      data: replyMails[0]
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_) {
      // no-op
    }
    console.error('개인 ?�편 ?�장 ?�류:', error);
    res.status(500).json({ 
      success: false, 
      message: '?�장 ?�송 �??�류가 발생?�습?�다.' 
    });
  } finally {
    connection.release();
  }
});

// 개인 ?�편 ?�음 처리
const markPersonalMailAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mailId } = req.params;

    // ?�편 존재 �?권한 ?�인 (받�? ?�편�??�음 처리 가??
    const [mails] = await pool.execute(
      `SELECT id FROM personal_mails 
       WHERE id = ? AND recipient_id = ? AND is_deleted = FALSE`,
      [mailId, userId]
    );

    if (mails.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '?�편??찾을 ???�거???�음 처리??권한???�습?�다.' 
      });
    }

    // ?�음 처리
    await pool.execute(
      'UPDATE personal_mails SET status = ? WHERE id = ?',
      [PERSONAL_MAIL_STATUS.READ, mailId]
    );

    res.json({
      success: true,
      message: '?�편???�음 처리?�었?�니??'
    });
  } catch (error) {
    console.error('개인 ?�편 ?�음 처리 ?�류:', error);
    res.status(500).json({ 
      success: false, 
      message: '?�음 처리 �??�류가 발생?�습?�다.' 
    });
  }
};

router.put('/personal/:mailId/read', authenticate, requireStudentVerified, markPersonalMailAsRead);
router.patch('/personal/:mailId/read', authenticate, requireStudentVerified, markPersonalMailAsRead);

// 개인 ?�편 ??��
router.delete('/personal/:mailId', authenticate, requireStudentVerified, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mailId } = req.params;

    // ?�편 존재 �?권한 ?�인
    const [mails] = await pool.execute(
      `SELECT id FROM personal_mails 
       WHERE id = ? AND (sender_id = ? OR recipient_id = ?) AND is_deleted = FALSE`,
      [mailId, userId, userId]
    );

    if (mails.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '?�편??찾을 ???�거????��??권한???�습?�다.' 
      });
    }

    // ??�� 처리 (?�프????��)
    await pool.execute(
      'UPDATE personal_mails SET is_deleted = TRUE WHERE id = ?',
      [mailId]
    );

    res.json({
      success: true,
      message: '?�편????��?�었?�니??'
    });
  } catch (error) {
    console.error('개인 ?�편 ??�� ?�류:', error);
    res.status(500).json({ 
      success: false, 
      message: '?�편 ??�� �??�류가 발생?�습?�다.' 
    });
  }
});

// ?��? ?��? 개인 ?�편 ??조회
router.get('/personal/unread-count', authenticate, requireStudentVerified, async (req, res) => {
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
    console.error('?��? ?��? 개인 ?�편 ??조회 ?�류:', error);
    res.status(500).json({ 
      success: false, 
      message: '?��? ?��? ?�편 ??조회 �??�류가 발생?�습?�다.' 
    });
  }
});

// ==================== ?�교 ?�편 API ====================

// ?��? ??�� ??/school/:mailId 보다 먼�? ?�록 (경로 충돌 방�?)
router.delete('/school/comments/:commentId', authenticate, requireStudentVerified, async (req, res) => {
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
        message: '?��???찾을 ???�습?�다.',
      });
    }

    if (Number(rows[0].user_id) !== Number(userId)) {
      return res.status(403).json({
        success: false,
        message: '??�� 권한???�습?�다.',
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
      message: '?��?????��?�었?�니??',
    });
  } catch (error) {
    console.error('?�교 ?�편 ?��? ??�� ?�류:', error);
    return res.status(500).json({
      success: false,
      message: '?��? ??�� �??�류가 발생?�습?�다.',
    });
  }
});

// ?�교 ?�편 목록 조회
router.get('/school', authenticate, requireStudentVerified, async (req, res) => {
  try {
    const { schoolId, page = 1, limit = 20 } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    if (!schoolId) {
      return res.status(400).json({ 
        success: false, 
        message: '?�교 ID�??�력?�주?�요.' 
      });
    }

    // ?�교 ?�편 조회
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

    // ?�체 개수 조회
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
    console.error('?�교 ?�편 목록 조회 ?�류:', error);
    res.status(500).json({ 
      success: false, 
      message: '?�교 ?�편 목록 조회 �??�류가 발생?�습?�다.' 
    });
  }
});

// ?�교 ?�편 ???��? ??글 (?�세 :mailId 보다 먼�?)
router.get('/school/my', authenticate, requireStudentVerified, async (req, res) => {
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
    console.error('???�교 ?�편 목록 ?�류:', error);
    return res.status(500).json({
      success: false,
      message: '???�교 ?�편 목록 조회 �??�류가 발생?�습?�다.',
    });
  }
});

// ?�교 ?�편 ?�세 조회 (비로그인 가????is_liked ??로그???�만)
router.get('/school/:mailId', authenticate, requireStudentVerified, async (req, res) => {
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
        message: '?�교 ?�편??찾을 ???�습?�다.' 
      });
    }

    const row = mails[0];
    row.is_liked = Number(row.is_liked) > 0;

    res.json({
      success: true,
      data: row
    });
  } catch (error) {
    console.error('?�교 ?�편 ?�세 조회 ?�류:', error);
    res.status(500).json({ 
      success: false, 
      message: '?�교 ?�편 ?�세 조회 �??�류가 발생?�습?�다.' 
    });
  }
});

// ?�교 ?�편 좋아???��?
router.post('/school/:mailId/like', authenticate, requireStudentVerified, async (req, res) => {
  const userId = req.user.userId;
  const { mailId } = req.params;
  const connection = await pool.getConnection();
  try {
    const [mrows] = await connection.execute(
      'SELECT id, like_count FROM school_mails WHERE id = ? AND is_deleted = FALSE',
      [mailId]
    );
    if (mrows.length === 0) {
      return res.status(404).json({ success: false, message: '?�교 ?�편??찾을 ???�습?�다.' });
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
    console.error('?�교 ?�편 좋아???�류:', error);
    res.status(500).json({ success: false, message: '좋아??처리 �??�류가 발생?�습?�다.' });
  } finally {
    connection.release();
  }
});

// ?�교 ?�편 ?��? 좋아???��?
router.post('/school/comments/:commentId/like', authenticate, requireStudentVerified, async (req, res) => {
  const userId = req.user.userId;
  const { commentId } = req.params;
  const connection = await pool.getConnection();
  try {
    const [crows] = await connection.execute(
      'SELECT id, like_count FROM school_mail_comments WHERE id = ? AND is_deleted = FALSE',
      [commentId]
    );
    if (crows.length === 0) {
      return res.status(404).json({ success: false, message: '?��???찾을 ???�습?�다.' });
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
    console.error('?�교 ?�편 ?��? 좋아???�류:', error);
    res.status(500).json({ success: false, message: '?��? 좋아??처리 �??�류가 발생?�습?�다.' });
  } finally {
    connection.release();
  }
});

// ?�교 ?�편 ?�고
router.post('/school/:mailId/report', authenticate, requireStudentVerified, async (req, res) => {
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
          notFoundMessage: '?�교 ?�편??찾을 ???�습?�다.',
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
    console.error('?�교 ?�편 ?�고 ?�류:', error);
    res.status(500).json({
      success: false,
      message: '?�고 처리 �??�류가 발생?�습?�다.',
    });
  }
});

// ?�교 ?�편 ?��? ?�고
router.post('/school/comments/:commentId/report', authenticate, requireStudentVerified, async (req, res) => {
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
          notFoundMessage: '?��???찾을 ???�습?�다.',
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
    console.error('?�교 ?�편 ?��? ?�고 ?�류:', error);
    res.status(500).json({
      success: false,
      message: '?�고 처리 �??�류가 발생?�습?�다.',
    });
  }
});

// ?�교 ?�편 ?�성
router.post('/school', authenticate, requireStudentVerified, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { schoolId, content } = req.body;

    if (!schoolId || !content) {
      return res.status(400).json({ 
        success: false, 
        message: '?�교 ID?� ?�용???�력?�주?�요.' 
      });
    }

    // ?�용???�보 ?�인
    const [users] = await pool.execute(
      'SELECT school_id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '?�용?��? 찾을 ???�습?�다.' 
      });
    }

    // ?�교 존재 ?�인
    const [schools] = await pool.execute(
      'SELECT school_id FROM schools WHERE school_id = ?',
      [schoolId]
    );

    if (schools.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '?�교�?찾을 ???�습?�다.' 
      });
    }

    const authorSchoolId = users[0].school_id;

    // ?�교 ?�편 ?�성
    const [result] = await pool.execute(
      `INSERT INTO school_mails (school_id, user_id, author_school_id, content, created_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [schoolId, userId, authorSchoolId, content.trim(), getNowForDB()]
    );

    // ?�성???�편 ?�보 조회
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
      message: '?�교 ?�편???�성?�었?�니??',
      data: newMails[0]
    });
  } catch (error) {
    console.error('?�교 ?�편 ?�성 ?�류:', error);
    res.status(500).json({ 
      success: false, 
      message: '?�교 ?�편 ?�성 �??�류가 발생?�습?�다.' 
    });
  }
});

// ?�교 ?�편 ??��
router.delete('/school/:mailId', authenticate, requireStudentVerified, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mailId } = req.params;

    // ?�편 존재 �??�성???�인
    const [mails] = await pool.execute(
      `SELECT id FROM school_mails 
       WHERE id = ? AND user_id = ? AND is_deleted = FALSE`,
      [mailId, userId]
    );

    if (mails.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '?�교 ?�편??찾을 ???�거????��??권한???�습?�다.' 
      });
    }

    // ??�� 처리 (?�프????�� + ?��? ?��?)
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
      message: '?�교 ?�편????��?�었?�니??'
    });
  } catch (error) {
    console.error('?�교 ?�편 ??�� ?�류:', error);
    res.status(500).json({ 
      success: false, 
      message: '?�교 ?�편 ??�� �??�류가 발생?�습?�다.' 
    });
  }
});

// ?�교 ?�편 ?��? 고정 (?�편 ?�성?�만) ??/school/:mailId 보다 먼�?
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
          message: '?�교 ?�편??찾을 ???�습?�다.',
        });
      }
      if (Number(mails[0].user_id) !== Number(userId)) {
        return res.status(403).json({
          success: false,
          message: '?�편 ?�성?�만 ?��???고정?????�습?�다.',
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
          message: '?��???찾을 ???�습?�다.',
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
        message: pin ? '?��???고정?�었?�니??' : '?��? 고정???�제?�었?�니??',
        data: { mailId, commentId, isPinned: pin },
      });
    } catch (error) {
      console.error('?�교 ?�편 ?��? 고정 ?�류:', error);
      return res.status(500).json({
        success: false,
        message: '?��? 고정 처리 �??�류가 발생?�습?�다.',
      });
    }
  },
);

// ?�교 ?�편 ?��? 목록 조회 (게시글보다 먼�? ?�록: /comments 가 :mailId????먹히?�록)
router.get('/school/:mailId/comments', authenticate, requireStudentVerified, async (req, res) => {
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
        message: '?�교 ?�편??찾을 ???�습?�다.',
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
    console.error('?�교 ?�편 ?��? 목록 조회 ?�류:', error);
    res.status(500).json({
      success: false,
      message: '?��? 목록 조회 �??�류가 발생?�습?�다.',
    });
  }
});

// ?�교 ?�편 ?��? ?�성
router.post('/school/:mailId/comments', authenticate, requireStudentVerified, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mailId } = req.params;
    const { content, parentId } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({
        success: false,
        message: '?��? ?�용???�력?�주?�요.',
      });
    }

    const [mails] = await pool.execute(
      'SELECT id, school_id FROM school_mails WHERE id = ? AND is_deleted = FALSE',
      [mailId]
    );
    if (mails.length === 0) {
      return res.status(404).json({
        success: false,
        message: '?�교 ?�편??찾을 ???�습?�다.',
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
          message: '부�??��???찾을 ???�습?�다.',
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
      message: '?��????�성?�었?�니??',
      data: created[0],
    });
  } catch (error) {
    console.error('?�교 ?�편 ?��? ?�성 ?�류:', error);
    res.status(500).json({
      success: false,
      message: '?��? ?�성 �??�류가 발생?�습?�다.',
    });
  }
});

export default router;

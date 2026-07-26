/**
 * DM (친구 간 다이렉트 메시지) — dm_rooms / dm_messages
 */
import express from 'express';
import { body, param } from 'express-validator';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getNowForDB } from '../utils/dateUtils.js';
import { uploadDm } from '../config/cloudinary.js';
import { emitNewMessage, emitReadReceipt, isUserInRoom } from '../socketServer.js';
import { enqueueNotification } from '../utils/notificationWorker.js';
import { isBlockedBy } from '../utils/userBlock.js';

const router = express.Router();

// 검증 체이너 — 권한/존재 확인은 핸들러가 본다.
const DM_MESSAGE_MAX = 2000;
const dmCreateRoomValidators = [
  body('otherUserId').exists({ checkNull: true }).withMessage('상대방 사용자 ID를 입력해주세요.')
    .bail().toInt().isInt({ min: 1 }).withMessage('유효하지 않은 사용자 ID입니다.'),
];
const dmSendMessageValidators = [
  param('roomId').toInt().isInt({ min: 1 }).withMessage('유효하지 않은 대화방 ID 입니다.'),
  body('content').optional({ values: 'falsy' }).isString().trim()
    .isLength({ max: DM_MESSAGE_MAX })
    .withMessage(`메시지는 ${DM_MESSAGE_MAX}자 이내여야 합니다.`),
  body('parent_message_id').optional({ values: 'falsy' }).toInt().isInt({ min: 1 })
    .withMessage('답장 대상 메시지 ID가 올바르지 않습니다.'),
  body('clientId').optional({ values: 'falsy' }).isString().isLength({ max: 100 }),
];
const dmRoomIdParamValidator = [
  param('roomId').toInt().isInt({ min: 1 }).withMessage('유효하지 않은 대화방 ID 입니다.'),
];
const dmMessageIdParamValidator = [
  param('messageId').toInt().isInt({ min: 1 }).withMessage('유효하지 않은 메시지 ID 입니다.'),
];
let ensureDmSoftDeleteColumnsPromise = null;

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

async function ensureDmSoftDeleteColumns() {
  if (!ensureDmSoftDeleteColumnsPromise) {
    ensureDmSoftDeleteColumnsPromise = (async () => {
      await addColumnIfMissing(
        'dm_rooms',
        'is_deleted_by_user1',
        'BOOLEAN DEFAULT FALSE',
      );
      await addColumnIfMissing(
        'dm_rooms',
        'is_deleted_by_user2',
        'BOOLEAN DEFAULT FALSE',
      );
      await addColumnIfMissing(
        'dm_rooms',
        'deleted_at_msg_id_user1',
        'INT DEFAULT NULL',
      );
      await addColumnIfMissing(
        'dm_rooms',
        'deleted_at_msg_id_user2',
        'INT DEFAULT NULL',
      );
      await addColumnIfMissing(
        'dm_messages',
        'is_deleted',
        'BOOLEAN DEFAULT FALSE',
      );
    })().catch((error) => {
      ensureDmSoftDeleteColumnsPromise = null;
      throw error;
    });
  }
  return ensureDmSoftDeleteColumnsPromise;
}

function orderedPair(a, b) {
  const x = Number(a);
  const y = Number(b);
  return x < y ? [x, y] : [y, x];
}

// ─────────────────────────────────────────────────────
// GET /api/dm/rooms — DM 방 목록
// ─────────────────────────────────────────────────────
router.get('/rooms', authenticate, async (req, res) => {
  try {
    await ensureDmSoftDeleteColumns();
    const userId = req.user.userId;
    const safePage = Math.max(1, parseInt(req.query.page, 10) || 1);
    const safeLimit = Math.min(
      Math.max(1, parseInt(req.query.limit, 10) || 20),
      100,
    );
    const safeOffset = Math.max(0, (safePage - 1) * safeLimit);

    const [rooms] = await pool.execute(
      `SELECT 
        dr.id,
        dr.user1_id,
        dr.user2_id,
        dr.last_message,
        dr.last_message_at,
        dr.created_at,
        (CASE WHEN dr.user1_id = ? THEN dr.user2_id ELSE dr.user1_id END) AS other_user_id,
        u.name_enc AS other_user_name_enc,
        s.name AS other_user_school_name,
        u.color_id AS other_user_color_id,
        (
          SELECT COUNT(*)
          FROM dm_messages dm
          WHERE dm.room_id = dr.id
            AND dm.sender_id != ?
            AND dm.is_read = FALSE
            AND (dm.is_deleted IS NULL OR dm.is_deleted = FALSE)
            AND (dm.is_shadow_blocked = FALSE OR dm.shadow_blocked_for_user_id IS NULL OR dm.shadow_blocked_for_user_id != ?)
        ) AS unread_count
      FROM dm_rooms dr
      INNER JOIN users u ON u.id = (CASE WHEN dr.user1_id = ? THEN dr.user2_id ELSE dr.user1_id END)
      LEFT JOIN schools s ON s.school_id = u.school_id
      WHERE (
          (dr.user1_id = ? AND (dr.is_deleted_by_user1 IS NULL OR dr.is_deleted_by_user1 = FALSE))
          OR
          (dr.user2_id = ? AND (dr.is_deleted_by_user2 IS NULL OR dr.is_deleted_by_user2 = FALSE))
        )
        AND EXISTS (
          SELECT 1
          FROM dm_messages dm0
          WHERE dm0.room_id = dr.id
            AND (dm0.is_deleted IS NULL OR dm0.is_deleted = FALSE)
        )
        AND u.is_deleted = FALSE
      ORDER BY COALESCE(dr.last_message_at, dr.created_at) DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [userId, userId, userId, userId, userId, userId],
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM dm_rooms
       WHERE (
         (user1_id = ? AND (is_deleted_by_user1 IS NULL OR is_deleted_by_user1 = FALSE))
         OR
         (user2_id = ? AND (is_deleted_by_user2 IS NULL OR is_deleted_by_user2 = FALSE))
       )
         AND EXISTS (
           SELECT 1
           FROM dm_messages dm0
           WHERE dm0.room_id = dm_rooms.id
            AND (dm0.is_deleted IS NULL OR dm0.is_deleted = FALSE)
         )`,
      [userId, userId],
    );
    const total = Number(countRows[0]?.total ?? 0);

    res.json({
      success: true,
      data: {
        rooms,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit) || 1,
        },
      },
    });
  } catch (error) {
    console.error('[DM] GET /rooms 오류:', error);
    res.status(500).json({
      success: false,
      message: 'DM 목록 조회 오류',
    });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/dm/rooms — 방 생성 또는 기존 방 반환
// ─────────────────────────────────────────────────────
router.post('/rooms', authenticate, validate(dmCreateRoomValidators), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { otherUserId } = req.body;

    if (otherUserId == null || otherUserId === '') {
      return res.status(400).json({
        success: false,
        message: '상대방 사용자 ID를 입력해주세요.',
      });
    }

    const other = parseInt(otherUserId, 10);
    if (Number.isNaN(other)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 사용자 ID입니다.',
      });
    }

    if (userId === other) {
      return res.status(400).json({
        success: false,
        message: '자기 자신과는 대화방을 만들 수 없습니다.',
      });
    }

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND is_deleted = FALSE',
      [other],
    );
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '상대방 사용자를 찾을 수 없습니다.',
      });
    }

    const [u1, u2] = orderedPair(userId, other);

    const [existing] = await pool.execute(
      `SELECT id, user1_id, user2_id, last_message, last_message_at, created_at
       FROM dm_rooms WHERE user1_id = ? AND user2_id = ?`,
      [u1, u2],
    );

    if (existing.length > 0) {
      return res.json({
        success: true,
        message: '이미 존재하는 대화방입니다.',
        data: existing[0],
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO dm_rooms (user1_id, user2_id) VALUES (?, ?)`,
      [u1, u2],
    );

    const [rows] = await pool.execute(
      `SELECT id, user1_id, user2_id, last_message, last_message_at, created_at
       FROM dm_rooms WHERE id = ?`,
      [result.insertId],
    );

    res.status(201).json({
      success: true,
      message: '대화방이 생성되었습니다.',
      data: rows[0],
    });
  } catch (error) {
    console.error('[DM] POST /rooms 오류:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: '이미 존재하는 대화방입니다.',
      });
    }
    res.status(500).json({
      success: false,
      message: '대화방 생성 중 오류가 발생했습니다.',
    });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/dm/unread-count — 미읽음 수 (rooms/:roomId 보다 먼저 등록)
// ─────────────────────────────────────────────────────
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    await ensureDmSoftDeleteColumns();
    const userId = req.user.userId;

    const [result] = await pool.execute(
      `SELECT COUNT(*) AS total_unread
       FROM dm_messages m
       INNER JOIN dm_rooms r ON m.room_id = r.id
       WHERE (
         (r.user1_id = ? AND (r.is_deleted_by_user1 IS NULL OR r.is_deleted_by_user1 = FALSE))
         OR
         (r.user2_id = ? AND (r.is_deleted_by_user2 IS NULL OR r.is_deleted_by_user2 = FALSE))
       )
         AND m.sender_id != ?
         AND m.is_read = FALSE
        AND (m.is_deleted IS NULL OR m.is_deleted = FALSE)
         AND (m.is_shadow_blocked = FALSE OR m.shadow_blocked_for_user_id IS NULL OR m.shadow_blocked_for_user_id != ?)`,
      [userId, userId, userId, userId],
    );

    res.json({
      success: true,
      data: { totalUnread: Number(result[0]?.total_unread ?? 0) },
    });
  } catch (error) {
    console.error('[DM] GET /unread-count 오류:', error);
    res.status(500).json({
      success: false,
      message: '미읽음 수 조회 중 오류가 발생했습니다.',
    });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/dm/rooms/:roomId — 메시지 내역
// ─────────────────────────────────────────────────────
router.get('/rooms/:roomId', authenticate, async (req, res) => {
  try {
    await ensureDmSoftDeleteColumns();
    const userId = req.user.userId;
    const { roomId } = req.params;
    const { before, limit = 30 } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 30));
    const fetchLimit = limitNum + 1;

    const [rooms] = await pool.execute(
      `SELECT id, user1_id, user2_id, last_message, last_message_at, created_at,
              deleted_at_msg_id_user1, deleted_at_msg_id_user2
       FROM dm_rooms
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [roomId, userId, userId],
    );

    if (rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: '대화방을 찾을 수 없거나 접근 권한이 없습니다.',
      });
    }

    const room = rooms[0];
    const isUser1 = room.user1_id === userId;
    const deletedAtMsgId = isUser1
      ? (room.deleted_at_msg_id_user1 ?? 0)
      : (room.deleted_at_msg_id_user2 ?? 0);

    if (isUser1 && room.deleted_at_msg_id_user1 !== null) {
      await pool.execute(
        'UPDATE dm_rooms SET deleted_at_msg_id_user1 = NULL WHERE id = ?',
        [roomId],
      );
    } else if (!isUser1 && room.deleted_at_msg_id_user2 !== null) {
      await pool.execute(
        'UPDATE dm_rooms SET deleted_at_msg_id_user2 = NULL WHERE id = ?',
        [roomId],
      );
    }

    const beforeParsed =
      before != null && before !== ''
        ? parseInt(before, 10)
        : null;
    const safeBefore =
      beforeParsed != null && !Number.isNaN(beforeParsed)
        ? beforeParsed
        : null;

    const roomIdNum = parseInt(roomId, 10);
    let sql;
    let params;
    const imageSub = `(SELECT JSON_ARRAYAGG(cloudinary_url)
             FROM (
               SELECT cloudinary_url
               FROM dm_message_images
               WHERE dm_message_id = m.id AND deleted_at IS NULL
               ORDER BY display_order ASC
             ) di) AS images`;

    if (safeBefore != null) {
      sql = `SELECT m.id, m.room_id, m.sender_id, m.parent_message_id, m.content, m.is_read, m.is_deleted, m.created_at,
                    pm.content AS parent_content, pu.name_enc AS parent_sender_name_enc,
                    u.name_enc AS sender_name_enc, u.color_id AS sender_color_id,
                    ${imageSub}
             FROM dm_messages m
             LEFT JOIN users u ON m.sender_id = u.id
             LEFT JOIN dm_messages pm ON m.parent_message_id = pm.id
             LEFT JOIN users pu ON pm.sender_id = pu.id
             WHERE m.room_id = ? AND m.id > ? AND m.id < ?
               AND (m.is_shadow_blocked = FALSE OR m.shadow_blocked_for_user_id IS NULL OR m.shadow_blocked_for_user_id != ?)
             ORDER BY m.id DESC
             LIMIT ${fetchLimit}`;
      params = [roomIdNum, Number(deletedAtMsgId) || 0, safeBefore, userId];
    } else {
      sql = `SELECT m.id, m.room_id, m.sender_id, m.parent_message_id, m.content, m.is_read, m.is_deleted, m.created_at,
                    pm.content AS parent_content, pu.name_enc AS parent_sender_name_enc,
                    u.name_enc AS sender_name_enc, u.color_id AS sender_color_id,
                    ${imageSub}
             FROM dm_messages m
             LEFT JOIN users u ON m.sender_id = u.id
             LEFT JOIN dm_messages pm ON m.parent_message_id = pm.id
             LEFT JOIN users pu ON pm.sender_id = pu.id
             WHERE m.room_id = ? AND m.id > ?
               AND (m.is_shadow_blocked = FALSE OR m.shadow_blocked_for_user_id IS NULL OR m.shadow_blocked_for_user_id != ?)
             ORDER BY m.id DESC
             LIMIT ${fetchLimit}`;
      params = [roomIdNum, Number(deletedAtMsgId) || 0, userId];
    }

    const [messages] = await pool.execute(sql, params);
    const hasMore = messages.length > limitNum;
    const slice = hasMore ? messages.slice(0, limitNum) : messages;
    slice.reverse();

    for (const row of slice) {
      try {
        if (row.images) {
          row.images =
            typeof row.images === 'string'
              ? JSON.parse(row.images)
              : row.images;
        } else {
          row.images = [];
        }
      } catch {
        row.images = [];
      }
    }

    res.json({
      success: true,
      room: rooms[0],
      data: slice,
      hasMore,
    });
  } catch (error) {
    console.error('[DM] GET /rooms/:roomId 오류:', error);
    res.status(500).json({
      success: false,
      message: '메시지 내역 조회 중 오류가 발생했습니다.',
    });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/dm/rooms/:roomId/messages — 메시지 전송 (텍스트 + 이미지)
// ─────────────────────────────────────────────────────
router.post(
  '/rooms/:roomId/messages',
  authenticate,
  uploadDm.array('images', 5),
  validate(dmSendMessageValidators),
  async (req, res) => {
    try {
      await ensureDmSoftDeleteColumns();
      const userId = req.user.userId;
      const { roomId } = req.params;
      const { content, clientId, parent_message_id } = req.body;
      const trimmed =
        typeof content === 'string' && content.trim() ? content.trim() : null;
      const parentMessageId =
        parent_message_id != null && parent_message_id !== ''
          ? parseInt(parent_message_id, 10)
          : null;

      if (!trimmed && (!req.files || req.files.length === 0)) {
        return res.status(400).json({
          success: false,
          message: '내용 또는 이미지를 입력해주세요.',
        });
      }

      const [rooms] = await pool.execute(
        `SELECT id, user1_id, user2_id FROM dm_rooms
         WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
        [roomId, userId, userId],
      );

      if (rooms.length === 0) {
        return res.status(404).json({
          success: false,
          message: '대화방을 찾을 수 없거나 접근 권한이 없습니다.',
        });
      }
      const room = rooms[0];
      const otherUserId =
        room.user1_id === userId ? room.user2_id : room.user1_id;
      const isShadowBlocked = await isBlockedBy({
        blockerUserId: otherUserId,
        targetUserId: userId,
      });

      // 답장 대상이 있다면, 같은 방에 속한 메시지인지 확인합니다.
      if (parentMessageId && !Number.isNaN(parentMessageId)) {
        const [parentRows] = await pool.execute(
          `SELECT id FROM dm_messages
           WHERE id = ? AND room_id = ?`,
          [parentMessageId, roomId],
        );

        if (parentRows.length === 0) {
          return res.status(400).json({
            success: false,
            message: '유효하지 않은 답장 대상 메시지입니다.',
          });
        }
      }

      const now = getNowForDB();
      const [result] = await pool.execute(
        `INSERT INTO dm_messages (
          room_id,
          sender_id,
          content,
          parent_message_id,
          created_at,
          is_shadow_blocked,
          shadow_blocked_for_user_id
        )
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          roomId,
          userId,
          trimmed,
          parentMessageId,
          now,
          isShadowBlocked,
          isShadowBlocked ? otherUserId : null,
        ],
      );
      const messageId = result.insertId;

      if (req.files && req.files.length > 0) {
        const imageValues = req.files.map((file, index) => [
          messageId,
          file.path,
          file.filename,
          index,
        ]);
        await pool.query(
          'INSERT INTO dm_message_images (dm_message_id, cloudinary_url, cloudinary_public_id, display_order) VALUES ?',
          [imageValues],
        );
      }

      const preview = (trimmed ?? '사진').substring(0, 500);
      await pool.execute(
        `UPDATE dm_rooms
         SET last_message = ?,
             last_message_at = ?,
             is_deleted_by_user1 = IF(user2_id = ?, FALSE, is_deleted_by_user1),
             is_deleted_by_user2 = IF(user1_id = ?, FALSE, is_deleted_by_user2)
         WHERE id = ?`,
        [preview, now, userId, userId, roomId],
      );

      const [rows] = await pool.execute(
        `SELECT m.id, m.room_id, m.sender_id, m.parent_message_id, m.content, m.is_read, m.is_deleted, m.created_at,
                pm.content AS parent_content, pu.name_enc AS parent_sender_name_enc,
                u.name_enc AS sender_name_enc, u.color_id AS sender_color_id,
                s.name AS sender_school_name,
                (SELECT JSON_ARRAYAGG(cloudinary_url)
                 FROM (
                   SELECT cloudinary_url
                   FROM dm_message_images
                   WHERE dm_message_id = m.id AND deleted_at IS NULL
                   ORDER BY display_order ASC
                 ) di) AS images
         FROM dm_messages m
         LEFT JOIN users u ON m.sender_id = u.id
         LEFT JOIN schools s ON u.school_id = s.school_id
         LEFT JOIN dm_messages pm ON m.parent_message_id = pm.id
         LEFT JOIN users pu ON pm.sender_id = pu.id
         WHERE m.id = ?`,
        [messageId],
      );

      const savedMessage = rows[0];
      try {
        if (savedMessage.images) {
          savedMessage.images =
            typeof savedMessage.images === 'string'
              ? JSON.parse(savedMessage.images)
              : savedMessage.images;
        } else {
          savedMessage.images = [];
        }
      } catch {
        savedMessage.images = [];
      }
      if (clientId) {
        savedMessage.client_id = String(clientId);
      }

      emitNewMessage(roomId, savedMessage, { roomType: 'dm' });

      if (
        otherUserId &&
        otherUserId !== userId &&
        !isShadowBlocked &&
        !isUserInRoom(roomId, otherUserId)
      ) {
        const senderName = savedMessage?.sender_name || '새 메시지';
        await enqueueNotification({
          userId: otherUserId,
          type: 'mail',
          category: 'mail',
          title: senderName,
          body: (trimmed ?? '사진').slice(0, 80),
          relatedType: 'dm_room',
          relatedId: roomId,
          sourceId: `dm_message:${messageId}`,
          senderUserId: userId,
          senderName,
          senderSchoolName: savedMessage?.sender_school_name || null,
          senderColorId: savedMessage?.sender_color_id ?? null,
        });
      }

      res.status(201).json({
        success: true,
        message: '메시지가 전송되었습니다.',
        data: savedMessage,
      });
    } catch (error) {
      console.error('[DM] POST /rooms/:roomId/messages 오류:', error);
      res.status(500).json({
        success: false,
        message: '메시지 전송 중 오류가 발생했습니다.',
      });
    }
  },
);

// ─────────────────────────────────────────────────────
// PUT /api/dm/rooms/:roomId/read — 읽음 처리
// ─────────────────────────────────────────────────────
router.put('/rooms/:roomId/read', authenticate, validate(dmRoomIdParamValidator), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;
    console.log('[ReadChain][dm] read 요청', { userId, roomId });

    const [rooms] = await pool.execute(
      `SELECT id, user1_id, user2_id FROM dm_rooms
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [roomId, userId, userId],
    );
    if (rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: '대화방을 찾을 수 없거나 접근 권한이 없습니다.',
      });
    }

    const room = rooms[0];
    const otherUserId =
      room.user1_id === userId ? room.user2_id : room.user1_id;

    const [updateResult] = await pool.execute(
      `UPDATE dm_messages SET is_read = TRUE
       WHERE room_id = ? AND sender_id != ? AND is_read = FALSE`,
      [roomId, userId],
    );
    console.log('[ReadChain][dm] update 결과', {
      userId,
      roomId,
      affectedRows: updateResult.affectedRows,
      otherUserId,
    });

    if (updateResult.affectedRows > 0 && otherUserId) {
      emitReadReceipt(otherUserId, roomId);
    }

    res.json({
      success: true,
      message: '메시지가 읽음 처리되었습니다.',
      data: { updatedCount: updateResult.affectedRows },
    });
  } catch (error) {
    console.error('[DM] PUT /rooms/:roomId/read 오류:', error);
    res.status(500).json({
      success: false,
      message: '메시지 읽음 처리 중 오류가 발생했습니다.',
    });
  }
});

// ─────────────────────────────────────────────────────
// DELETE /api/dm/messages/:messageId — 본인 메시지 삭제
// ─────────────────────────────────────────────────────
router.delete('/messages/:messageId', authenticate, validate(dmMessageIdParamValidator), async (req, res) => {
  try {
    await ensureDmSoftDeleteColumns();
    const userId = req.user.userId;
    const { messageId } = req.params;

    const [del] = await pool.execute(
      `UPDATE dm_messages
       SET is_deleted = TRUE
       WHERE id = ? AND sender_id = ? AND (is_deleted IS NULL OR is_deleted = FALSE)`,
      [messageId, userId],
    );

    if (!del.affectedRows) {
      return res.status(404).json({
        success: false,
        message: '메시지를 찾을 수 없거나 삭제 권한이 없습니다.',
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[DM] DELETE /messages/:messageId 오류:', error);
    res.status(500).json({
      success: false,
      message: '메시지 삭제 중 오류가 발생했습니다.',
    });
  }
});

// ─────────────────────────────────────────────────────
// DELETE /api/dm/rooms/:roomId — 내 목록에서 DM 방 숨김(소프트 삭제)
// ─────────────────────────────────────────────────────
router.delete('/rooms/:roomId', authenticate, validate(dmRoomIdParamValidator), async (req, res) => {
  try {
    await ensureDmSoftDeleteColumns();
    const userId = req.user.userId;
    const { roomId } = req.params;

    const [rooms] = await pool.execute(
      `SELECT id FROM dm_rooms WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [roomId, userId, userId],
    );
    if (rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: '대화방을 찾을 수 없거나 접근 권한이 없습니다.',
      });
    }

    const [lastMsg] = await pool.execute(
      'SELECT MAX(id) AS last_id FROM dm_messages WHERE room_id = ?',
      [roomId],
    );
    const lastMsgId = Number(lastMsg[0]?.last_id ?? 0);

    await pool.execute(
      `UPDATE dm_rooms
       SET is_deleted_by_user1 = IF(user1_id = ?, TRUE, is_deleted_by_user1),
           is_deleted_by_user2 = IF(user2_id = ?, TRUE, is_deleted_by_user2),
           deleted_at_msg_id_user1 = IF(user1_id = ?, ?, deleted_at_msg_id_user1),
           deleted_at_msg_id_user2 = IF(user2_id = ?, ?, deleted_at_msg_id_user2)
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [
        userId,
        userId,
        userId,
        lastMsgId,
        userId,
        lastMsgId,
        roomId,
        userId,
        userId,
      ],
    );

    res.json({ success: true, message: 'DM 대화방이 삭제되었습니다.' });
  } catch (error) {
    console.error('[DM] DELETE /rooms/:roomId 오류:', error);
    res.status(500).json({
      success: false,
      message: '대화방 삭제 중 오류가 발생했습니다.',
    });
  }
});

export default router;

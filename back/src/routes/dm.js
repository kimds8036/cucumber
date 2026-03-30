/**
 * DM (친구 간 다이렉트 메시지) — dm_rooms / dm_messages
 */
import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { getNowForDB } from '../utils/dateUtils.js';
import { upload } from '../config/cloudinary.js';
import { emitNewMessage, emitReadReceipt } from '../socketServer.js';

const router = express.Router();

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
        u.name AS other_user_name,
        s.name AS other_user_school_name,
        u.color_id AS other_user_color_id,
        (
          SELECT COUNT(*)
          FROM dm_messages dm
          WHERE dm.room_id = dr.id
            AND dm.sender_id != ?
            AND dm.is_read = FALSE
        ) AS unread_count
      FROM dm_rooms dr
      INNER JOIN users u ON u.id = (CASE WHEN dr.user1_id = ? THEN dr.user2_id ELSE dr.user1_id END)
      LEFT JOIN schools s ON s.school_id = u.school_id
      WHERE (dr.user1_id = ? OR dr.user2_id = ?)
        AND u.is_deleted = FALSE
      ORDER BY COALESCE(dr.last_message_at, dr.created_at) DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [userId, userId, userId, userId, userId],
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM dm_rooms
       WHERE user1_id = ? OR user2_id = ?`,
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
router.post('/rooms', authenticate, async (req, res) => {
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
    const userId = req.user.userId;

    const [result] = await pool.execute(
      `SELECT COUNT(*) AS total_unread
       FROM dm_messages m
       INNER JOIN dm_rooms r ON m.room_id = r.id
       WHERE (r.user1_id = ? OR r.user2_id = ?)
         AND m.sender_id != ?
         AND m.is_read = FALSE`,
      [userId, userId, userId],
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
    const userId = req.user.userId;
    const { roomId } = req.params;
    const { before, limit = 30 } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 30));
    const fetchLimit = limitNum + 1;

    const [rooms] = await pool.execute(
      `SELECT id, user1_id, user2_id, last_message, last_message_at, created_at
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
      sql = `SELECT m.id, m.room_id, m.sender_id, m.parent_message_id, m.content, m.is_read, m.created_at,
                    pm.content AS parent_content, pu.name AS parent_sender_name,
                    u.name AS sender_name, u.color_id AS sender_color_id,
                    ${imageSub}
             FROM dm_messages m
             LEFT JOIN users u ON m.sender_id = u.id
             LEFT JOIN dm_messages pm ON m.parent_message_id = pm.id
             LEFT JOIN users pu ON pm.sender_id = pu.id
             WHERE m.room_id = ? AND m.id < ?
             ORDER BY m.id DESC
             LIMIT ${fetchLimit}`;
      params = [roomIdNum, safeBefore];
    } else {
      sql = `SELECT m.id, m.room_id, m.sender_id, m.parent_message_id, m.content, m.is_read, m.created_at,
                    pm.content AS parent_content, pu.name AS parent_sender_name,
                    u.name AS sender_name, u.color_id AS sender_color_id,
                    ${imageSub}
             FROM dm_messages m
             LEFT JOIN users u ON m.sender_id = u.id
             LEFT JOIN dm_messages pm ON m.parent_message_id = pm.id
             LEFT JOIN users pu ON pm.sender_id = pu.id
             WHERE m.room_id = ?
             ORDER BY m.id DESC
             LIMIT ${fetchLimit}`;
      params = [roomIdNum];
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
  upload.array('images', 5),
  async (req, res) => {
    try {
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
        `INSERT INTO dm_messages (room_id, sender_id, content, parent_message_id, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [roomId, userId, trimmed, parentMessageId, now],
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
        `UPDATE dm_rooms SET last_message = ?, last_message_at = ? WHERE id = ?`,
        [preview, now, roomId],
      );

      const [rows] = await pool.execute(
        `SELECT m.id, m.room_id, m.sender_id, m.parent_message_id, m.content, m.is_read, m.created_at,
                pm.content AS parent_content, pu.name AS parent_sender_name,
                u.name AS sender_name, u.color_id AS sender_color_id,
                (SELECT JSON_ARRAYAGG(cloudinary_url)
                 FROM (
                   SELECT cloudinary_url
                   FROM dm_message_images
                   WHERE dm_message_id = m.id AND deleted_at IS NULL
                   ORDER BY display_order ASC
                 ) di) AS images
         FROM dm_messages m
         LEFT JOIN users u ON m.sender_id = u.id
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

      emitNewMessage(roomId, savedMessage);

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
router.put('/rooms/:roomId/read', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;

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
router.delete('/messages/:messageId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { messageId } = req.params;

    const [del] = await pool.execute(
      `DELETE FROM dm_messages
       WHERE id = ? AND sender_id = ?`,
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

export default router;

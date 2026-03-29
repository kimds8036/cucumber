/**
 * DM (친구 간 다이렉트 메시지) — dm_rooms / dm_messages
 */
import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { getNowForDB } from '../utils/dateUtils.js';

const router = express.Router();

function orderedPair(a, b) {
  const x = Number(a);
  const y = Number(b);
  return x < y ? [x, y] : [y, x];
}

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
    if (safeBefore != null) {
      sql = `SELECT m.id, m.room_id, m.sender_id, m.content, m.is_read, m.created_at,
                    u.name AS sender_name, u.color_id AS sender_color_id
             FROM dm_messages m
             LEFT JOIN users u ON m.sender_id = u.id
             WHERE m.room_id = ? AND m.id < ?
             ORDER BY m.id DESC
             LIMIT ${fetchLimit}`;
      params = [roomIdNum, safeBefore];
    } else {
      sql = `SELECT m.id, m.room_id, m.sender_id, m.content, m.is_read, m.created_at,
                    u.name AS sender_name, u.color_id AS sender_color_id
             FROM dm_messages m
             LEFT JOIN users u ON m.sender_id = u.id
             WHERE m.room_id = ?
             ORDER BY m.id DESC
             LIMIT ${fetchLimit}`;
      params = [roomIdNum];
    }

    const [messages] = await pool.execute(sql, params);
    const hasMore = messages.length > limitNum;
    const slice = hasMore ? messages.slice(0, limitNum) : messages;
    slice.reverse();

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
// POST /api/dm/rooms/:roomId/messages — 메시지 전송
// ─────────────────────────────────────────────────────
router.post('/rooms/:roomId/messages', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;
    const { content } = req.body;
    const trimmed = typeof content === 'string' ? content.trim() : '';

    if (!trimmed) {
      return res.status(400).json({
        success: false,
        message: '내용을 입력해주세요.',
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

    const now = getNowForDB();
    const [result] = await pool.execute(
      `INSERT INTO dm_messages (room_id, sender_id, content, created_at) VALUES (?, ?, ?, ?)`,
      [roomId, userId, trimmed, now],
    );
    const messageId = result.insertId;

    await pool.execute(
      `UPDATE dm_rooms SET last_message = ?, last_message_at = ? WHERE id = ?`,
      [trimmed.substring(0, 500), now, roomId],
    );

    const [rows] = await pool.execute(
      `SELECT m.id, m.room_id, m.sender_id, m.content, m.is_read, m.created_at,
              u.name AS sender_name, u.color_id AS sender_color_id
       FROM dm_messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [messageId],
    );

    res.status(201).json({
      success: true,
      message: '메시지가 전송되었습니다.',
      data: rows[0],
    });
  } catch (error) {
    console.error('[DM] POST /rooms/:roomId/messages 오류:', error);
    res.status(500).json({
      success: false,
      message: '메시지 전송 중 오류가 발생했습니다.',
    });
  }
});

export default router;

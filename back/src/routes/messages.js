import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 채팅방 목록 조회
router.get('/rooms', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 사용자가 참여한 채팅방 조회
    const [rooms] = await pool.execute(
      `SELECT 
        mr.id,
        mr.post_id,
        mr.user1_id,
        mr.user2_id,
        mr.last_message,
        mr.last_message_at,
        mr.created_at,
        p.content as post_content,
        CASE 
          WHEN mr.user1_id = ? THEN u2.id
          ELSE u1.id
        END as other_user_id,
        CASE 
          WHEN mr.user1_id = ? THEN u2.name
          ELSE u1.name
        END as other_user_name,
        CASE 
          WHEN mr.user1_id = ? THEN u2.color_id
          ELSE u1.color_id
        END as other_user_color_id,
        (SELECT COUNT(*) FROM messages m 
         WHERE m.room_id = mr.id 
         AND m.sender_id != ? 
         AND m.is_read = FALSE) as unread_count
      FROM message_rooms mr
      LEFT JOIN posts p ON mr.post_id = p.id
      LEFT JOIN users u1 ON mr.user1_id = u1.id
      LEFT JOIN users u2 ON mr.user2_id = u2.id
      WHERE (mr.user1_id = ? OR mr.user2_id = ?)
      ORDER BY mr.last_message_at DESC, mr.created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, userId, userId, userId, userId, userId, parseInt(limit), offset]
    );

    // 전체 개수 조회
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM message_rooms 
       WHERE user1_id = ? OR user2_id = ?`,
      [userId, userId]
    );
    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        rooms,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('채팅방 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '채팅방 목록 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 채팅방 생성
router.post('/rooms', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId, otherUserId } = req.body;

    if (!postId || !otherUserId) {
      return res.status(400).json({ 
        success: false, 
        message: '게시글 ID와 상대방 사용자 ID를 입력해주세요.' 
      });
    }

    if (userId === parseInt(otherUserId)) {
      return res.status(400).json({ 
        success: false, 
        message: '자기 자신과는 채팅방을 생성할 수 없습니다.' 
      });
    }

    // 게시글 존재 확인
    const [posts] = await pool.execute('SELECT id FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '게시글을 찾을 수 없습니다.' 
      });
    }

    // 상대방 사용자 존재 확인
    const [users] = await pool.execute('SELECT id FROM users WHERE id = ? AND is_deleted = FALSE', [otherUserId]);
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '상대방 사용자를 찾을 수 없습니다.' 
      });
    }

    // 이미 채팅방이 존재하는지 확인 (user1_id와 user2_id 순서 무관하게)
    const [existingRooms] = await pool.execute(
      `SELECT id FROM message_rooms 
       WHERE post_id = ? 
       AND ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))`,
      [postId, userId, otherUserId, otherUserId, userId]
    );

    if (existingRooms.length > 0) {
      // 기존 채팅방 정보 반환
      const roomId = existingRooms[0].id;
      const [roomInfo] = await pool.execute(
        `SELECT 
          mr.id,
          mr.post_id,
          mr.user1_id,
          mr.user2_id,
          mr.last_message,
          mr.last_message_at,
          mr.created_at
        FROM message_rooms mr
        WHERE mr.id = ?`,
        [roomId]
      );

      return res.json({
        success: true,
        message: '이미 존재하는 채팅방입니다.',
        data: roomInfo[0]
      });
    }

    // user1_id < user2_id 순서로 정렬하여 저장 (일관성 유지)
    const user1Id = userId < otherUserId ? userId : otherUserId;
    const user2Id = userId < otherUserId ? otherUserId : userId;

    // 채팅방 생성
    const [result] = await pool.execute(
      `INSERT INTO message_rooms (post_id, user1_id, user2_id) 
       VALUES (?, ?, ?)`,
      [postId, user1Id, user2Id]
    );

    // 생성된 채팅방 정보 조회
    const [newRooms] = await pool.execute(
      `SELECT 
        mr.id,
        mr.post_id,
        mr.user1_id,
        mr.user2_id,
        mr.last_message,
        mr.last_message_at,
        mr.created_at
      FROM message_rooms mr
      WHERE mr.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: '채팅방이 생성되었습니다.',
      data: newRooms[0]
    });
  } catch (error) {
    console.error('채팅방 생성 오류:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: '이미 존재하는 채팅방입니다.' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: '채팅방 생성 중 오류가 발생했습니다.' 
    });
  }
});

// 채팅 내역 조회
router.get('/rooms/:roomId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 채팅방 존재 및 접근 권한 확인
    const [rooms] = await pool.execute(
      `SELECT id, user1_id, user2_id, post_id 
       FROM message_rooms 
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [roomId, userId, userId]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '채팅방을 찾을 수 없거나 접근 권한이 없습니다.' 
      });
    }

    const room = rooms[0];

    // 채팅방 정보와 게시글 정보 조회
    const [roomInfo] = await pool.execute(
      `SELECT 
        mr.id,
        mr.post_id,
        mr.user1_id,
        mr.user2_id,
        mr.last_message,
        mr.last_message_at,
        mr.created_at,
        p.content as post_content,
        CASE 
          WHEN mr.user1_id = ? THEN u2.id
          ELSE u1.id
        END as other_user_id,
        CASE 
          WHEN mr.user1_id = ? THEN u2.name
          ELSE u1.name
        END as other_user_name,
        CASE 
          WHEN mr.user1_id = ? THEN u2.color_id
          ELSE u1.color_id
        END as other_user_color_id
      FROM message_rooms mr
      LEFT JOIN posts p ON mr.post_id = p.id
      LEFT JOIN users u1 ON mr.user1_id = u1.id
      LEFT JOIN users u2 ON mr.user2_id = u2.id
      WHERE mr.id = ?`,
      [userId, userId, userId, roomId]
    );

    // 메시지 조회 (최신순)
    const [messages] = await pool.execute(
      `SELECT 
        m.id,
        m.room_id,
        m.sender_id,
        m.content,
        m.is_read,
        m.created_at,
        u.name as sender_name,
        u.color_id as sender_color_id
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.room_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?`,
      [roomId, parseInt(limit), offset]
    );

    // 전체 메시지 개수 조회
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM messages WHERE room_id = ?',
      [roomId]
    );
    const total = countResult[0].total;

    // 메시지를 시간순으로 정렬 (오래된 것부터)
    messages.reverse();

    res.json({
      success: true,
      data: {
        room: roomInfo[0],
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('채팅 내역 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '채팅 내역 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 쪽지 보내기
router.post('/rooms/:roomId/messages', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: '메시지 내용을 입력해주세요.' 
      });
    }

    // 채팅방 존재 및 접근 권한 확인
    const [rooms] = await pool.execute(
      `SELECT id, user1_id, user2_id 
       FROM message_rooms 
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [roomId, userId, userId]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '채팅방을 찾을 수 없거나 접근 권한이 없습니다.' 
      });
    }

    // 메시지 생성
    const [result] = await pool.execute(
      `INSERT INTO messages (room_id, sender_id, content) 
       VALUES (?, ?, ?)`,
      [roomId, userId, content.trim()]
    );

    // 채팅방의 마지막 메시지 정보 업데이트
    await pool.execute(
      `UPDATE message_rooms 
       SET last_message = ?, last_message_at = NOW() 
       WHERE id = ?`,
      [content.trim().substring(0, 100), roomId] // 마지막 메시지는 최대 100자
    );

    // 생성된 메시지 정보 조회
    const [messages] = await pool.execute(
      `SELECT 
        m.id,
        m.room_id,
        m.sender_id,
        m.content,
        m.is_read,
        m.created_at,
        u.name as sender_name,
        u.color_id as sender_color_id
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: '메시지가 전송되었습니다.',
      data: messages[0]
    });
  } catch (error) {
    console.error('쪽지 보내기 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '메시지 전송 중 오류가 발생했습니다.' 
    });
  }
});

// 메시지 읽음 처리
router.put('/rooms/:roomId/read', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;

    // 채팅방 존재 및 접근 권한 확인
    const [rooms] = await pool.execute(
      `SELECT id, user1_id, user2_id 
       FROM message_rooms 
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [roomId, userId, userId]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '채팅방을 찾을 수 없거나 접근 권한이 없습니다.' 
      });
    }

    // 상대방이 보낸 메시지를 읽음 처리
    const [result] = await pool.execute(
      `UPDATE messages 
       SET is_read = TRUE 
       WHERE room_id = ? AND sender_id != ? AND is_read = FALSE`,
      [roomId, userId]
    );

    res.json({
      success: true,
      message: '메시지가 읽음 처리되었습니다.',
      data: {
        updatedCount: result.affectedRows
      }
    });
  } catch (error) {
    console.error('메시지 읽음 처리 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '메시지 읽음 처리 중 오류가 발생했습니다.' 
    });
  }
});

// 읽지 않은 메시지 수 조회
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 사용자가 참여한 모든 채팅방의 읽지 않은 메시지 수 조회
    const [result] = await pool.execute(
      `SELECT COUNT(*) as total_unread
       FROM messages m
       INNER JOIN message_rooms mr ON m.room_id = mr.id
       WHERE (mr.user1_id = ? OR mr.user2_id = ?)
       AND m.sender_id != ?
       AND m.is_read = FALSE`,
      [userId, userId, userId]
    );

    // 채팅방별 읽지 않은 메시지 수
    const [roomCounts] = await pool.execute(
      `SELECT 
        mr.id as room_id,
        COUNT(m.id) as unread_count
       FROM message_rooms mr
       LEFT JOIN messages m ON m.room_id = mr.id 
         AND m.sender_id != ? 
         AND m.is_read = FALSE
       WHERE (mr.user1_id = ? OR mr.user2_id = ?)
       GROUP BY mr.id
       HAVING unread_count > 0`,
      [userId, userId, userId]
    );

    res.json({
      success: true,
      data: {
        totalUnread: result[0].total_unread,
        roomCounts: roomCounts.map(rc => ({
          roomId: rc.room_id,
          unreadCount: rc.unread_count
        }))
      }
    });
  } catch (error) {
    console.error('읽지 않은 메시지 수 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '읽지 않은 메시지 수 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 채팅방 삭제 (나가기)
router.delete('/rooms/:roomId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;

    // 채팅방 존재 및 접근 권한 확인
    const [rooms] = await pool.execute(
      `SELECT id, user1_id, user2_id 
       FROM message_rooms 
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [roomId, userId, userId]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '채팅방을 찾을 수 없거나 접근 권한이 없습니다.' 
      });
    }

    // 채팅방과 관련된 모든 메시지 삭제 (CASCADE로 자동 삭제됨)
    // 채팅방 삭제
    await pool.execute('DELETE FROM message_rooms WHERE id = ?', [roomId]);

    res.json({
      success: true,
      message: '채팅방이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('채팅방 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '채팅방 삭제 중 오류가 발생했습니다.' 
    });
  }
});

export default router;

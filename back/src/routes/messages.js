/**
 * messages.js  (Express Router)
 *
 * 변경 요약
 * ─────────────────────────────────────────────────────
 * 1. 메시지 전송 시 상대방에게 Socket.io로 즉시 push
 *    (emitNewMessage / emitReadReceipt)
 * 2. 알림 생성을 createNotification() 직접 호출 →
 *    enqueueNotification() 큐 위임으로 교체
 *    → 알림 서버 장애가 메시지 전송 실패로 전파되지 않음
 * 3. 읽음 처리 시 메시지를 보낸 사람에게 read_receipt emit
 * 4. 채팅방 나가기 / 내 메시지 삭제는 DB 소프트 삭제 (상대방 목록은 유지)
 * ─────────────────────────────────────────────────────
 */

import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { getNowForDB } from '../utils/dateUtils.js';
import { emitNewMessage, emitReadReceipt } from '../socketServer.js';
import { enqueueNotification } from '../utils/notificationWorker.js';

const router = express.Router();

// ─────────────────────────────────────────────────────
// 채팅방 목록 조회
// ─────────────────────────────────────────────────────
router.get('/rooms', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    // 진단용 - 나중에 삭제
    const [debugRooms] = await pool.execute(
      `SELECT mr.id, mr.user1_id, mr.user2_id,
        mr.is_deleted_by_user1, mr.is_deleted_by_user2
       FROM message_rooms mr
       WHERE mr.user1_id = ? OR mr.user2_id = ?`,
      [userId, userId]
    );
    console.log('[Debug] 전체 rooms (삭제조건 없이):', JSON.stringify(debugRooms));

    const [cols] = await pool.execute(
      `SHOW COLUMNS FROM message_rooms`
    );
    console.log('[Debug] message_rooms 컬럼:', JSON.stringify(cols.map(c => c.Field)));

    const [rooms] = await pool.execute(
      `SELECT 
        mr.id,
        mr.post_id,
        mr.user1_id,
        mr.user2_id,
        mr.last_message,
        mr.last_message_at,
        mr.created_at,
        p.content AS post_content,
        CASE WHEN mr.user1_id = ? THEN u2.id   ELSE u1.id         END AS other_user_id,
        CASE WHEN mr.user1_id = ? THEN u2.name ELSE u1.name       END AS other_user_name,
        CASE WHEN mr.user1_id = ? THEN u2.color_id ELSE u1.color_id END AS other_user_color_id,
        (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.room_id = mr.id
            AND m.sender_id != ?
            AND m.is_read = FALSE
            AND (m.is_deleted IS NULL OR m.is_deleted = FALSE)
        ) AS unread_count
      FROM message_rooms mr
      LEFT JOIN posts  p  ON mr.post_id  = p.id
      LEFT JOIN users u1  ON mr.user1_id = u1.id
      LEFT JOIN users u2  ON mr.user2_id = u2.id
      WHERE (
        (mr.user1_id = ? AND (mr.is_deleted_by_user1 IS NULL OR mr.is_deleted_by_user1 = FALSE))
        OR
        (mr.user2_id = ? AND (mr.is_deleted_by_user2 IS NULL OR mr.is_deleted_by_user2 = FALSE))
      )
      ORDER BY mr.last_message_at DESC, mr.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [userId, userId, userId, userId, userId, userId]
    );
    console.log('[Messages] userId:', userId, '조회된 rooms 수:', rooms.length);
    console.log('[Messages] rooms 데이터:', JSON.stringify(rooms));

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) AS total FROM message_rooms mr
       WHERE (
         (mr.user1_id = ? AND (mr.is_deleted_by_user1 IS NULL OR mr.is_deleted_by_user1 = FALSE))
         OR
         (mr.user2_id = ? AND (mr.is_deleted_by_user2 IS NULL OR mr.is_deleted_by_user2 = FALSE))
       )`,
      [userId, userId]
    );
    const total = Number(countResult[0]?.total ?? 0);

    res.json({
      success: true,
      data: {
        rooms,
        pagination: {
          page: parseInt(page, 10),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error('채팅방 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '채팅방 목록 조회 중 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────────────
// 채팅방 생성
// ─────────────────────────────────────────────────────
router.post('/rooms', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId, otherUserId } = req.body;

    if (!postId || !otherUserId) {
      console.warn('[POST /api/messages/rooms] 잘못된 파라미터', {
        userId,
        postId,
        otherUserId,
      });
      return res.status(400).json({ success: false, message: '게시글 ID와 상대방 사용자 ID를 입력해주세요.' });
    }
    if (userId === parseInt(otherUserId)) {
      return res.status(400).json({ success: false, message: '자기 자신과는 채팅방을 생성할 수 없습니다.' });
    }

    console.log('[POST /api/messages/rooms] 채팅방 생성 요청', {
      userId,
      postId,
      otherUserId,
    });

    const [posts] = await pool.execute('SELECT id FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) {
      console.warn('[POST /api/messages/rooms] 게시글 없음', { postId });
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
    }

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND is_deleted = FALSE',
      [otherUserId]
    );
    if (users.length === 0) {
      console.warn('[POST /api/messages/rooms] 상대 사용자 없음/삭제됨', {
        otherUserId,
      });
      return res.status(404).json({ success: false, message: '상대방 사용자를 찾을 수 없습니다.' });
    }

    // 기존 채팅방 확인
    const [existingRooms] = await pool.execute(
      `SELECT id FROM message_rooms
       WHERE post_id = ?
         AND ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))`,
      [postId, userId, otherUserId, otherUserId, userId]
    );

    if (existingRooms.length > 0) {
      const [roomInfo] = await pool.execute(
        `SELECT id, post_id, user1_id, user2_id, last_message, last_message_at, created_at
         FROM message_rooms WHERE id = ?`,
        [existingRooms[0].id]
      );
      console.log('[POST /api/messages/rooms] 기존 채팅방 반환', {
        roomId: roomInfo[0]?.id,
        postId,
        userId,
        otherUserId,
      });
      return res.json({ success: true, message: '이미 존재하는 채팅방입니다.', data: roomInfo[0] });
    }

    const user1Id = userId < otherUserId ? userId : otherUserId;
    const user2Id = userId < otherUserId ? otherUserId : userId;

    const [result] = await pool.execute(
      'INSERT INTO message_rooms (post_id, user1_id, user2_id) VALUES (?, ?, ?)',
      [postId, user1Id, user2Id]
    );

    const [newRooms] = await pool.execute(
      `SELECT id, post_id, user1_id, user2_id, last_message, last_message_at, created_at
       FROM message_rooms WHERE id = ?`,
      [result.insertId]
    );

    console.log('[POST /api/messages/rooms] 새 채팅방 생성', {
      roomId: newRooms[0]?.id,
      postId,
      user1Id,
      user2Id,
    });

    res.status(201).json({ success: true, message: '채팅방이 생성되었습니다.', data: newRooms[0] });
  } catch (error) {
    console.error('채팅방 생성 오류:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '이미 존재하는 채팅방입니다.' });
    }
    res.status(500).json({ success: false, message: '채팅방 생성 중 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────────────
// 채팅 내역 조회
// ─────────────────────────────────────────────────────
router.get('/rooms/:roomId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    const [rooms] = await pool.execute(
      `SELECT id, user1_id, user2_id, post_id FROM message_rooms
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [roomId, userId, userId]
    );
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: '채팅방을 찾을 수 없거나 접근 권한이 없습니다.' });
    }

    const [roomInfo] = await pool.execute(
      `SELECT
        mr.id, mr.post_id, mr.user1_id, mr.user2_id,
        mr.deleted_at_msg_id_user1, mr.deleted_at_msg_id_user2,
        mr.last_message, mr.last_message_at, mr.created_at,
        p.content AS post_content,
        CASE WHEN mr.user1_id = ? THEN u2.id       ELSE u1.id       END AS other_user_id,
        CASE WHEN mr.user1_id = ? THEN u2.name     ELSE u1.name     END AS other_user_name,
        CASE WHEN mr.user1_id = ? THEN u2.color_id ELSE u1.color_id END AS other_user_color_id
      FROM message_rooms mr
      LEFT JOIN posts  p  ON mr.post_id  = p.id
      LEFT JOIN users u1  ON mr.user1_id = u1.id
      LEFT JOIN users u2  ON mr.user2_id = u2.id
      WHERE mr.id = ?`,
      [userId, userId, userId, roomId]
    );

    const [roomMeta] = await pool.execute(
      `SELECT user1_id, user2_id,
        deleted_at_msg_id_user1,
        deleted_at_msg_id_user2
       FROM message_rooms WHERE id = ?`,
      [roomId]
    );
    const roomData = roomMeta[0];
    const isUser1 = roomData?.user1_id === userId;
    const deletedAtMsgId = isUser1
      ? (roomData?.deleted_at_msg_id_user1 ?? 0)
      : (roomData?.deleted_at_msg_id_user2 ?? 0);

    // 입장 시점에 deleted_at_msg_id 리셋
    if (isUser1 && roomData?.deleted_at_msg_id_user1 !== null) {
      await pool.execute(
        'UPDATE message_rooms SET deleted_at_msg_id_user1 = NULL WHERE id = ?',
        [roomId]
      );
    } else if (!isUser1 && roomData?.deleted_at_msg_id_user2 !== null) {
      await pool.execute(
        'UPDATE message_rooms SET deleted_at_msg_id_user2 = NULL WHERE id = ?',
        [roomId]
      );
    }
    console.log('[GetRoom] userId:', userId, 'isUser1:', isUser1);
    console.log('[GetRoom] roomData:', JSON.stringify(roomData));
    console.log('[GetRoom] deletedAtMsgId:', deletedAtMsgId);
    console.log('[GetRoom] 조회 쿼리 조건: m.id >', deletedAtMsgId);

    const [messages] = await pool.execute(
      `SELECT
        m.id, m.room_id, m.sender_id, m.content, m.is_read, m.is_deleted, m.created_at,
        u.name AS sender_name, u.color_id AS sender_color_id
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.room_id = ?
         AND m.id > ${deletedAtMsgId}
       ORDER BY m.created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [roomId]
    );

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) AS total FROM messages WHERE room_id = ? AND id > ?',
      [roomId, deletedAtMsgId]
    );
    const total = Number(countResult[0]?.total ?? 0);

    messages.reverse(); // 오래된 순으로 정렬

    res.json({
      success: true,
      data: {
        room: roomInfo[0],
        messages,
        pagination: {
          page: parseInt(page, 10),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error('채팅 내역 조회 오류:', error);
    res.status(500).json({ success: false, message: '채팅 내역 조회 중 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────────────
// 쪽지 보내기
// [변경] 1) 상대방에게 Socket.io로 new_message emit
//        2) createNotification → enqueueNotification (큐 위임)
// ─────────────────────────────────────────────────────
router.post('/rooms/:roomId/messages', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: '메시지 내용을 입력해주세요.' });
    }

    const [rooms] = await pool.execute(
      `SELECT id, user1_id, user2_id FROM message_rooms
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [roomId, userId, userId]
    );
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: '채팅방을 찾을 수 없거나 접근 권한이 없습니다.' });
    }

    const room = rooms[0];
    const otherUserId = room.user1_id === userId ? room.user2_id : room.user1_id;
    const trimmedContent = content.trim();

    // ── 메시지 저장 ─────────────────────────────
    const now = getNowForDB();
    const [result] = await pool.execute(
      `INSERT INTO messages (room_id, sender_id, content, created_at) VALUES (?, ?, ?, ?)`,
      [roomId, userId, trimmedContent, now]
    );

    // 메시지 전송 시 상대방의 "채팅방 삭제 상태"를 복구
    await pool.execute(
      `UPDATE message_rooms
       SET
         is_deleted_by_user1 = IF(user2_id = ?, FALSE, is_deleted_by_user1),
         is_deleted_by_user2 = IF(user1_id = ?, FALSE, is_deleted_by_user2)
       WHERE id = ?`,
      [userId, userId, roomId]
    );

    // ── 채팅방 last_message 갱신 ────────────────
    await pool.execute(
      `UPDATE message_rooms SET last_message = ?, last_message_at = ? WHERE id = ?`,
      [trimmedContent.substring(0, 100), now, roomId]
    );

    // ── 저장된 메시지 조회 ──────────────────────
    const [messages] = await pool.execute(
      `SELECT
        m.id, m.room_id, m.sender_id, m.content, m.is_read, m.is_deleted, m.created_at,
        u.name AS sender_name, u.color_id AS sender_color_id
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [result.insertId]
    );
    const savedMessage = messages[0];

    // ── [변경] 상대방에게 소켓으로 즉시 push ────
    // room:${roomId} 룸에 속한 모든 소켓에 emit
    // → 상대방이 채팅방을 열고 있으면 8초 폴링 없이 즉시 수신
    emitNewMessage(roomId, savedMessage);

    // ── [변경] 알림을 큐에 위임 (비동기, fire-and-forget) ──
    // createNotification을 직접 await 하지 않으므로
    // 알림 서버 장애 시에도 메시지 전송 자체는 성공으로 응답
    if (otherUserId && otherUserId !== userId) {
      await enqueueNotification({
        userId: otherUserId,
        type: 'mail',
        category: 'mail',
        title: '새로운 쪽지가 도착했습니다',
        body: trimmedContent.slice(0, 80),
        relatedType: 'message_room',
        relatedId: roomId,
      });
    }

    // ── 응답 반환 ───────────────────────────────
    res.status(201).json({
      success: true,
      message: '메시지가 전송되었습니다.',
      data: savedMessage,
    });
  } catch (error) {
    console.error('쪽지 보내기 오류:', error);
    res.status(500).json({ success: false, message: '메시지 전송 중 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────────────
// 메시지 읽음 처리
// [변경] 읽음 처리 후 메시지를 보낸 사람에게 read_receipt emit
// ─────────────────────────────────────────────────────
router.put('/rooms/:roomId/read', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;

    const [rooms] = await pool.execute(
      `SELECT id, user1_id, user2_id FROM message_rooms
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [roomId, userId, userId]
    );
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: '채팅방을 찾을 수 없거나 접근 권한이 없습니다.' });
    }

    const room = rooms[0];
    const otherUserId = room.user1_id === userId ? room.user2_id : room.user1_id;

    // 상대방이 보낸 미읽음 메시지 읽음 처리
    const [result] = await pool.execute(
      `UPDATE messages SET is_read = TRUE
       WHERE room_id = ? AND sender_id != ? AND is_read = FALSE`,
      [roomId, userId]
    );

    // ── [변경] 내가 읽었음을 메시지 발신자에게 소켓 push ──
    // 상대방의 채팅 화면에서 '1' 안읽음 표시가 즉시 사라짐
    if (result.affectedRows > 0 && otherUserId) {
      emitReadReceipt(otherUserId, roomId);
    }

    res.json({
      success: true,
      message: '메시지가 읽음 처리되었습니다.',
      data: { updatedCount: result.affectedRows },
    });
  } catch (error) {
    console.error('메시지 읽음 처리 오류:', error);
    res.status(500).json({ success: false, message: '메시지 읽음 처리 중 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────────────
// 읽지 않은 메시지 수 조회 (변경 없음)
// ─────────────────────────────────────────────────────
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [result] = await pool.execute(
      `SELECT COUNT(*) AS total_unread
       FROM messages m
       INNER JOIN message_rooms mr ON m.room_id = mr.id
       WHERE (
         (mr.user1_id = ? AND (mr.is_deleted_by_user1 IS NULL OR mr.is_deleted_by_user1 = FALSE))
         OR
         (mr.user2_id = ? AND (mr.is_deleted_by_user2 IS NULL OR mr.is_deleted_by_user2 = FALSE))
       )
         AND m.sender_id != ?
         AND m.is_read = FALSE
         AND (m.is_deleted IS NULL OR m.is_deleted = FALSE)`,
      [userId, userId, userId]
    );

    const [roomCounts] = await pool.execute(
      `SELECT mr.id AS room_id, COUNT(m.id) AS unread_count
       FROM message_rooms mr
       LEFT JOIN messages m ON m.room_id = mr.id
         AND m.sender_id != ?
         AND m.is_read = FALSE
         AND (m.is_deleted IS NULL OR m.is_deleted = FALSE)
       WHERE (
         (mr.user1_id = ? AND (mr.is_deleted_by_user1 IS NULL OR mr.is_deleted_by_user1 = FALSE))
         OR
         (mr.user2_id = ? AND (mr.is_deleted_by_user2 IS NULL OR mr.is_deleted_by_user2 = FALSE))
       )
       GROUP BY mr.id
       HAVING unread_count > 0`,
      [userId, userId, userId]
    );

    res.json({
      success: true,
      data: {
        totalUnread: result[0].total_unread,
        roomCounts: roomCounts.map((rc) => ({ roomId: rc.room_id, unreadCount: rc.unread_count })),
      },
    });
  } catch (error) {
    console.error('읽지 않은 메시지 수 조회 오류:', error);
    res.status(500).json({ success: false, message: '읽지 않은 메시지 수 조회 중 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────────────
// 채팅방 나가기 (소프트 삭제: 내 쪽에서만 목록에서 숨김)
// ─────────────────────────────────────────────────────
router.delete('/rooms/:roomId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;

    const [rooms] = await pool.execute(
      `SELECT id FROM message_rooms WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [roomId, userId, userId]
    );
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: '채팅방을 찾을 수 없거나 접근 권한이 없습니다.' });
    }

    const [lastMsg] = await pool.execute(
      'SELECT MAX(id) as last_id FROM messages WHERE room_id = ?',
      [roomId]
    );
    const lastMsgId = lastMsg[0]?.last_id ?? 0;
    console.log('[Delete Room] userId:', userId, 'roomId:', roomId, 'lastMsgId:', lastMsgId);

    await pool.execute(
      `UPDATE message_rooms SET
        is_deleted_by_user1 = IF(user1_id = ?, TRUE, is_deleted_by_user1),
        is_deleted_by_user2 = IF(user2_id = ?, TRUE, is_deleted_by_user2),
        deleted_at_msg_id_user1 = IF(user1_id = ?, ?, deleted_at_msg_id_user1),
        deleted_at_msg_id_user2 = IF(user2_id = ?, ?, deleted_at_msg_id_user2)
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [userId, userId, userId, lastMsgId, userId, lastMsgId, roomId, userId, userId]
    );
    const [check] = await pool.execute(
      'SELECT is_deleted_by_user1, is_deleted_by_user2, deleted_at_msg_id_user1, deleted_at_msg_id_user2 FROM message_rooms WHERE id = ?',
      [roomId]
    );
    console.log('[Delete Room] 저장 결과:', JSON.stringify(check[0]));

    res.json({ success: true, message: '채팅방이 삭제되었습니다.' });
  } catch (error) {
    console.error('채팅방 삭제 오류:', error);
    res.status(500).json({ success: false, message: '채팅방 삭제 중 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────────────
// 내 메시지 삭제 (소프트 삭제)
// ─────────────────────────────────────────────────────
router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { messageId } = req.params;

    const [updateResult] = await pool.execute(
      `UPDATE messages SET is_deleted = TRUE
       WHERE id = ? AND sender_id = ? AND (is_deleted IS NULL OR is_deleted = FALSE)`,
      [messageId, userId]
    );

    if (!updateResult.affectedRows) {
      return res.status(404).json({
        success: false,
        message: '메시지를 찾을 수 없거나 삭제 권한이 없습니다.',
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('메시지 삭제 오류:', error);
    res.status(500).json({ success: false, message: '메시지 삭제 중 오류가 발생했습니다.' });
  }
});

export default router;
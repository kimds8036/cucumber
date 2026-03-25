/**
 * socketServer.js
 *
 * Socket.io 서버 초기화 및 이벤트 핸들러
 *
 * ┌─────────────────────────────────────────┐
 * │  연결 흐름                               │
 * │  클라이언트 connect                      │
 * │    → JWT 검증 (미들웨어)                 │
 * │    → 유저별 개인 룸 입장 (user:{id})     │
 * │    → 채팅방 룸 입장 (room:{roomId})     │
 * └─────────────────────────────────────────┘
 *
 * 사용법: app.js(또는 server.js)에서 아래처럼 초기화
 *   import { createServer } from 'http';
 *   import { initSocketServer } from './socketServer.js';
 *   const httpServer = createServer(app);
 *   initSocketServer(httpServer);
 *   httpServer.listen(PORT);
 */

import { Server } from 'socket.io';
import pool from './config/database.js';
import { verifyToken } from './utils/auth.js';
import { registerFriendEvents } from './socket/friendEvents.js';

/** @type {import('socket.io').Server | null} */
let io = null;

/**
 * Socket.io 서버 초기화
 * @param {import('http').Server} httpServer
 */
export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
    // 연결이 일시적으로 끊겼을 때 재연결 전까지 상태 유지 (초)
    connectionStateRecovery: { maxDisconnectionDuration: 30 * 1000 },
  });

  // ── 인증 미들웨어 ──────────────────────────────
  io.use((socket, next) => {
    // 클라이언트는 handshake.auth.token 또는 쿼리스트링 token 으로 JWT 전달
    const fromAuth = socket.handshake.auth?.token;
    const fromQuery = socket.handshake.query?.token;
    const token = fromAuth || fromQuery;

    console.log('[Socket] handshake token info', {
      hasAuth: !!fromAuth,
      hasQuery: !!fromQuery,
      hasToken: !!token,
    });

    if (!token) return next(new Error('인증 토큰이 필요합니다.'));

    const decoded = verifyToken(token);
    if (!decoded) {
      console.warn('[Socket] auth failed: verifyToken returned null');
      return next(new Error('토큰이 만료되었거나 유효하지 않습니다.'));
    }

    socket.userId = decoded.userId;   // 이후 핸들러에서 socket.userId 로 접근
    console.log('[Socket] auth success', { userId: socket.userId });
    next();
  });

  // ── 연결 이벤트 ───────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`[Socket] 연결: userId=${userId}, socketId=${socket.id}`);

    // 유저별 개인 룸 (서버→특정유저 push 용)
    socket.join(`user:${userId}`);

    // ── 친구/타이머 관련 실시간 이벤트 등록 ──
    registerFriendEvents(socket);

    // ── 채팅방 입장 ─────────────────────────────
    socket.on('join_room', async ({ roomId }) => {
      if (!roomId) return;

      // 권한 확인: 실제로 이 룸의 참여자인지 DB 검증
      try {
        const [rows] = await pool.execute(
          `SELECT id FROM message_rooms
           WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
          [roomId, userId, userId]
        );
        if (rows.length === 0) {
          socket.emit('error', { message: '채팅방 접근 권한이 없습니다.' });
          return;
        }
      } catch (err) {
        console.error('[Socket] join_room DB 오류:', err);
        return;
      }

      socket.join(`room:${roomId}`);
      console.log(`[Socket] userId=${userId} → room:${roomId} 입장`);
    });

    // ── 채팅방 퇴장 ─────────────────────────────
    socket.on('leave_room', ({ roomId }) => {
      if (!roomId) return;
      socket.leave(`room:${roomId}`);
      console.log(`[Socket] userId=${userId} → room:${roomId} 퇴장`);
    });

    // ── 타이핑 이벤트(상대방 표시) ────────────────
    socket.on('typing_start', ({ roomId, userId: typingUserId, userName }) => {
      if (!roomId) return;
      socket.to(`room:${roomId}`).emit('user_typing', {
        userId: typingUserId,
        userName: userName ?? '익명',
      });
    });

    socket.on('typing_stop', ({ roomId, userId: typingUserId }) => {
      if (!roomId) return;
      socket.to(`room:${roomId}`).emit('user_stop_typing', {
        userId: typingUserId,
      });
    });

    // ── 연결 해제 ───────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] 연결 해제: userId=${userId}, reason=${reason}`);
    });
  });

  console.log('[Socket] Socket.io 서버 초기화 완료');
  return io;
}

/**
 * 특정 채팅방의 모든 소켓에 새 메시지 push
 * @param {number|string} roomId
 * @param {object}        message  - DB에서 조회한 메시지 행
 */
export function emitNewMessage(roomId, message) {
  if (!io) return;
  io.to(`room:${roomId}`).emit('new_message', {
    type: 'new_message',
    message,
  });
}

/**
 * 특정 유저에게만 읽음 수신 확인 push
 * (메시지를 보낸 사람에게 "상대가 읽었다"는 신호 전달)
 * @param {number|string} targetUserId  메시지를 보낸 사람
 * @param {number|string} roomId
 */
export function emitReadReceipt(targetUserId, roomId) {
  if (!io) return;
  io.to(`user:${targetUserId}`).emit('read_receipt', {
    type: 'read_receipt',
    roomId,
  });
}

/**
 * 특정 유저에게 알림(Notification) push
 * - DB에 알림이 생성된 직후, 헤더 빨간 점/알림 리스트를 즉시 깨우는 용도
 * @param {number|string} targetUserId
 * @param {object}        payload      { type, category, title, body, relatedType, relatedId }
 */
export function emitNotification(targetUserId, payload) {
  if (!io) {
    console.warn('[Socket] emitNotification 호출됐지만 io 인스턴스가 없습니다.', {
      targetUserId,
      payloadType: payload?.type,
    });
    return;
  }

  const roomName = `user:${targetUserId}`;
  const room = io.sockets.adapter?.rooms?.get(roomName);
  const socketCount = room ? room.size : 0;

  console.log('[Socket][emitNotification] 수신자에게 notification 전송', {
    targetUserId,
    roomName,
    socketCount: socketCount > 0 ? socketCount : '(해당 유저 소켓 없음)',
    payloadType: payload?.type,
    category: payload?.category,
    relatedType: payload?.relatedType,
    relatedId: payload?.relatedId,
  });

  if (payload?.type === 'friend_request') {
    console.log('[Socket][FriendRequest] friend_request 이벤트 emit → user:%s', targetUserId);
  }

  io.to(roomName).emit('notification', {
    type: 'notification',
    ...payload,
  });

  console.log('[Socket][emitNotification] emit 완료', { targetUserId, payloadType: payload?.type });
}

/** io 인스턴스 직접 접근이 필요한 경우 */
export function getIO() {
  return io;
}
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
import { getReverificationBlockCode } from './services/reverification.service.js';

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
  io.use(async (socket, next) => {
    const fromAuth = socket.handshake.auth?.token;
    const fromQuery = socket.handshake.query?.token;
    const token = fromAuth || fromQuery;

    console.log('[Socket] handshake token info', {
      hasAuth: !!fromAuth,
      hasQuery: !!fromQuery,
      hasToken: !!token,
    });

    if (!token) {
      const err = new Error('인증 토큰이 필요합니다.');
      err.data = { code: 'AUTH_FAILED' };
      return next(err);
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (verifyErr) {
      const code = verifyErr?.code === 'TOKEN_EXPIRED' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
      console.warn('[Socket] auth failed:', code);
      const err = new Error(
        code === 'TOKEN_EXPIRED' ? '토큰이 만료되었습니다.' : '유효하지 않은 토큰입니다.',
      );
      err.data = { code };
      return next(err);
    }

    try {
      const [rows] = await pool.execute(
        `SELECT token_version, is_banned, is_suspended, suspended_until, reverification_status
         FROM users WHERE id = ? AND is_deleted = FALSE LIMIT 1`,
        [decoded.userId],
      );
      if (rows.length === 0) {
        const err = new Error('사용자를 찾을 수 없습니다.');
        err.data = { code: 'AUTH_FAILED' };
        return next(err);
      }

      const row = rows[0];
      const tokenTv = Number(decoded.tv ?? 0);
      const dbTv = Number(row.token_version ?? 0);
      if (tokenTv !== dbTv) {
        const err = new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
        err.data = { code: 'SESSION_REVOKED' };
        return next(err);
      }

      if (row.is_banned) {
        const err = new Error('영구 정지된 계정입니다.');
        err.data = { code: 'ACCOUNT_BANNED' };
        return next(err);
      }

      if (row.is_suspended) {
        const until = row.suspended_until ? new Date(row.suspended_until) : null;
        if (!until || until > new Date()) {
          const err = new Error('임시 정지된 계정입니다.');
          err.data = { code: 'ACCOUNT_SUSPENDED' };
          return next(err);
        }
      }

      const revCode = getReverificationBlockCode(row.reverification_status);
      if (revCode) {
        const messages = {
          GRADUATED_BLOCKED: '졸업생은 서비스를 이용할 수 없습니다.',
          ADULT_BLOCKED: '성인은 서비스를 이용할 수 없습니다.',
          REVERIFICATION_RESTRICTED: '재인증이 필요합니다.',
        };
        const err = new Error(messages[revCode] || '서비스 이용이 제한되었습니다.');
        err.data = { code: revCode };
        return next(err);
      }

      socket.userId = decoded.userId;
      console.log('[Socket] auth success', { userId: socket.userId });
      next();
    } catch (dbErr) {
      console.error('[Socket] auth DB 오류:', dbErr);
      const err = new Error('인증 확인 중 오류가 발생했습니다.');
      err.data = { code: 'AUTH_FAILED' };
      next(err);
    }
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
      console.log('[Socket][join_room] 요청', {
        socketId: socket.id,
        socketUserId: userId,
        roomId,
      });
      if (!roomId) return;

      // 권한 확인: 실제로 이 룸의 참여자인지 DB 검증
      try {
        const [msgRows] = await pool.execute(
          `SELECT id FROM message_rooms
           WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
          [roomId, userId, userId],
        );
        const [dmRows] = await pool.execute(
          `SELECT id FROM dm_rooms
           WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
          [roomId, userId, userId],
        );
        if (msgRows.length === 0 && dmRows.length === 0) {
          console.warn('[Socket][join_room] 권한 없음', {
            socketId: socket.id,
            socketUserId: userId,
            roomId,
          });
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
      console.log('[Socket][leave_room] 퇴장', {
        socketId: socket.id,
        socketUserId: userId,
        roomId,
      });
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
export function emitNewMessage(roomId, message, options = {}) {
  if (!io) return;
  const roomType =
    options.roomType === 'dm' || options.roomType === 'message'
      ? options.roomType
      : 'message';
  io.to(`room:${roomId}`).emit('new_message', {
    type: 'new_message',
    roomType,
    message: message ? { ...message, room_type: roomType } : message,
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
  console.log('[Socket][emitReadReceipt] emit', {
    targetUserId,
    roomId,
  });
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

/**
 * 특정 유저가 특정 room:{roomId}에 현재 접속 중인지 확인
 * @param {number|string} roomId
 * @param {number|string} userId
 */
export function isUserInRoom(roomId, userId) {
  if (!io || roomId == null || userId == null) return false;
  const roomName = `room:${roomId}`;
  const room = io.sockets.adapter?.rooms?.get(roomName);
  if (!room || room.size === 0) return false;

  const targetId = String(userId);
  for (const socketId of room) {
    const s = io.sockets.sockets.get(socketId);
    if (s && String(s.userId) === targetId) return true;
  }
  return false;
}

/**
 * 세션 무효화 실시간 알림 (ban/suspend·token_version 증가 등)
 * @param {number|string} targetUserId
 * @param {{ code?: string, message?: string }} payload
 */
export function emitSessionRevoked(targetUserId, payload = {}) {
  if (!io) {
    console.warn('[Socket] emitSessionRevoked 호출됐지만 io 인스턴스가 없습니다.', {
      targetUserId,
      code: payload?.code,
    });
    return;
  }

  const roomName = `user:${targetUserId}`;
  const room = io.sockets.adapter?.rooms?.get(roomName);
  const socketCount = room ? room.size : 0;

  console.log('[Socket][emitSessionRevoked]', {
    targetUserId,
    roomName,
    socketCount: socketCount > 0 ? socketCount : '(해당 유저 소켓 없음)',
    code: payload?.code,
  });

  io.to(roomName).emit('session_revoked', {
    type: 'session_revoked',
    code: payload.code || 'SESSION_REVOKED',
    message: payload.message || '세션이 만료되었습니다. 다시 로그인해주세요.',
  });
}

/** io 인스턴스 직접 접근이 필요한 경우 */
export function getIO() {
  return io;
}
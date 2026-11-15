/**
 * 스터디 카페(snowmap 3D) 실시간 이벤트.
 *
 * 클라이언트 → 서버
 *   cafe:join   { roomId?, gender, state? }  (ack) 방 입장. 방은 서버가 최종 결정
 *   cafe:leave
 *   cafe:state  { x, y, z, yaw, anim, seatId, gender }  위치·애니·자리 (초당 10회 정도)
 *   cafe:chat   { text }                     (ack)
 *   cafe:rooms                                (ack) 방 목록·인원
 *   cafe:block  { userId }                   (ack) 차단 (user_blocks, 친구 관계 해제)
 *   cafe:report { userId, reason }           (ack) 사용자 신고 (최근 채팅을 근거로 붙임)
 *
 * 서버 → 클라이언트
 *   cafe:player:state  PlayerState   (처음 받으면 입장으로 처리)
 *   cafe:player:leave  { userId }
 *   cafe:chat          ChatMessage
 *   cafe:seat:denied   { seatId, occupantId }  다른 사람이 먼저 앉은 자리
 *   cafe:stroke        { boardId, stroke }      방명록 획 추가 (REST로 저장된 뒤)
 *   cafe:stroke:remove { boardId, strokeIds }
 *   cafe:kicked        { reason }               같은 계정이 다른 곳에서 입장
 */

import pool from '../config/database.js';
import { getIO } from '../socketServer.js';
import { submitContentReport } from '../services/reportSubmission.service.js';
import {
  CAFE_CHAT_COOLDOWN_MS,
  CAFE_CHAT_HISTORY_ON_JOIN,
  CAFE_CHAT_MAX_LENGTH,
  CAFE_ROOM_CAPACITY,
  addPlayerToRoom,
  cafeSocketRoom,
  canViewerSee,
  claimCafeSeat,
  getCafeRoom,
  getCafeRoomPlayer,
  getUserCafeRoomId,
  listCafeRooms,
  loadCafeBlockSet,
  loadCafeProfile,
  pickCafeRoom,
  publicPlayerState,
  publicStroke,
  pushCafeChat,
  recentChatOf,
  removePlayerFromRoom,
  sanitizeCafeState,
} from '../services/studyCafe.service.js';

/** 위치 메시지 최소 간격(ms). 이보다 자주 오면 버린다 */
const STATE_MIN_INTERVAL_MS = 40;

function ackOf(fn) {
  return typeof fn === 'function' ? fn : () => {};
}

/**
 * 방 안 소켓에게 하나씩 보낸다. author가 있으면 차단·섀도우 뮤트를 거른다.
 * @param {import('socket.io').Server} io
 */
function emitToCafeRoom(io, roomId, event, payload, { author = null, excludeSocketId = null } = {}) {
  if (!io) return;
  const ids = io.sockets.adapter.rooms.get(cafeSocketRoom(roomId));
  if (!ids) return;
  for (const id of ids) {
    if (id === excludeSocketId) continue;
    const s = io.sockets.sockets.get(id);
    const viewer = s?.data?.cafe;
    if (!viewer) continue;
    if (author && !canViewerSee(viewer, author)) continue;
    s.emit(event, payload);
  }
}

function socketOfPlayer(io, player) {
  if (!io || !player?.socketId) return null;
  return io.sockets.sockets.get(player.socketId) || null;
}

/** 방명록 획 추가를 방 사람들에게 알린다 (routes/studyCafe.js에서 호출) */
export function emitCafeStrokeAdded(roomId, stroke) {
  emitToCafeRoom(
    getIO(),
    roomId,
    'cafe:stroke',
    { boardId: stroke.boardId, stroke: publicStroke(stroke) },
    { author: { userId: stroke.authorId, shadowMuted: stroke.authorShadowMuted } },
  );
}

export function emitCafeStrokesRemoved(roomId, boardId, strokeIds) {
  if (!strokeIds?.length) return;
  emitToCafeRoom(getIO(), roomId, 'cafe:stroke:remove', {
    boardId,
    strokeIds: strokeIds.map(String),
  });
}

/**
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
export function registerStudyCafeEvents(socket, io) {
  const userId = String(socket.userId);

  function leaveCafe() {
    const data = socket.data.cafe;
    if (!data) return;
    socket.data.cafe = null;
    socket.leave(cafeSocketRoom(data.roomId));
    const player = getCafeRoomPlayer(data.roomId, userId);
    // 같은 계정이 다른 소켓으로 다시 들어온 경우 새 소켓 것은 지우지 않는다
    if (!player || player.socketId !== socket.id) return;
    removePlayerFromRoom(data.roomId, userId);
    emitToCafeRoom(io, data.roomId, 'cafe:player:leave', { userId });
  }

  function applyState(raw, { broadcast = true } = {}) {
    const data = socket.data.cafe;
    if (!data) return;
    const room = getCafeRoom(data.roomId);
    const player = room?.players.get(userId);
    if (!room || !player || player.socketId !== socket.id) return;
    const state = sanitizeCafeState(raw);
    if (!state) return;
    if (raw?.gender === 'girl' || raw?.gender === 'boy') player.gender = raw.gender;

    const seat = claimCafeSeat(room, userId, state.seatId);
    if (seat.denied) {
      socket.emit('cafe:seat:denied', { seatId: seat.denied, occupantId: seat.occupantId });
    }
    player.state = { ...state, seatId: seat.seatId, t: Date.now() };
    if (broadcast) {
      emitToCafeRoom(io, room.id, 'cafe:player:state', publicPlayerState(player), {
        author: player,
        excludeSocketId: socket.id,
      });
    }
  }

  socket.on('cafe:join', async (payload = {}, ack) => {
    const reply = ackOf(ack);
    try {
      const profile = await loadCafeProfile(userId);
      if (!profile) {
        reply({ ok: false, error: 'user_not_found' });
        return;
      }
      const blocked = await loadCafeBlockSet(userId);

      // 이 소켓이 이미 다른 방에 있으면 먼저 나간다
      leaveCafe();

      // 같은 계정이 다른 소켓(다른 폰·새로고침 전 화면)으로 카페에 있으면 그쪽을 내보낸다
      const prevRoomId = getUserCafeRoomId(userId);
      if (prevRoomId) {
        const prevPlayer = getCafeRoomPlayer(prevRoomId, userId);
        const prevSocket = socketOfPlayer(io, prevPlayer);
        if (prevSocket && prevSocket.id !== socket.id) {
          prevSocket.emit('cafe:kicked', { reason: 'duplicate' });
          prevSocket.leave(cafeSocketRoom(prevRoomId));
          prevSocket.data.cafe = null;
        }
        removePlayerFromRoom(prevRoomId, userId);
        emitToCafeRoom(io, prevRoomId, 'cafe:player:leave', { userId });
      }

      const room = pickCafeRoom(payload.roomId, userId);
      if (!room) {
        reply({ ok: false, error: 'full', message: '모든 방이 가득 찼어요.' });
        return;
      }

      addPlayerToRoom(room, profile, { socketId: socket.id, gender: payload.gender });
      socket.join(cafeSocketRoom(room.id));
      socket.data.cafe = { roomId: room.id, userId, blocked, lastStateAt: 0 };

      if (payload.state) applyState({ ...payload.state, gender: payload.gender });

      const viewer = socket.data.cafe;
      const players = [];
      for (const other of room.players.values()) {
        if (other.userId === userId || !other.state) continue;
        if (!canViewerSee(viewer, other)) continue;
        players.push(publicPlayerState(other));
      }
      const chat = room.chat
        .filter((m) => canViewerSee(viewer, { userId: m.userId, shadowMuted: m.shadowMuted }))
        .slice(-CAFE_CHAT_HISTORY_ON_JOIN)
        .map(({ shadowMuted: _m, ...m }) => m);

      reply({
        ok: true,
        room: { id: room.id, name: room.name, index: room.index, capacity: CAFE_ROOM_CAPACITY },
        me: {
          userId,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
        },
        players,
        chat,
      });
    } catch (err) {
      console.error('[StudyCafe] join 오류:', err);
      reply({ ok: false, error: 'join_failed' });
    }
  });

  socket.on('cafe:leave', () => {
    leaveCafe();
  });

  socket.on('cafe:state', (raw) => {
    const data = socket.data.cafe;
    if (!data) return;
    const now = Date.now();
    if (now - data.lastStateAt < STATE_MIN_INTERVAL_MS) return;
    data.lastStateAt = now;
    applyState(raw);
  });

  socket.on('cafe:chat', (payload = {}, ack) => {
    const reply = ackOf(ack);
    const data = socket.data.cafe;
    const room = data ? getCafeRoom(data.roomId) : null;
    const player = room?.players.get(userId);
    if (!room || !player) {
      reply({ ok: false, error: 'not_in_room' });
      return;
    }
    const text = String(payload.text ?? '').replace(/\s+/g, ' ').trim();
    if (!text) {
      reply({ ok: false, error: 'empty' });
      return;
    }
    if (text.length > CAFE_CHAT_MAX_LENGTH) {
      reply({ ok: false, error: 'too_long' });
      return;
    }
    const now = Date.now();
    if (now - player.lastChatAt < CAFE_CHAT_COOLDOWN_MS) {
      reply({ ok: false, error: 'cooldown' });
      return;
    }
    player.lastChatAt = now;
    const message = {
      id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      displayName: player.displayName,
      text,
      createdAt: new Date(now).toISOString(),
    };
    pushCafeChat(room, { ...message, shadowMuted: player.shadowMuted });
    emitToCafeRoom(io, room.id, 'cafe:chat', message, { author: player });
    reply({ ok: true, message });
  });

  socket.on('cafe:rooms', (_payload, ack) => {
    ackOf(typeof _payload === 'function' ? _payload : ack)({
      ok: true,
      rooms: listCafeRooms(userId),
    });
  });

  socket.on('cafe:block', async (payload = {}, ack) => {
    const reply = ackOf(ack);
    const targetId = String(Number(payload.userId) || '');
    if (!targetId || targetId === userId) {
      reply({ ok: false, error: 'invalid_target' });
      return;
    }
    try {
      await pool.execute(
        `INSERT INTO user_blocks (user_id, blocked_user_id, reason)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
        [userId, targetId, '스터디 카페에서 차단'],
      );
      await pool.execute(
        `DELETE FROM user_friendships
         WHERE (requester_id = ? AND addressee_id = ?)
            OR (requester_id = ? AND addressee_id = ?)`,
        [userId, targetId, targetId, userId],
      );

      // 이미 열린 화면에도 바로 반영 (양쪽 모두 서로 안 보이게)
      socket.data.cafe?.blocked?.add(targetId);
      const targetRoomId = getUserCafeRoomId(targetId);
      const targetPlayer = targetRoomId ? getCafeRoomPlayer(targetRoomId, targetId) : null;
      const targetSocket = socketOfPlayer(io, targetPlayer);
      targetSocket?.data?.cafe?.blocked?.add(userId);
      if (targetRoomId && targetRoomId === socket.data.cafe?.roomId) {
        socket.emit('cafe:player:leave', { userId: targetId });
        targetSocket?.emit('cafe:player:leave', { userId });
      }
      reply({ ok: true });
    } catch (err) {
      console.error('[StudyCafe] block 오류:', err);
      reply({ ok: false, error: 'block_failed', message: '차단하지 못했어요.' });
    }
  });

  socket.on('cafe:report', async (payload = {}, ack) => {
    const reply = ackOf(ack);
    const targetId = String(Number(payload.userId) || '');
    if (!targetId || targetId === userId) {
      reply({ ok: false, error: 'invalid_target' });
      return;
    }
    const reason = String(payload.reason || '스터디 카페 부적절한 행동').slice(0, 100);
    const roomId = socket.data.cafe?.roomId || null;
    const room = roomId ? getCafeRoom(roomId) : null;
    const lines = room ? recentChatOf(room, targetId) : [];
    const description = [
      `[스터디 카페 ${room?.name || '-'}]`,
      lines.length
        ? `최근 채팅:\n${lines.map((m) => `- ${m.text}`).join('\n')}`
        : '최근 채팅 없음',
    ].join('\n');
    try {
      const result = await submitContentReport({
        reporterId: Number(userId),
        targetType: 'user',
        targetId: Number(targetId),
        reason,
        description,
        options: {
          forbidSelfReport: true,
          targetExistsCheck: {
            notFoundMessage: '사용자를 찾을 수 없습니다.',
            check: async (db) => {
              const [rows] = await db.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [
                targetId,
              ]);
              return rows.length > 0;
            },
          },
        },
      });
      reply({
        ok: result.httpStatus < 300,
        code: result.body?.code || null,
        message: result.body?.message || null,
      });
    } catch (err) {
      console.error('[StudyCafe] report 오류:', err);
      reply({ ok: false, error: 'report_failed', message: '신고하지 못했어요.' });
    }
  });

  socket.on('disconnect', () => {
    leaveCafe();
  });
}

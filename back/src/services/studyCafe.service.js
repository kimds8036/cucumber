/**
 * 스터디 카페(snowmap 3D) 서버 상태.
 *
 * - 방·자리·최근 채팅은 서버 메모리에 둔다 (훈민정음 멀티와 같은 방식, 서버 인스턴스 1대 기준).
 * - 방명록 획은 DB(study_cafe_strokes)에 저장한다.
 * - 차단(user_blocks, 양방향)과 섀도우 뮤트(users.is_shadow_muted)는 보내기 전에 받는 사람마다 거른다.
 */

import pool from '../config/database.js';

export const CAFE_ROOM_COUNT = 10;
export const CAFE_ROOM_CAPACITY = 10;
/** 방마다 서버에 남겨 두는 최근 채팅 수 (입장 시 일부를 보여 주고, 신고 근거로 쓴다) */
const CHAT_KEEP = 30;
export const CAFE_CHAT_HISTORY_ON_JOIN = 4;
export const CAFE_CHAT_MAX_LENGTH = 100;
export const CAFE_CHAT_COOLDOWN_MS = 1000;

export const CAFE_STROKE_KEEP = 800;
export const CAFE_STROKE_MAX_POINTS = 400;
const STROKE_RATE_WINDOW_MS = 60 * 1000;
const STROKE_RATE_MAX = 40;
export const CAFE_STROKE_AUTO_HIDE_REPORTS = 3;

const ANIMS = new Set(['stay', 'walk', 'run', 'sit', 'sitHi', 'lay']);
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const ID_RE = /^[\w\-#().:]{1,64}$/;

/**
 * @typedef {{
 *   userId: string,
 *   displayName: string,
 *   avatarUrl: string|null,
 *   shadowMuted: boolean,
 *   socketId: string,
 *   gender: 'boy'|'girl',
 *   state: null | { x: number, y: number, z: number, yaw: number, anim: string, seatId: string|null, t: number },
 *   lastChatAt: number,
 * }} CafePlayer
 * @typedef {{ id: string, name: string, index: number, players: Map<string, CafePlayer>, seats: Map<string, string>, chat: object[] }} CafeRoom
 */

/** @type {Map<string, CafeRoom>} */
const rooms = new Map();
for (let i = 1; i <= CAFE_ROOM_COUNT; i += 1) {
  rooms.set(`room-${i}`, {
    id: `room-${i}`,
    name: `방${i}`,
    index: i,
    players: new Map(),
    seats: new Map(),
    chat: [],
  });
}

/** userId → roomId */
const userRoom = new Map();
/** userId → 최근 획 저장 시각들 (분당 제한) */
const strokeTimes = new Map();

export function cafeSocketRoom(roomId) {
  return `cafe:${roomId}`;
}

export function getCafeRoom(roomId) {
  return rooms.get(String(roomId || '')) || null;
}

export function getUserCafeRoomId(userId) {
  return userRoom.get(String(userId)) || null;
}

export function isInCafeRoom(userId, roomId) {
  return getUserCafeRoomId(userId) === String(roomId);
}

export function getCafeRoomPlayer(roomId, userId) {
  return getCafeRoom(roomId)?.players.get(String(userId)) || null;
}

export function listCafeRooms(viewerUserId = null) {
  const mine = viewerUserId != null ? getUserCafeRoomId(viewerUserId) : null;
  return [...rooms.values()].map((room) => ({
    id: room.id,
    name: room.name,
    index: room.index,
    count: room.players.size,
    capacity: CAFE_ROOM_CAPACITY,
    full: room.players.size >= CAFE_ROOM_CAPACITY,
    isMine: room.id === mine,
  }));
}

/**
 * 입장할 방 고르기. 원하는 방이 있고 자리가 있으면 그 방.
 * 아니면 사람이 있는 방 중 많은 곳 → 번호 작은 곳. 전부 비면 방1. 모두 차면 null.
 */
export function pickCafeRoom(requestedRoomId, userId) {
  const uid = String(userId);
  const countWithoutMe = (room) => room.players.size - (room.players.has(uid) ? 1 : 0);
  const requested = getCafeRoom(requestedRoomId);
  if (requested && countWithoutMe(requested) < CAFE_ROOM_CAPACITY) return requested;
  const open = [...rooms.values()]
    .filter((room) => countWithoutMe(room) < CAFE_ROOM_CAPACITY)
    .sort((a, b) => countWithoutMe(b) - countWithoutMe(a) || a.index - b.index);
  return open[0] || null;
}

/** 프로필 + 섀도우 뮤트 */
export async function loadCafeProfile(userId) {
  const [rows] = await pool.execute(
    `SELECT id, username, avatar_url, is_shadow_muted
     FROM users
     WHERE id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    userId: String(row.id),
    displayName: String(row.username || `user${row.id}`),
    avatarUrl: row.avatar_url || null,
    shadowMuted: Boolean(row.is_shadow_muted),
  };
}

/** 내가 차단했거나 나를 차단한 사람 (양방향) */
export async function loadCafeBlockSet(userId) {
  const [rows] = await pool.execute(
    `SELECT blocked_user_id AS other FROM user_blocks WHERE user_id = ?
     UNION
     SELECT user_id AS other FROM user_blocks WHERE blocked_user_id = ?`,
    [userId, userId],
  );
  return new Set(rows.map((r) => String(r.other)));
}

/**
 * 받는 사람이 보낸 사람 것을 봐도 되는지.
 * @param {{ userId: string, blocked: Set<string> }} viewer
 * @param {{ userId: string, shadowMuted?: boolean }} author
 */
export function canViewerSee(viewer, author) {
  if (!viewer || !author) return false;
  const authorId = String(author.userId);
  if (authorId === String(viewer.userId)) return true;
  if (viewer.blocked?.has(authorId)) return false;
  if (author.shadowMuted) return false;
  return true;
}

export function publicPlayerState(player) {
  if (!player?.state) return null;
  return {
    userId: player.userId,
    displayName: player.displayName,
    avatarUrl: player.avatarUrl,
    gender: player.gender,
    ...player.state,
  };
}

/**
 * 방에 넣는다. 다른 방에 있으면 먼저 뺀다.
 * @returns {{ room: CafeRoom, player: CafePlayer, previousSocketId: string|null }}
 */
export function addPlayerToRoom(room, profile, { socketId, gender }) {
  const uid = String(profile.userId);
  let previousSocketId = null;
  const prevRoomId = userRoom.get(uid);
  if (prevRoomId) {
    const prev = getCafeRoom(prevRoomId)?.players.get(uid);
    if (prev && prev.socketId !== socketId) previousSocketId = prev.socketId;
    removePlayerFromRoom(prevRoomId, uid);
  }
  /** @type {CafePlayer} */
  const player = {
    userId: uid,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    shadowMuted: profile.shadowMuted,
    socketId,
    gender: gender === 'girl' ? 'girl' : 'boy',
    state: null,
    lastChatAt: 0,
  };
  room.players.set(uid, player);
  userRoom.set(uid, room.id);
  return { room, player, previousSocketId };
}

/** @returns {{ room: CafeRoom, player: CafePlayer }|null} */
export function removePlayerFromRoom(roomId, userId) {
  const room = getCafeRoom(roomId);
  const uid = String(userId);
  if (!room) return null;
  const player = room.players.get(uid);
  if (!player) return null;
  room.players.delete(uid);
  for (const [seatId, holder] of room.seats) {
    if (holder === uid) room.seats.delete(seatId);
  }
  if (userRoom.get(uid) === room.id) userRoom.delete(uid);
  return { room, player };
}

function num(v, limit = 1000) {
  const n = Number(v);
  if (!Number.isFinite(n) || Math.abs(n) > limit) return null;
  return Math.round(n * 1000) / 1000;
}

/** 클라이언트가 보낸 위치·애니를 검사한다. 이상하면 null */
export function sanitizeCafeState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const x = num(raw.x);
  const y = num(raw.y);
  const z = num(raw.z);
  const yaw = num(raw.yaw, 100);
  if (x == null || y == null || z == null || yaw == null) return null;
  const anim = ANIMS.has(raw.anim) ? raw.anim : 'stay';
  const seatId =
    typeof raw.seatId === 'string' && ID_RE.test(raw.seatId) ? raw.seatId : null;
  // 타이머 실행 중이면 다른 사람 화면에서 머리 위에 시계가 뜬다
  const studying = raw.studying === true;
  return { x, y, z, yaw, anim, seatId, studying };
}

/**
 * 자리 점유. 다른 사람이 앉아 있으면 거절한다.
 * @returns {{ seatId: string|null, denied: string|null, occupantId: string|null }}
 */
export function claimCafeSeat(room, userId, seatId) {
  const uid = String(userId);
  let denied = null;
  let occupantId = null;
  let granted = null;
  if (seatId) {
    const holder = room.seats.get(seatId);
    if (holder && holder !== uid) {
      denied = seatId;
      occupantId = holder;
    } else {
      granted = seatId;
    }
  }
  for (const [id, holder] of room.seats) {
    if (holder === uid && id !== granted) room.seats.delete(id);
  }
  if (granted) room.seats.set(granted, uid);
  return { seatId: granted, denied, occupantId };
}

export function pushCafeChat(room, message) {
  room.chat.push(message);
  if (room.chat.length > CHAT_KEEP) room.chat.splice(0, room.chat.length - CHAT_KEEP);
}

/** 신고 설명용: 그 사람이 이 방에서 최근에 한 말 */
export function recentChatOf(room, userId, limit = 5) {
  const uid = String(userId);
  return room.chat.filter((m) => m.userId === uid).slice(-limit);
}

// ── 방명록 획 (DB) ─────────────────────────────

function rowToStroke(row) {
  let points = row.points;
  if (typeof points === 'string') {
    try {
      points = JSON.parse(points);
    } catch {
      points = [];
    }
  }
  return {
    id: String(row.id),
    boardId: row.board_id,
    authorId: String(row.user_id),
    authorName: row.username || `user${row.user_id}`,
    authorShadowMuted: Boolean(row.is_shadow_muted),
    color: row.color,
    width: Number(row.width),
    points: Array.isArray(points) ? points : [],
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export function publicStroke(stroke) {
  const { authorShadowMuted: _muted, ...rest } = stroke;
  return rest;
}

export function isValidBoardId(boardId) {
  return typeof boardId === 'string' && ID_RE.test(boardId);
}

/**
 * @param {{ userId: string, blocked: Set<string> }} viewer
 */
export async function listCafeStrokes(roomId, boardId, viewer) {
  const [rows] = await pool.query(
    `SELECT s.id, s.board_id, s.user_id, s.color, s.width, s.points, s.created_at,
            u.username, u.is_shadow_muted
     FROM study_cafe_strokes s
     JOIN users u ON u.id = s.user_id
     WHERE s.room_id = ? AND s.board_id = ? AND s.is_deleted = 0 AND s.is_hidden = 0
     ORDER BY s.id DESC
     LIMIT ${CAFE_STROKE_KEEP}`,
    [roomId, boardId],
  );
  return rows
    .reverse()
    .map(rowToStroke)
    .filter((stroke) =>
      canViewerSee(viewer, { userId: stroke.authorId, shadowMuted: stroke.authorShadowMuted }),
    )
    .map(publicStroke);
}

/** 분당 획 수 제한. 넘으면 false */
export function takeStrokeQuota(userId, now = Date.now()) {
  const uid = String(userId);
  const list = (strokeTimes.get(uid) || []).filter((t) => now - t < STROKE_RATE_WINDOW_MS);
  if (list.length >= STROKE_RATE_MAX) {
    strokeTimes.set(uid, list);
    return false;
  }
  list.push(now);
  strokeTimes.set(uid, list);
  return true;
}

/** 획 입력 검사. 이상하면 { error } */
export function sanitizeStrokeInput(body) {
  const color = String(body?.color || '');
  if (!COLOR_RE.test(color)) return { error: '색이 올바르지 않아요.' };
  const width = Number(body?.width);
  if (!Number.isFinite(width) || width < 1 || width > 48) {
    return { error: '굵기가 올바르지 않아요.' };
  }
  const raw = Array.isArray(body?.points) ? body.points : null;
  if (!raw || raw.length < 4 || raw.length % 2 !== 0) {
    return { error: '획이 너무 짧아요.' };
  }
  if (raw.length > CAFE_STROKE_MAX_POINTS * 2) return { error: '획이 너무 길어요.' };
  const points = [];
  for (const v of raw) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < -50 || n > 5000) return { error: '좌표가 올바르지 않아요.' };
    points.push(Math.round(n * 10) / 10);
  }
  return { color: color.toLowerCase(), width: Math.round(width), points };
}

export async function insertCafeStroke({ roomId, boardId, userId, color, width, points }) {
  const [result] = await pool.execute(
    `INSERT INTO study_cafe_strokes (room_id, board_id, user_id, color, width, points)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [roomId, boardId, userId, color, width, JSON.stringify(points)],
  );
  const [rows] = await pool.execute(
    `SELECT s.id, s.board_id, s.user_id, s.color, s.width, s.points, s.created_at,
            u.username, u.is_shadow_muted
     FROM study_cafe_strokes s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
    [result.insertId],
  );
  return rows[0] ? rowToStroke(rows[0]) : null;
}

/** 내 획 하나 지우기. 지웠으면 true */
export async function deleteOwnCafeStroke({ roomId, boardId, strokeId, userId }) {
  const [result] = await pool.execute(
    `UPDATE study_cafe_strokes
     SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP
     WHERE id = ? AND room_id = ? AND board_id = ? AND user_id = ? AND is_deleted = 0`,
    [strokeId, roomId, boardId, userId],
  );
  return result.affectedRows > 0;
}

/** 이 게시판의 내 획 모두 지우기. 지운 id 목록 */
export async function deleteAllOwnCafeStrokes({ roomId, boardId, userId }) {
  const [rows] = await pool.execute(
    `SELECT id FROM study_cafe_strokes
     WHERE room_id = ? AND board_id = ? AND user_id = ? AND is_deleted = 0`,
    [roomId, boardId, userId],
  );
  if (!rows.length) return [];
  await pool.execute(
    `UPDATE study_cafe_strokes
     SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP
     WHERE room_id = ? AND board_id = ? AND user_id = ? AND is_deleted = 0`,
    [roomId, boardId, userId],
  );
  return rows.map((r) => String(r.id));
}

export async function getCafeStrokeMeta(strokeId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id, room_id, board_id, user_id, is_hidden, is_deleted
     FROM study_cafe_strokes WHERE id = ? LIMIT 1`,
    [strokeId],
  );
  return rows[0] || null;
}

/** 신고 누적·관리자 확정으로 숨김 / 기각 시 되돌림 */
export async function setCafeStrokeHidden(strokeId, hidden, connection = pool) {
  await connection.execute(
    `UPDATE study_cafe_strokes
     SET is_hidden = ?, hidden_at = ${hidden ? 'CURRENT_TIMESTAMP' : 'NULL'}
     WHERE id = ?`,
    [hidden ? 1 : 0, strokeId],
  );
}

export async function countPendingStrokeReports(strokeId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS c FROM reports
     WHERE target_type = 'cafe_stroke' AND target_id = ? AND status = 'pending'`,
    [strokeId],
  );
  return Number(rows[0]?.c ?? 0);
}

/** 테스트용: 메모리 상태 비우기 */
export function resetCafeMemoryForTest() {
  for (const room of rooms.values()) {
    room.players.clear();
    room.seats.clear();
    room.chat.length = 0;
  }
  userRoom.clear();
  strokeTimes.clear();
}

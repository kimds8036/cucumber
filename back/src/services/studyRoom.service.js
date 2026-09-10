import { getBatchRedis, isRedisConfigured } from './batchRedis.service.js';
import pool from '../config/database.js';
import { getTimerDayKey } from '../utils/timerDayKey.js';
import { isoFromMysqlKstNaiveString } from '../utils/timerSessionTimes.js';

export const STUDY_ROOM_CAPACITY = 16;
const LAST_ROOM_TTL_SEC = 60 * 60 * 24;

const KEY = {
  user: (uid) => `studyroom:user:${uid}`,
  last: (uid) => `studyroom:last:${uid}`,
  members: (roomId) => `studyroom:room:${roomId}:members`,
  open: 'studyroom:open',
  rooms: 'studyroom:rooms',
  nextId: 'studyroom:next_id',
};

/** Redis 없을 때 / 실패 시 프로세스 메모리 폴백 */
const mem = {
  userRoom: new Map(),
  lastRoom: new Map(),
  roomMembers: new Map(),
  openRooms: new Set(),
  nextId: 1,
};

function uidKey(userId) {
  return String(userId);
}

function newRoomIdMem() {
  const id = mem.nextId;
  mem.nextId += 1;
  return `r${id}`;
}

function ensureRoomSet(roomId) {
  if (!mem.roomMembers.has(roomId)) {
    mem.roomMembers.set(roomId, new Set());
  }
  return mem.roomMembers.get(roomId);
}

function memCount(roomId) {
  return ensureRoomSet(roomId).size;
}

function memMarkOpen(roomId) {
  if (memCount(roomId) > 0 && memCount(roomId) < STUDY_ROOM_CAPACITY) {
    mem.openRooms.add(roomId);
  } else {
    mem.openRooms.delete(roomId);
  }
}

function memDeleteRoomIfEmpty(roomId) {
  if (memCount(roomId) > 0) {
    memMarkOpen(roomId);
    return;
  }
  mem.roomMembers.delete(roomId);
  mem.openRooms.delete(roomId);
}

/**
 * @returns {Promise<'redis'|'memory'>}
 */
async function backend() {
  if (!isRedisConfigured()) return 'memory';
  try {
    await getBatchRedis();
    return 'redis';
  } catch {
    return 'memory';
  }
}

/**
 * 공부 시작 시 방 배정.
 * 1) 이미 속한 방 유지
 * 2) 직전 방(last)에 자리 있으면 복귀
 * 3) 여유 있는 방
 * 4) 새 방
 * @returns {Promise<{ roomId: string, placement: 'existing'|'sticky'|'open'|'new' }>}
 */
export async function assignUserToStudyRoom(userId) {
  const uid = uidKey(userId);
  if ((await backend()) === 'redis') {
    try {
      return await assignRedis(uid);
    } catch (err) {
      console.warn('[StudyRoom] redis assign 실패, memory 폴백:', err?.message);
    }
  }
  return assignMem(uid);
}

async function assignRedis(uid) {
  const redis = await getBatchRedis();
  const cur = await redis.get(KEY.user(uid));
  if (cur) {
    const inRoom = await redis.sismember(KEY.members(cur), uid);
    if (inRoom) {
      return { roomId: cur, placement: 'existing', relocated: false };
    }
    await redis.del(KEY.user(uid));
  }

  const last = await redis.get(KEY.last(uid));
  if (last) {
    const n = await redis.scard(KEY.members(last));
    if (n < STUDY_ROOM_CAPACITY) {
      await redis.sadd(KEY.members(last), uid);
      await redis.set(KEY.user(uid), last);
      if (n + 1 >= STUDY_ROOM_CAPACITY) {
        await redis.srem(KEY.open, last);
      } else {
        await redis.sadd(KEY.open, last);
      }
      await redis.sadd(KEY.rooms, last);
      return { roomId: last, placement: 'sticky', relocated: false };
    }
  }
  const stickyBlocked = Boolean(last);

  const openIds = await redis.smembers(KEY.open);
  for (const roomId of openIds) {
    const n = await redis.scard(KEY.members(roomId));
    if (n >= STUDY_ROOM_CAPACITY) {
      await redis.srem(KEY.open, roomId);
      continue;
    }
    await redis.sadd(KEY.members(roomId), uid);
    await redis.set(KEY.user(uid), roomId);
    if (n + 1 >= STUDY_ROOM_CAPACITY) {
      await redis.srem(KEY.open, roomId);
    }
    return { roomId, placement: 'open', relocated: stickyBlocked };
  }

  const next = await redis.incr(KEY.nextId);
  const roomId = `r${next}`;
  await redis.sadd(KEY.members(roomId), uid);
  await redis.set(KEY.user(uid), roomId);
  await redis.sadd(KEY.open, roomId);
  await redis.sadd(KEY.rooms, roomId);
  return { roomId, placement: 'new', relocated: stickyBlocked };
}

function assignMem(uid) {
  const cur = mem.userRoom.get(uid);
  if (cur && ensureRoomSet(cur).has(uid)) {
    return { roomId: cur, placement: 'existing', relocated: false };
  }
  if (cur) mem.userRoom.delete(uid);

  const last = mem.lastRoom.get(uid);
  if (last && memCount(last) < STUDY_ROOM_CAPACITY) {
    ensureRoomSet(last).add(uid);
    mem.userRoom.set(uid, last);
    memMarkOpen(last);
    return { roomId: last, placement: 'sticky', relocated: false };
  }
  const stickyBlocked = Boolean(last);

  for (const roomId of [...mem.openRooms]) {
    if (memCount(roomId) >= STUDY_ROOM_CAPACITY) {
      mem.openRooms.delete(roomId);
      continue;
    }
    ensureRoomSet(roomId).add(uid);
    mem.userRoom.set(uid, roomId);
    memMarkOpen(roomId);
    return { roomId, placement: 'open', relocated: stickyBlocked };
  }

  const roomId = newRoomIdMem();
  ensureRoomSet(roomId).add(uid);
  mem.userRoom.set(uid, roomId);
  memMarkOpen(roomId);
  return { roomId, placement: 'new', relocated: stickyBlocked };
}

/**
 * 공부 종료 시 퇴실. last room 은 TTL/메모리에 남겨 복귀 가능.
 * @returns {Promise<{ roomId: string|null }>}
 */
export async function leaveStudyRoom(userId) {
  const uid = uidKey(userId);
  if ((await backend()) === 'redis') {
    try {
      return await leaveRedis(uid);
    } catch (err) {
      console.warn('[StudyRoom] redis leave 실패, memory 폴백:', err?.message);
    }
  }
  return leaveMem(uid);
}

async function leaveRedis(uid) {
  const redis = await getBatchRedis();
  const roomId = await redis.get(KEY.user(uid));
  if (!roomId) {
    return { roomId: null };
  }
  await redis.srem(KEY.members(roomId), uid);
  await redis.del(KEY.user(uid));
  await redis.set(KEY.last(uid), roomId, 'EX', LAST_ROOM_TTL_SEC);
  const n = await redis.scard(KEY.members(roomId));
  if (n <= 0) {
    await redis.del(KEY.members(roomId));
    await redis.srem(KEY.open, roomId);
    await redis.srem(KEY.rooms, roomId);
  } else if (n < STUDY_ROOM_CAPACITY) {
    await redis.sadd(KEY.open, roomId);
  }
  return { roomId };
}

function leaveMem(uid) {
  const roomId = mem.userRoom.get(uid) || null;
  if (!roomId) return { roomId: null };
  ensureRoomSet(roomId).delete(uid);
  mem.userRoom.delete(uid);
  mem.lastRoom.set(uid, roomId);
  memDeleteRoomIfEmpty(roomId);
  return { roomId };
}

export async function getUserStudyRoomId(userId) {
  const uid = uidKey(userId);
  if ((await backend()) === 'redis') {
    try {
      const redis = await getBatchRedis();
      return (await redis.get(KEY.user(uid))) || null;
    } catch {
      // fallthrough
    }
  }
  return mem.userRoom.get(uid) || null;
}

export async function listStudyRoomMemberIds(roomId) {
  if (!roomId) return [];
  if ((await backend()) === 'redis') {
    try {
      const redis = await getBatchRedis();
      return await redis.smembers(KEY.members(roomId));
    } catch {
      // fallthrough
    }
  }
  return [...(mem.roomMembers.get(roomId) || [])];
}

/**
 * Socket.io 룸 이름
 * @param {string} roomId
 */
export function studyRoomSocketName(roomId) {
  return `study_room:${roomId}`;
}

/**
 * 스터디룸: 내 방 멤버만 (정원 STUDY_ROOM_CAPACITY)
 */
export async function getStudyRoomSnapshotForUser(userId) {
  const todayTimerDayKey = getTimerDayKey();
  const [openRows] = await pool.execute(
    `SELECT id
     FROM study_sessions
     WHERE user_id = ? AND ended_at IS NULL AND day_key = ?
     ORDER BY id DESC
     LIMIT 1`,
    [userId, todayTimerDayKey],
  );

  let roomId = null;
  let placement = null;
  let relocated = false;

  if (openRows.length > 0) {
    const assigned = await assignUserToStudyRoom(userId);
    roomId = assigned.roomId;
    placement = assigned.placement;
    relocated = !!assigned.relocated;
  } else {
    roomId = await getUserStudyRoomId(userId);
  }

  if (!roomId) {
    return {
      roomId: null,
      capacity: STUDY_ROOM_CAPACITY,
      members: [],
      placement: null,
      relocated: false,
    };
  }

  const memberIds = await listStudyRoomMemberIds(roomId);
  if (memberIds.length === 0) {
    return {
      roomId,
      capacity: STUDY_ROOM_CAPACITY,
      members: [],
      placement,
      relocated,
    };
  }

  const placeholders = memberIds.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT
       u.id AS userId,
       u.username AS username,
       (
         SELECT DATE_FORMAT(ss.started_at, '%Y-%m-%d %H:%i:%s.%f')
         FROM study_sessions ss
         WHERE ss.user_id = u.id
           AND ss.ended_at IS NULL
           AND ss.day_key = ?
         ORDER BY ss.id DESC
         LIMIT 1
       ) AS started_at_fmt,
       COALESCE(sd.total_elapsed_ms, 0) AS closed_total_ms
     FROM users u
     LEFT JOIN study_days sd
       ON sd.user_id = u.id AND sd.day_key = ?
     WHERE u.id IN (${placeholders})
       AND u.is_deleted = FALSE`,
    [
      todayTimerDayKey,
      todayTimerDayKey,
      ...memberIds.map((id) => Number(id) || id),
    ],
  );

  const members = rows
    .filter((r) => r.started_at_fmt)
    .map((r) => ({
      userId: r.userId,
      username: r.username || '',
      startedAt: isoFromMysqlKstNaiveString(r.started_at_fmt),
      closedTotalMs: Number(r.closed_total_ms) || 0,
      isStudying: true,
    }));

  // Redis/메모리에만 남은 유령 멤버 정리 (세션 없이 남아 정원 잠식 방지)
  const activeIds = new Set(members.map((m) => String(m.userId)));
  await Promise.all(
    memberIds
      .filter((id) => !activeIds.has(String(id)))
      .map((id) => leaveStudyRoom(id)),
  );

  return {
    roomId,
    capacity: STUDY_ROOM_CAPACITY,
    members,
    placement,
    relocated,
  };
}

/**
 * 관리자 모니터링용 스터디룸 현황 스냅샷
 * @returns {Promise<{
 *   backend: 'redis'|'memory',
 *   capacity: number,
 *   roomCount: number,
 *   memberCount: number,
 *   openRoomCount: number,
 *   rooms: Array<{ roomId: string, memberCount: number, hasSpace: boolean, members: Array<{ userId: number|string, username: string }> }>
 * }>}
 */
export async function getStudyRoomOpsOverview() {
  const be = await backend();
  let roomIds = [];
  let openIds = new Set();

  if (be === 'redis') {
    try {
      const redis = await getBatchRedis();
      roomIds = await redis.smembers(KEY.rooms);
      const open = await redis.smembers(KEY.open);
      openIds = new Set(open);
    } catch (err) {
      console.warn('[StudyRoom] ops redis 실패, memory:', err?.message);
      roomIds = [...mem.roomMembers.keys()];
      openIds = new Set(mem.openRooms);
    }
  } else {
    roomIds = [...mem.roomMembers.keys()];
    openIds = new Set(mem.openRooms);
  }

  const roomsRaw = [];
  for (const roomId of roomIds) {
    const memberIds = await listStudyRoomMemberIds(roomId);
    if (!memberIds.length) continue;
    roomsRaw.push({
      roomId,
      memberIds,
      hasSpace: openIds.has(roomId) || memberIds.length < STUDY_ROOM_CAPACITY,
    });
  }

  const allIds = [
    ...new Set(roomsRaw.flatMap((r) => r.memberIds.map((id) => String(id)))),
  ];
  const usernameById = new Map();
  if (allIds.length) {
    const placeholders = allIds.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT id, username FROM users
       WHERE id IN (${placeholders}) AND is_deleted = FALSE`,
      allIds.map((id) => Number(id) || id),
    );
    rows.forEach((r) => {
      usernameById.set(String(r.id), r.username || '');
    });
  }

  const rooms = roomsRaw
    .map((r) => ({
      roomId: r.roomId,
      memberCount: r.memberIds.length,
      hasSpace: r.hasSpace && r.memberIds.length < STUDY_ROOM_CAPACITY,
      members: r.memberIds.map((id) => ({
        userId: Number(id) || id,
        username: usernameById.get(String(id)) || `(id:${id})`,
      })),
    }))
    .sort((a, b) => b.memberCount - a.memberCount || a.roomId.localeCompare(b.roomId));

  const memberCount = rooms.reduce((sum, r) => sum + r.memberCount, 0);

  return {
    backend: be === 'redis' && isRedisConfigured() ? 'redis' : 'memory',
    capacity: STUDY_ROOM_CAPACITY,
    roomCount: rooms.length,
    memberCount,
    openRoomCount: rooms.filter((r) => r.hasSpace).length,
    rooms,
    fetchedAt: new Date().toISOString(),
  };
}

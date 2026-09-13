import { getBatchRedis, isRedisConfigured } from './batchRedis.service.js';
import pool from '../config/database.js';
import { getTimerDayKey } from '../utils/timerDayKey.js';
import { isoFromMysqlKstNaiveString } from '../utils/timerSessionTimes.js';

export const STUDY_ROOM_CAPACITY = 16;

const KEY = {
  user: (uid) => `studyroom:user:${uid}`,
  members: (roomId) => `studyroom:room:${roomId}:members`,
  open: 'studyroom:open',
  rooms: 'studyroom:rooms',
  nextId: 'studyroom:next_id',
};

/** Redis 없을 때 / 실패 시 프로세스 메모리 폴백 */
const mem = {
  userRoom: new Map(),
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
 * 1) 이미 속한 방 유지 (같은 세션)
 * 2) 여유 있는 방 중 인원 많은 순으로 합류 (혼자 방 분산 방지)
 * 3) 없으면 새 방
 * ※ 직전 방(sticky) 복귀는 하지 않음 — 날마다 각자 빈 방에 남는 문제 방지
 * @returns {Promise<{ roomId: string, placement: 'existing'|'open'|'new', relocated: boolean }>}
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

/** open 방 후보를 인원 많은 순으로 정렬 (가득 찬 방 제외) */
async function listOpenRoomsByFillDescRedis(redis) {
  const openIds = await redis.smembers(KEY.open);
  const scored = [];
  for (const roomId of openIds) {
    const n = await redis.scard(KEY.members(roomId));
    if (n <= 0 || n >= STUDY_ROOM_CAPACITY) {
      await redis.srem(KEY.open, roomId);
      if (n <= 0) {
        await redis.del(KEY.members(roomId));
        await redis.srem(KEY.rooms, roomId);
      }
      continue;
    }
    scored.push({ roomId, n });
  }
  scored.sort((a, b) => b.n - a.n || String(a.roomId).localeCompare(String(b.roomId)));
  return scored;
}

function listOpenRoomsByFillDescMem() {
  const scored = [];
  for (const roomId of [...mem.openRooms]) {
    const n = memCount(roomId);
    if (n <= 0 || n >= STUDY_ROOM_CAPACITY) {
      mem.openRooms.delete(roomId);
      if (n <= 0) mem.roomMembers.delete(roomId);
      continue;
    }
    scored.push({ roomId, n });
  }
  scored.sort((a, b) => b.n - a.n || String(a.roomId).localeCompare(String(b.roomId)));
  return scored;
}

async function tryJoinOpenRoomRedis(redis, roomId, uid) {
  // SCARD + 정원 검사 + SADD 를 원자적으로 (동시 입장 시 17명 방지)
  const joined = await redis.eval(
    `
    local membersKey = KEYS[1]
    local openKey = KEYS[2]
    local capacity = tonumber(ARGV[1])
    local uid = ARGV[2]
    local n = redis.call('SCARD', membersKey)
    if n >= capacity then
      redis.call('SREM', openKey, ARGV[3])
      return 0
    end
    redis.call('SADD', membersKey, uid)
    n = redis.call('SCARD', membersKey)
    if n >= capacity then
      redis.call('SREM', openKey, ARGV[3])
    else
      redis.call('SADD', openKey, ARGV[3])
    end
    return 1
    `,
    2,
    KEY.members(roomId),
    KEY.open,
    String(STUDY_ROOM_CAPACITY),
    uid,
    roomId,
  );
  return Number(joined) === 1;
}

async function assignRedis(uid) {
  const redis = await getBatchRedis();
  // 레거시 sticky 키 정리 (복귀 로직 제거)
  await redis.del(`studyroom:last:${uid}`);

  const cur = await redis.get(KEY.user(uid));
  if (cur) {
    const inRoom = await redis.sismember(KEY.members(cur), uid);
    if (inRoom) {
      const n = await redis.scard(KEY.members(cur));
      // 혼자만 있으면 유지하지 않고 재배정(다른 방 합류)
      if (n > 1) {
        return { roomId: cur, placement: 'existing', relocated: false };
      }
      await redis.srem(KEY.members(cur), uid);
      await redis.del(KEY.user(uid));
      if (n <= 1) {
        await redis.del(KEY.members(cur));
        await redis.srem(KEY.open, cur);
        await redis.srem(KEY.rooms, cur);
      }
    } else {
      await redis.del(KEY.user(uid));
    }
  }

  const openRooms = await listOpenRoomsByFillDescRedis(redis);
  for (const { roomId } of openRooms) {
    const ok = await tryJoinOpenRoomRedis(redis, roomId, uid);
    if (!ok) continue;
    await redis.set(KEY.user(uid), roomId);
    return { roomId, placement: 'open', relocated: Boolean(cur) };
  }

  const next = await redis.incr(KEY.nextId);
  const roomId = `r${next}`;
  await redis.sadd(KEY.members(roomId), uid);
  await redis.set(KEY.user(uid), roomId);
  await redis.sadd(KEY.open, roomId);
  await redis.sadd(KEY.rooms, roomId);
  return { roomId, placement: 'new', relocated: Boolean(cur) };
}

function tryJoinOpenRoomMem(roomId, uid) {
  const set = ensureRoomSet(roomId);
  if (set.size >= STUDY_ROOM_CAPACITY) {
    mem.openRooms.delete(roomId);
    return false;
  }
  if (set.has(uid)) {
    mem.userRoom.set(uid, roomId);
    memMarkOpen(roomId);
    return true;
  }
  if (set.size >= STUDY_ROOM_CAPACITY) {
    return false;
  }
  set.add(uid);
  mem.userRoom.set(uid, roomId);
  memMarkOpen(roomId);
  return true;
}

function assignMem(uid) {
  const cur = mem.userRoom.get(uid);
  if (cur && ensureRoomSet(cur).has(uid)) {
    const n = memCount(cur);
    if (n > 1) {
      return { roomId: cur, placement: 'existing', relocated: false };
    }
    ensureRoomSet(cur).delete(uid);
    mem.userRoom.delete(uid);
    memDeleteRoomIfEmpty(cur);
  } else if (cur) {
    mem.userRoom.delete(uid);
  }

  const openRooms = listOpenRoomsByFillDescMem();
  for (const { roomId } of openRooms) {
    if (!tryJoinOpenRoomMem(roomId, uid)) continue;
    return { roomId, placement: 'open', relocated: Boolean(cur) };
  }

  const roomId = newRoomIdMem();
  ensureRoomSet(roomId).add(uid);
  mem.userRoom.set(uid, roomId);
  memMarkOpen(roomId);
  return { roomId, placement: 'new', relocated: Boolean(cur) };
}

/**
 * 공부 종료 시 퇴실. 직전 방 복귀용 last 기록은 남기지 않음.
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
  await redis.del(`studyroom:last:${uid}`);
  const roomId = await redis.get(KEY.user(uid));
  if (!roomId) {
    return { roomId: null };
  }
  await redis.srem(KEY.members(roomId), uid);
  await redis.del(KEY.user(uid));
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

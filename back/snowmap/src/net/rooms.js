import { CONFIG } from "../config.js";

const PRESENCE_KEY = "study-cafe:presence:v1";
const STALE_MS = 12_000;

/**
 * @typedef {{ id: string, name: string, index: number }} CafeRoom
 * @typedef {{ id: string, name: string, index: number, count: number, capacity: number, full: boolean, isMine: boolean }} CafeRoomStatus
 */

/** @returns {CafeRoom[]} */
export function listCafeRooms() {
  const n = Math.max(1, Number(CONFIG.ROOM_COUNT) || 10);
  const rooms = [];
  for (let i = 1; i <= n; i += 1) {
    rooms.push({
      id: `room-${i}`,
      name: `방${i}`,
      index: i,
    });
  }
  return rooms;
}

export function getRoomCapacity() {
  return Math.max(1, Number(CONFIG.ROOM_CAPACITY) || 10);
}

function readPresence() {
  try {
    const raw = JSON.parse(localStorage.getItem(PRESENCE_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function writePresence(data) {
  try {
    localStorage.setItem(PRESENCE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function pruneRoom(map, now = Date.now()) {
  const next = {};
  for (const [userId, at] of Object.entries(map || {})) {
    if (now - Number(at) <= STALE_MS) next[userId] = Number(at);
  }
  return next;
}

/** 방별 실시간(근사) 인원. 같은 PC 탭 presence 기준. */
export function getRoomStatuses(myUserId, myRoomId) {
  const presence = readPresence();
  const now = Date.now();
  const capacity = getRoomCapacity();
  return listCafeRooms().map((room) => {
    const live = pruneRoom(presence[room.id], now);
    const count = Object.keys(live).length;
    return {
      ...room,
      count,
      capacity,
      full: count >= capacity,
      isMine: room.id === myRoomId,
    };
  });
}

/**
 * 입장용 방 고르기.
 * 비어 있지 않은 방 중 인원 많은 곳 우선, 동률이면 방 번호 작은 쪽.
 * 전부 비었으면 방1. 정원 찬 방은 건너뛴다.
 */
export function pickEntryRoom(myUserId) {
  const capacity = getRoomCapacity();
  const statuses = getRoomStatuses(myUserId, null)
    .map((room) => {
      // 내 예전 presence는 세지 않음(재입장)
      const presence = readPresence();
      const live = pruneRoom(presence[room.id]);
      if (myUserId && live[myUserId]) {
        delete live[myUserId];
      }
      const count = Object.keys(live).length;
      return { ...room, count, full: count >= capacity };
    })
    .filter((room) => !room.full);

  if (!statuses.length) {
    return listCafeRooms()[0];
  }

  statuses.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.index - b.index;
  });
  return statuses[0];
}

export function resolveRoomFromQuery(myUserId) {
  try {
    const id = String(
      new URLSearchParams(window.location.search).get("room") || "",
    ).trim();
    const rooms = listCafeRooms();
    const found = rooms.find((r) => r.id === id || r.name === id || String(r.index) === id);
    if (found) return found;
  } catch {
    /* ignore */
  }
  return pickEntryRoom(myUserId);
}

export function syncRoomQuery(room) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("room", room.id);
    window.history.replaceState({}, "", url);
  } catch {
    /* ignore */
  }
}

/** 내 출석 하트비트. 방 이동 시 이전 방에서 지운다. */
export function touchPresence(userId, roomId) {
  if (!userId || !roomId) return;
  const presence = readPresence();
  const now = Date.now();
  for (const id of Object.keys(presence)) {
    presence[id] = pruneRoom(presence[id], now);
    if (id !== roomId && presence[id][userId]) {
      delete presence[id][userId];
    }
    if (!Object.keys(presence[id]).length) delete presence[id];
  }
  if (!presence[roomId]) presence[roomId] = {};
  presence[roomId][userId] = now;
  writePresence(presence);
}

export function leavePresence(userId) {
  if (!userId) return;
  const presence = readPresence();
  let changed = false;
  for (const id of Object.keys(presence)) {
    if (presence[id]?.[userId]) {
      delete presence[id][userId];
      changed = true;
    }
    if (presence[id] && !Object.keys(presence[id]).length) delete presence[id];
  }
  if (changed) writePresence(presence);
}

/** 다른 방으로 이동(페이지 쿼리만 바꾸고 새로고침). */
export function switchToRoom(roomId) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  window.location.assign(url.toString());
}

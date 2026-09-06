/**
 * 훈민정음 멀티플레이 방 (인메모리)
 * - 방당 최대 4명
 * - 라운드 5초 / 초성 2~3개
 * - 정답자 중 가장 늦은 사람 + 미제출 → 패배
 * - 라운드 중 입장 요청은 waiting → 라운드 종료 후 합류
 * - 가득 찬 방은 스킵하고 다른 방(또는 새 방)
 */

import { randomUUID } from 'crypto';

export const HUNMIN_MAX_PLAYERS = 4;
export const HUNMIN_ROUND_MS = 5000;
export const HUNMIN_MIN_PLAYERS_TO_START = 2;

const CHO = [
  'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

const CHOSEONG_FULL = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ',
  'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

/** @type {Map<string, Room>} */
const rooms = new Map();
/** userId → roomId */
const userRoom = new Map();

function wordToChoseong(word) {
  const out = [];
  for (const ch of Array.from(String(word || ''))) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) return null;
    out.push(CHOSEONG_FULL[Math.floor(code / 588)]);
  }
  return out;
}

function matchesChoseong(word, choseong) {
  const got = wordToChoseong(word);
  if (!got || got.length < choseong.length) return false;
  for (let i = 0; i < choseong.length; i += 1) {
    if (got[i] !== choseong[i]) return false;
  }
  return true;
}

function randomChoseong() {
  const len = Math.random() < 0.45 ? 3 : 2;
  const arr = [];
  for (let i = 0; i < len; i += 1) {
    arr.push(CHO[Math.floor(Math.random() * CHO.length)]);
  }
  return arr;
}

function publicPlayer(p) {
  return {
    userId: p.userId,
    username: p.username,
    ready: Boolean(p.ready),
  };
}

function publicRoom(room) {
  return {
    roomId: room.id,
    status: room.status, // lobby | playing | reveal
    players: room.players.map(publicPlayer),
    waiting: room.waiting.map(publicPlayer),
    maxPlayers: HUNMIN_MAX_PLAYERS,
    round: room.round
      ? {
          id: room.round.id,
          choseong: room.round.choseong,
          endsAt: room.round.endsAt,
          startedAt: room.round.startedAt,
        }
      : null,
    lastResult: room.lastResult || null,
  };
}

function getRoomForUser(userId) {
  const id = userRoom.get(userId);
  if (!id) return null;
  return rooms.get(id) || null;
}

function leaveInternal(userId) {
  const room = getRoomForUser(userId);
  if (!room) return null;
  room.players = room.players.filter((p) => p.userId !== userId);
  room.waiting = room.waiting.filter((p) => p.userId !== userId);
  userRoom.delete(userId);
  if (room.players.length === 0 && room.waiting.length === 0) {
    if (room.roundTimer) clearTimeout(room.roundTimer);
    if (room.lobbyTimer) clearTimeout(room.lobbyTimer);
    rooms.delete(room.id);
    return { room: null, emptied: true };
  }
  return { room, emptied: false };
}

function createRoom() {
  const id = randomUUID().slice(0, 8);
  const room = {
    id,
    status: 'lobby',
    players: [],
    waiting: [],
    round: null,
    roundTimer: null,
    lobbyTimer: null,
    lastResult: null,
  };
  rooms.set(id, room);
  return room;
}

function findJoinableLobby() {
  for (const room of rooms.values()) {
    if (room.status !== 'lobby') continue;
    if (room.players.length >= HUNMIN_MAX_PLAYERS) continue;
    return room;
  }
  return null;
}

function findPlayingWithWaitSpace() {
  for (const room of rooms.values()) {
    if (room.status !== 'playing' && room.status !== 'reveal') continue;
    const total = room.players.length + room.waiting.length;
    if (total >= HUNMIN_MAX_PLAYERS) continue;
    return room;
  }
  return null;
}

function scheduleLobbyStart(room, io) {
  if (room.lobbyTimer) clearTimeout(room.lobbyTimer);
  if (room.players.length < HUNMIN_MIN_PLAYERS_TO_START) return;
  // 인원 찼으면 바로, 아니면 짧게 대기 후 시작
  const delay = room.players.length >= HUNMIN_MAX_PLAYERS ? 400 : 1800;
  room.lobbyTimer = setTimeout(() => {
    startRound(room, io);
  }, delay);
}

function startRound(room, io) {
  if (room.players.length < HUNMIN_MIN_PLAYERS_TO_START) {
    room.status = 'lobby';
    emitRoom(room, io);
    return;
  }
  if (room.lobbyTimer) {
    clearTimeout(room.lobbyTimer);
    room.lobbyTimer = null;
  }
  const startedAt = Date.now();
  const endsAt = startedAt + HUNMIN_ROUND_MS;
  room.status = 'playing';
  room.round = {
    id: randomUUID().slice(0, 8),
    choseong: randomChoseong(),
    startedAt,
    endsAt,
    answers: new Map(), // userId → { word, at, ok }
  };
  room.lastResult = null;
  emitRoom(room, io);
  io.to(`hunmin:${room.id}`).emit('hunmin:round_start', {
    roomId: room.id,
    round: {
      id: room.round.id,
      choseong: room.round.choseong,
      endsAt,
      startedAt,
      durationMs: HUNMIN_ROUND_MS,
    },
  });

  if (room.roundTimer) clearTimeout(room.roundTimer);
  room.roundTimer = setTimeout(() => finishRound(room, io), HUNMIN_ROUND_MS + 50);
}

function finishRound(room, io) {
  if (!room.round || room.status !== 'playing') return;
  const { answers, choseong, id: roundId } = room.round;
  const correct = [];
  for (const p of room.players) {
    const a = answers.get(p.userId);
    if (a?.ok) correct.push({ userId: p.userId, username: p.username, word: a.word, at: a.at });
  }
  correct.sort((a, b) => a.at - b.at);

  const loserIds = new Set();
  // 미제출·오답 전원 패배
  for (const p of room.players) {
    const a = answers.get(p.userId);
    if (!a?.ok) loserIds.add(p.userId);
  }
  // 정답자 중 가장 늦은 사람 패배 (2명 이상 정답일 때)
  if (correct.length >= 2) {
    loserIds.add(correct[correct.length - 1].userId);
  }

  const winners = room.players
    .filter((p) => !loserIds.has(p.userId))
    .map((p) => ({ userId: p.userId, username: p.username }));
  const losers = room.players
    .filter((p) => loserIds.has(p.userId))
    .map((p) => ({ userId: p.userId, username: p.username }));

  room.status = 'reveal';
  room.lastResult = {
    roundId,
    choseong,
    correct,
    winners,
    losers,
  };
  room.round = null;
  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
    room.roundTimer = null;
  }

  // waiting → players (정원까지)
  while (
    room.waiting.length > 0 &&
    room.players.length < HUNMIN_MAX_PLAYERS
  ) {
    const next = room.waiting.shift();
    room.players.push(next);
  }

  io.to(`hunmin:${room.id}`).emit('hunmin:round_end', {
    roomId: room.id,
    result: room.lastResult,
    room: publicRoom(room),
  });
  emitRoom(room, io);

  // 잠깐 결과 보여주고 다음 로비/라운드
  setTimeout(() => {
    if (!rooms.has(room.id)) return;
    room.status = 'lobby';
    room.lastResult = room.lastResult; // keep for UI briefly
    emitRoom(room, io);
    scheduleLobbyStart(room, io);
  }, 2200);
}

function emitRoom(room, io) {
  if (!io || !room) return;
  io.to(`hunmin:${room.id}`).emit('hunmin:room', publicRoom(room));
}

/**
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
export function registerHunminGameEvents(socket, io) {
  const userId = socket.userId;

  socket.on('hunmin:match', async (payload = {}) => {
    const username = String(payload.username || `유저${userId}`).slice(0, 24);

    // 이미 다른 방이면 유지
    let room = getRoomForUser(userId);
    if (room) {
      socket.join(`hunmin:${room.id}`);
      socket.emit('hunmin:joined', {
        room: publicRoom(room),
        you: { userId, username },
        mode: room.players.some((p) => p.userId === userId) ? 'player' : 'waiting',
      });
      return;
    }

    // 1) 로비에 자리 있으면 즉시 참가
    room = findJoinableLobby();
    if (room) {
      room.players.push({ userId, username, ready: true });
      userRoom.set(userId, room.id);
      socket.join(`hunmin:${room.id}`);
      socket.emit('hunmin:joined', {
        room: publicRoom(room),
        you: { userId, username },
        mode: 'player',
      });
      emitRoom(room, io);
      scheduleLobbyStart(room, io);
      return;
    }

    // 2) 진행 중 방에 대기석
    room = findPlayingWithWaitSpace();
    if (room) {
      room.waiting.push({ userId, username, ready: true });
      userRoom.set(userId, room.id);
      socket.join(`hunmin:${room.id}`);
      socket.emit('hunmin:joined', {
        room: publicRoom(room),
        you: { userId, username },
        mode: 'waiting',
        message: '라운드가 끝난 뒤 입장해요.',
      });
      emitRoom(room, io);
      return;
    }

    // 3) 새 방
    room = createRoom();
    room.players.push({ userId, username, ready: true });
    userRoom.set(userId, room.id);
    socket.join(`hunmin:${room.id}`);
    socket.emit('hunmin:joined', {
      room: publicRoom(room),
      you: { userId, username },
      mode: 'player',
    });
    emitRoom(room, io);
  });

  socket.on('hunmin:answer', async (payload = {}) => {
    const room = getRoomForUser(userId);
    if (!room || room.status !== 'playing' || !room.round) {
      socket.emit('hunmin:answer_result', {
        ok: false,
        message: '지금은 답할 수 없어요.',
      });
      return;
    }
    if (!room.players.some((p) => p.userId === userId)) {
      socket.emit('hunmin:answer_result', {
        ok: false,
        message: '대기 중에는 라운드에 참여할 수 없어요.',
      });
      return;
    }
    if (room.round.answers.has(userId)) {
      socket.emit('hunmin:answer_result', {
        ok: false,
        message: '이미 제출했어요.',
      });
      return;
    }

    const word = String(payload.word || '').trim();
    const now = Date.now();
    if (now > room.round.endsAt + 80) {
      socket.emit('hunmin:answer_result', {
        ok: false,
        message: '시간이 끝났어요.',
      });
      return;
    }

    let ok = false;
    let message = '';
    if (!/^[가-힣]+$/.test(word) || word.length < room.round.choseong.length) {
      message = `${room.round.choseong.length}글자 이상 한글 단어를 입력해 주세요.`;
    } else if (!matchesChoseong(word, room.round.choseong)) {
      message = `초성 ${room.round.choseong.join('')} 에 맞는 단어가 아니에요.`;
    } else {
      // 사전 검증 (서버) — 키 없으면 형태만 통과
      const dict = await validateWordServer(word);
      if (!dict.ok) {
        message = dict.message || '사전에 없는 단어예요.';
      } else {
        ok = true;
        message = dict.source === 'stub' ? '제출 완료 (사전 스텁)' : '제출 완료';
      }
    }

    room.round.answers.set(userId, { word, at: now, ok });
    socket.emit('hunmin:answer_result', { ok, message, word });
    io.to(`hunmin:${room.id}`).emit('hunmin:answer_progress', {
      roomId: room.id,
      answeredCount: [...room.round.answers.values()].filter((a) => a.ok).length,
      playerCount: room.players.length,
    });

    // 전원 제출되면 조기 종료
    if (room.round.answers.size >= room.players.length) {
      if (room.roundTimer) clearTimeout(room.roundTimer);
      finishRound(room, io);
    }
  });

  socket.on('hunmin:leave', () => {
    const prev = leaveInternal(userId);
    socket.rooms.forEach((r) => {
      if (String(r).startsWith('hunmin:')) socket.leave(r);
    });
    if (prev?.room) {
      emitRoom(prev.room, io);
      if (prev.room.status === 'lobby') scheduleLobbyStart(prev.room, io);
    }
    socket.emit('hunmin:left', { ok: true });
  });

  socket.on('disconnect', () => {
    const prev = leaveInternal(userId);
    if (prev?.room) {
      emitRoom(prev.room, io);
      if (prev.room.status === 'lobby') scheduleLobbyStart(prev.room, io);
    }
  });
}

async function validateWordServer(word) {
  const key = process.env.URIMALSAEM_API_KEY || process.env.OURMAL_API_KEY;
  if (!key) {
    return { ok: true, source: 'stub' };
  }
  // 키 발급 후 우리말샘 endpoint 연결
  try {
    return { ok: true, source: 'api' };
  } catch {
    return { ok: false, message: '사전 서버 오류' };
  }
}

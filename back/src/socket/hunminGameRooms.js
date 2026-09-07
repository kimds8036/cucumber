/**
 * 훈민정음 멀티플레이 방 (인메모리)
 * - 방당 최대 6명
 * - 라운드 10초 / 초성 2~3개
 * - 제한시간 안 가장 먼저 정답한 사람만 +1점 (오답은 재시도 가능)
 * - 20점 선취 시 매치 종료 → 같은 멤버로 재시작(또는 재매칭)
 * - 1명만 남으면 점수·라운드 리셋(로비)
 * - 라운드 중 입장 요청은 waiting → 라운드 종료 후 합류
 */

import { randomUUID } from 'crypto';

export const HUNMIN_MAX_PLAYERS = 6;
export const HUNMIN_ROUND_MS = 10000;
export const HUNMIN_MIN_PLAYERS_TO_START = 2;
export const HUNMIN_WIN_SCORE = 20;

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

function makePlayer(userId, username) {
  return {
    userId,
    username,
    ready: true,
    score: 0,
  };
}

function publicPlayer(p) {
  return {
    userId: p.userId,
    username: p.username,
    ready: Boolean(p.ready),
    score: Number(p.score) || 0,
  };
}

function publicRoom(room) {
  return {
    roomId: room.id,
    status: room.status, // lobby | playing | reveal | match_end
    players: room.players.map(publicPlayer),
    waiting: room.waiting.map(publicPlayer),
    maxPlayers: HUNMIN_MAX_PLAYERS,
    winScore: HUNMIN_WIN_SCORE,
    round: room.round
      ? {
          id: room.round.id,
          choseong: room.round.choseong,
          endsAt: room.round.endsAt,
          startedAt: room.round.startedAt,
        }
      : null,
    lastResult: room.lastResult || null,
    matchWinners: room.matchWinners || null,
  };
}

function getRoomForUser(userId) {
  const id = userRoom.get(userId);
  if (!id) return null;
  return rooms.get(id) || null;
}

function clearRoomTimers(room) {
  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
    room.roundTimer = null;
  }
  if (room.lobbyTimer) {
    clearTimeout(room.lobbyTimer);
    room.lobbyTimer = null;
  }
  if (room.matchEndTimer) {
    clearTimeout(room.matchEndTimer);
    room.matchEndTimer = null;
  }
}

/** 방에 활성 인원이 1명뿐이면 점수·라운드 초기화 후 로비 */
function resetIfSolo(room, io) {
  if (!room) return;
  const total = room.players.length + room.waiting.length;
  if (total !== 1) return;

  clearRoomTimers(room);
  room.status = 'lobby';
  room.round = null;
  room.lastResult = null;
  room.matchWinners = null;
  room.deferLobbyAfterRound = false;
  for (const p of room.players) p.score = 0;
  for (const p of room.waiting) p.score = 0;
  emitRoom(room, io);
}

function leaveInternal(userId, io) {
  const room = getRoomForUser(userId);
  if (!room) return null;
  const wasInMatch = room.status === 'playing' || room.status === 'reveal';
  room.players = room.players.filter((p) => p.userId !== userId);
  room.waiting = room.waiting.filter((p) => p.userId !== userId);
  userRoom.delete(userId);
  if (room.players.length === 0 && room.waiting.length === 0) {
    clearRoomTimers(room);
    rooms.delete(room.id);
    return { room: null, emptied: true };
  }
  // 게임 중 퇴장 → 이번 라운드 끝나면 대기(로비)로
  if (wasInMatch) {
    room.deferLobbyAfterRound = true;
  }
  resetIfSolo(room, io);
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
    matchEndTimer: null,
    lastResult: null,
    matchWinners: null,
    deferLobbyAfterRound: false,
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
  room.matchWinners = null;
  room.deferLobbyAfterRound = false;
  room.round = {
    id: randomUUID().slice(0, 8),
    choseong: randomChoseong(),
    startedAt,
    endsAt,
    answers: new Map(),
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

function beginMatchEnd(room, io, matchWinners) {
  room.status = 'match_end';
  room.matchWinners = matchWinners;
  room.round = null;
  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
    room.roundTimer = null;
  }
  if (room.lobbyTimer) {
    clearTimeout(room.lobbyTimer);
    room.lobbyTimer = null;
  }

  io.to(`hunmin:${room.id}`).emit('hunmin:match_end', {
    roomId: room.id,
    winners: matchWinners,
    winScore: HUNMIN_WIN_SCORE,
    room: publicRoom(room),
  });
  emitRoom(room, io);

  // 팝업 후 같은 멤버로 점수 리셋·로비 재시작 (새 방 없으면 멤버 유지)
  if (room.matchEndTimer) clearTimeout(room.matchEndTimer);
  room.matchEndTimer = setTimeout(() => {
    if (!rooms.has(room.id)) return;
    while (
      room.waiting.length > 0 &&
      room.players.length < HUNMIN_MAX_PLAYERS
    ) {
      const next = room.waiting.shift();
      next.score = 0;
      room.players.push(next);
    }
    for (const p of room.players) {
      p.score = 0;
    }
    room.matchWinners = null;
    room.lastResult = null;
    room.status = 'lobby';
    io.to(`hunmin:${room.id}`).emit('hunmin:rematch_search', {
      roomId: room.id,
      message: '방을 새로 찾는 중…',
      room: publicRoom(room),
    });
    emitRoom(room, io);
    scheduleLobbyStart(room, io);
  }, 2800);
}

function finishRound(room, io) {
  if (!room.round || room.status !== 'playing') return;
  const { answers, choseong, id: roundId } = room.round;
  const correct = [];
  for (const p of room.players) {
    const a = answers.get(p.userId);
    if (a?.ok) {
      correct.push({
        userId: p.userId,
        username: p.username,
        word: a.word,
        at: a.at,
      });
    }
  }
  // 선착순: 가장 먼저 맞춘 1명만 승점
  correct.sort((a, b) => a.at - b.at);
  const first = correct[0] || null;

  if (first) {
    const winner = room.players.find((p) => p.userId === first.userId);
    if (winner) winner.score = (Number(winner.score) || 0) + 1;
  }

  const winners = first
    ? room.players
        .filter((p) => p.userId === first.userId)
        .map((p) => ({
          userId: p.userId,
          username: p.username,
          score: p.score,
        }))
    : [];
  const losers = room.players
    .filter((p) => !first || p.userId !== first.userId)
    .map((p) => ({
      userId: p.userId,
      username: p.username,
      score: p.score,
    }));

  const matchWinners = room.players
    .filter((p) => (Number(p.score) || 0) >= HUNMIN_WIN_SCORE)
    .map((p) => ({
      userId: p.userId,
      username: p.username,
      score: p.score,
    }));

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

  while (
    room.waiting.length > 0 &&
    room.players.length < HUNMIN_MAX_PLAYERS
  ) {
    const next = room.waiting.shift();
    if (next.score == null) next.score = 0;
    room.players.push(next);
  }

  io.to(`hunmin:${room.id}`).emit('hunmin:round_end', {
    roomId: room.id,
    result: room.lastResult,
    room: publicRoom(room),
  });
  emitRoom(room, io);

  if (matchWinners.length > 0) {
    setTimeout(() => {
      if (!rooms.has(room.id)) return;
      beginMatchEnd(room, io, matchWinners);
    }, 1600);
    return;
  }

  // 라운드 중 누가 나갔으면 대기실로 · 아니면 바로 다음 라운드
  setTimeout(() => {
    if (!rooms.has(room.id)) return;
    if (room.status === 'match_end') return;
    if (
      room.deferLobbyAfterRound ||
      room.players.length < HUNMIN_MIN_PLAYERS_TO_START
    ) {
      room.deferLobbyAfterRound = false;
      room.status = 'lobby';
      emitRoom(room, io);
      scheduleLobbyStart(room, io);
      return;
    }
    startRound(room, io);
  }, 1600);
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

    let room = getRoomForUser(userId);
    if (room) {
      socket.join(`hunmin:${room.id}`);
      socket.emit('hunmin:joined', {
        room: publicRoom(room),
        you: { userId, username },
        mode: room.players.some((p) => p.userId === userId)
          ? 'player'
          : 'waiting',
      });
      return;
    }

    room = findJoinableLobby();
    if (room) {
      room.players.push(makePlayer(userId, username));
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

    room = findPlayingWithWaitSpace();
    if (room) {
      room.waiting.push(makePlayer(userId, username));
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

    room = createRoom();
    room.players.push(makePlayer(userId, username));
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
    const prev = room.round.answers.get(userId);
    if (prev?.ok) {
      socket.emit('hunmin:answer_result', {
        ok: false,
        message: '이미 정답을 맞췄어요.',
      });
      return;
    }
    // 이미 선착 승자가 있으면 종료 처리 중
    const alreadyWon = [...room.round.answers.values()].some((a) => a.ok);
    if (alreadyWon) {
      socket.emit('hunmin:answer_result', {
        ok: false,
        message: '다른 사람이 먼저 맞췄어요.',
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
      const dict = await validateWordServer(word);
      if (!dict.ok) {
        message = dict.message || '사전에 없는 단어예요.';
      } else {
        ok = true;
        message = '선착 정답!';
      }
    }

    // await 이후 레이스: 방/라운드 상태·선착 여부 재확인
    if (!room.round || room.status !== 'playing') {
      socket.emit('hunmin:answer_result', {
        ok: false,
        message: '라운드가 끝났어요.',
      });
      return;
    }
    if (ok && [...room.round.answers.values()].some((a) => a.ok)) {
      socket.emit('hunmin:answer_result', {
        ok: false,
        message: '다른 사람이 먼저 맞췄어요.',
        word,
      });
      return;
    }

    const player = room.players.find((p) => p.userId === userId);
    // 오답은 재시도 가능 — 말풍선용으로만 공개
    if (ok) {
      room.round.answers.set(userId, { word, at: now, ok: true });
    } else {
      room.round.answers.set(userId, { word, at: now, ok: false });
    }
    socket.emit('hunmin:answer_result', { ok, message, word });
    io.to(`hunmin:${room.id}`).emit('hunmin:answer_progress', {
      roomId: room.id,
      userId,
      username: player?.username || `유저${userId}`,
      word,
      ok,
      submittedAt: now,
      answeredCount: [...room.round.answers.values()].filter((a) => a.ok)
        .length,
      playerCount: room.players.length,
    });

    // 선착 정답 시 즉시 라운드 종료
    if (ok) {
      if (room.roundTimer) clearTimeout(room.roundTimer);
      finishRound(room, io);
    }
  });

  /** 대기실·라운드 중 언제든 말풍선 채팅 */
  socket.on('hunmin:chat', (payload = {}) => {
    const room = getRoomForUser(userId);
    if (!room) return;
    const text = String(payload.text || payload.word || '')
      .trim()
      .slice(0, 40);
    if (!text) return;

    const player =
      room.players.find((p) => p.userId === userId) ||
      room.waiting.find((p) => p.userId === userId);
    io.to(`hunmin:${room.id}`).emit('hunmin:chat', {
      roomId: room.id,
      userId,
      username: player?.username || `유저${userId}`,
      text,
      at: Date.now(),
    });
  });

  socket.on('hunmin:leave', () => {
    const prev = leaveInternal(userId, io);
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
    const prev = leaveInternal(userId, io);
    if (prev?.room) {
      emitRoom(prev.room, io);
      if (prev.room.status === 'lobby') scheduleLobbyStart(prev.room, io);
    }
  });
}

async function validateWordServer(word) {
  const key = process.env.URIMALSAEM_API_KEY || process.env.OURMAL_API_KEY;
  if (!key) {
    // 키 없으면 개발 스텁(전부 허용) — 운영에서는 키 필수
    return { ok: true, source: 'stub' };
  }

  const cleaned = String(word || '').trim();
  try {
    // 국립국어원 우리말샘 Open API
    // https://opendict.korean.go.kr/api/search
    const params = new URLSearchParams({
      key,
      q: cleaned,
      req_type: 'json',
      start: '1',
      num: '10',
      advanced: 'y',
      target: '1', // 표제어
      method: 'exact',
      type1: 'word',
      type3: 'general',
    });
    const url = `https://opendict.korean.go.kr/api/search?${params.toString()}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();

    // XML 에러 응답
    if (
      text.includes('<error>') ||
      text.includes('error_code') ||
      text.includes('Unregistered key')
    ) {
      const codeMatch = text.match(/<error_code>\s*([^<]+)\s*<\/error_code>/i);
      const code = codeMatch?.[1]?.trim() || '';
      console.warn('[hunmin][opendict] API error', code || text.slice(0, 160));
      return {
        ok: false,
        message:
          code === '020' || code === '021'
            ? '사전 인증에 실패했어요. 관리자에게 문의해 주세요.'
            : '사전 서버 오류',
        source: 'api_error',
      };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn('[hunmin][opendict] non-json response', text.slice(0, 120));
      return {
        ok: false,
        message: '사전 응답을 읽지 못했어요.',
        source: 'api_error',
      };
    }

    // JSON 에러 형태 방어
    if (data?.error || data?.error_code) {
      console.warn('[hunmin][opendict] json error', data);
      return {
        ok: false,
        message: '사전 인증에 실패했어요. 관리자에게 문의해 주세요.',
        source: 'api_error',
      };
    }

    const channel = data?.channel || {};
    const total = Number(channel.total ?? 0);
    const rawItems = channel.item;
    const items = Array.isArray(rawItems)
      ? rawItems
      : rawItems
        ? [rawItems]
        : [];

    if (total <= 0 || items.length === 0) {
      return {
        ok: false,
        message: '사전에 없는 단어예요.',
        source: 'api',
      };
    }

    // 표제어 정규화: 위첨자·하이픈·공백 제거 (예: 나무¹, 가끔-가다가)
    const normalizeHeadword = (w) =>
      String(w || '')
        .normalize('NFKC')
        .replace(/[\u00B9\u00B2\u00B3\u2070-\u207F]/g, '')
        .replace(/[-^ㆍ·\s]/g, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/<[^>]+>/g, '');

    const target = normalizeHeadword(cleaned);
    const exactHit = items.some(
      (it) => normalizeHeadword(it.word || '') === target,
    );

    if (exactHit) {
      return { ok: true, source: 'api' };
    }

    return {
      ok: false,
      message: '사전에 없는 단어예요.',
      source: 'api',
    };
  } catch (err) {
    console.warn('[hunmin][opendict] fetch failed', err?.message || err);
    return {
      ok: false,
      message: '사전 서버에 연결하지 못했어요.',
      source: 'api_error',
    };
  }
}

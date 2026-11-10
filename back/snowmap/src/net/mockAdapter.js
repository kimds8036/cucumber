import { CONFIG } from "../config.js";
import { createEmitter } from "./emitter.js";

/**
 * 로컬 테스트용 가짜 서버.
 * - 같은 PC·같은 브라우저의 탭끼리 BroadcastChannel로 위치/채팅/게시글을 주고받는다.
 * - 게시글과 최근 채팅은 localStorage에 남아 새로고침해도 보인다.
 * 실제 서버로 옮길 때는 serverAdapter.js가 같은 메서드를 구현하면 된다.
 * @returns {import("./adapter.js").NetAdapter}
 */
export function createMockAdapter() {
  const events = createEmitter();
  const room = CONFIG.NET_ROOM_ID;
  const chatKey = `${room}:chat`;
  // 예전 글 게시판 키(board:)와 분리. 방명록은 획(stroke)만 저장
  const boardKey = (boardId) => `${room}:guestbook:${boardId}`;

  /** @type {BroadcastChannel|null} */
  let channel = null;
  /** @type {import("./adapter.js").Identity|null} */
  let me = null;
  /** @type {import("./adapter.js").PlayerState|null} */
  let lastState = null;
  /** @type {Map<string, number>} userId → 마지막 소식 시각 */
  const peers = new Map();
  let sweepTimer = 0;

  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  function readList(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  }

  function post(msg) {
    channel?.postMessage({ ...msg, from: me?.userId });
  }

  function seen(state) {
    const isNew = !peers.has(state.userId);
    peers.set(state.userId, performance.now());
    if (isNew) events.emit("join", state);
    events.emit("state", state);
  }

  function leave(userId) {
    if (!peers.delete(userId)) return;
    events.emit("leave", userId);
  }

  function onMessage(e) {
    const msg = e.data;
    if (!msg || msg.from === me?.userId) return;
    switch (msg.type) {
      case "hello":
        if (lastState) post({ type: "state", state: lastState });
        break;
      case "state":
        if (msg.state?.userId) seen(msg.state);
        break;
      case "bye":
        leave(msg.from);
        break;
      case "chat":
        events.emit("chat", msg.message);
        break;
      case "stroke":
        events.emit("stroke", msg.boardId, msg.stroke);
        break;
      case "stroke-remove":
        events.emit("stroke-remove", msg.boardId, msg.strokeIds || []);
        break;
      default:
        break;
    }
  }

  function sweep() {
    // 백그라운드 탭은 렌더 루프가 멈춰 sendState가 끊기므로 마지막 상태를 다시 알린다
    if (lastState) post({ type: "state", state: lastState });
    const now = performance.now();
    const timeout = CONFIG.NET_PLAYER_TIMEOUT_SEC * 1000;
    for (const [userId, at] of peers) {
      if (now - at > timeout) leave(userId);
    }
  }

  function onPageHide() {
    post({ type: "bye" });
  }

  return {
    async connect(identity) {
      me = identity;
      channel = new BroadcastChannel(`study-room:${room}`);
      channel.addEventListener("message", onMessage);
      window.addEventListener("pagehide", onPageHide);
      sweepTimer = window.setInterval(sweep, 1000);
      post({ type: "hello" });
      console.info("[net:mock] connected", identity);
    },
    disconnect() {
      post({ type: "bye" });
      window.removeEventListener("pagehide", onPageHide);
      window.clearInterval(sweepTimer);
      channel?.close();
      channel = null;
    },

    sendState(state) {
      lastState = state;
      post({ type: "state", state });
    },
    onPlayerJoin: (cb) => events.on("join", cb),
    onPlayerState: (cb) => events.on("state", cb),
    onPlayerLeave: (cb) => events.on("leave", cb),

    sendChat(text) {
      if (!me) return;
      const message = {
        id: uid(),
        userId: me.userId,
        displayName: me.displayName,
        text,
        createdAt: new Date().toISOString(),
      };
      const list = readList(chatKey);
      list.push(message);
      localStorage.setItem(chatKey, JSON.stringify(list.slice(-CONFIG.CHAT_LOG_KEEP)));
      post({ type: "chat", message });
      events.emit("chat", message);
    },
    onChat: (cb) => events.on("chat", cb),
    async getRecentChat(limit) {
      return readList(chatKey).slice(-limit);
    },

    async listStrokes(boardId) {
      return readList(boardKey(boardId));
    },
    async addStroke(boardId, stroke) {
      if (!me) throw new Error("접속 전입니다");
      const pts = Array.isArray(stroke?.points) ? stroke.points : [];
      if (pts.length < 4) throw new Error("점이 너무 적어요");
      const created = {
        id: uid(),
        boardId,
        authorId: me.userId,
        authorName: me.displayName,
        color: String(stroke.color || "#222222").slice(0, 32),
        width: Math.max(1, Math.min(48, Number(stroke.width) || 4)),
        points: pts.slice(0, CONFIG.BOARD_STROKE_MAX_POINTS * 2),
        createdAt: new Date().toISOString(),
      };
      const list = readList(boardKey(boardId));
      list.push(created);
      localStorage.setItem(boardKey(boardId), JSON.stringify(list.slice(-CONFIG.BOARD_STROKE_KEEP)));
      post({ type: "stroke", boardId, stroke: created });
      events.emit("stroke", boardId, created);
      return created;
    },
    async removeStroke(boardId, strokeId) {
      if (!me) return false;
      const list = readList(boardKey(boardId));
      const next = list.filter((s) => !(s.id === strokeId && s.authorId === me.userId));
      if (next.length === list.length) return false;
      localStorage.setItem(boardKey(boardId), JSON.stringify(next));
      post({ type: "stroke-remove", boardId, strokeIds: [strokeId] });
      events.emit("stroke-remove", boardId, [strokeId]);
      return true;
    },
    async removeMyStrokes(boardId) {
      if (!me) return [];
      const list = readList(boardKey(boardId));
      const mine = list.filter((s) => s.authorId === me.userId).map((s) => s.id);
      if (mine.length === 0) return [];
      const next = list.filter((s) => s.authorId !== me.userId);
      localStorage.setItem(boardKey(boardId), JSON.stringify(next));
      post({ type: "stroke-remove", boardId, strokeIds: mine });
      events.emit("stroke-remove", boardId, mine);
      return mine;
    },
    onStroke: (cb) => events.on("stroke", cb),
    onStrokeRemove: (cb) => events.on("stroke-remove", cb),
  };
}

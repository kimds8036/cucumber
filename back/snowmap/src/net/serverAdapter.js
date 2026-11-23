import { createEmitter } from "./emitter.js";
import { getAuthToken, refreshAuthToken } from "./auth.js";

/**
 * 실제 서버(Railway, back/src) 연결.
 * - 위치·자리·채팅·방 목록·차단·신고: socket.io (back/src/socket/studyCafeEvents.js)
 * - 방명록 획 저장·조회·삭제·신고: REST /api/study-cafe (back/src/routes/studyCafe.js)
 * 페이지가 같은 서버의 /snowmap/ 에서 열리므로 주소는 같은 origin을 쓴다.
 *
 * @param {string|null} [requestedRoomId] 원하는 방. 서버가 정원을 보고 최종 결정한다
 * @returns {import("./adapter.js").NetAdapter & Record<string, any>}
 */
export function createServerAdapter(requestedRoomId = null) {
  const events = createEmitter();
  /** @type {any} */
  let socket = null;
  /** @type {{ id: string, name: string, index: number, capacity: number }|null} */
  let room = null;
  /** @type {{ userId: string, displayName: string, avatarUrl: string|null }|null} */
  let meInfo = null;
  /** @type {any[]} */
  let joinChat = [];
  let lastState = null;
  let gender = "boy";
  let kicked = false;
  /** 지금 화면에 있는 다른 사람 (처음 보면 join 이벤트) */
  const known = new Set();

  function emitPlayer(state) {
    if (!state?.userId) return;
    if (!known.has(state.userId)) {
      known.add(state.userId);
      events.emit("join", state);
    }
    events.emit("state", state);
  }

  /** 재접속 후 서버 목록과 맞춘다. 목록에 없는 사람은 나간 것으로 처리 */
  function syncPlayers(list) {
    const next = new Set((list || []).map((p) => p.userId));
    for (const id of [...known]) {
      if (!next.has(id)) {
        known.delete(id);
        events.emit("leave", id);
      }
    }
    for (const p of list || []) emitPlayer(p);
  }

  function emitAck(event, payload, timeoutMs = 8000) {
    return new Promise((resolve) => {
      if (!socket?.connected) {
        resolve({ ok: false, error: "disconnected" });
        return;
      }
      socket.timeout(timeoutMs).emit(event, payload, (err, res) => {
        if (err) resolve({ ok: false, error: "timeout" });
        else resolve(res || { ok: false });
      });
    });
  }

  async function join() {
    const res = await emitAck("cafe:join", {
      roomId: room?.id || requestedRoomId || null,
      gender,
      state: lastState,
    });
    if (!res?.ok) return res;
    room = res.room;
    meInfo = res.me;
    joinChat = Array.isArray(res.chat) ? res.chat : [];
    syncPlayers(res.players);
    return res;
  }

  /** REST 호출. 401이면 토큰을 새로 받아 한 번 더 시도한다 */
  async function api(method, path, body) {
    const run = async () => {
      const token = getAuthToken();
      const res = await fetch(`/api/study-cafe${path}`, {
        method,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      let json = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      return { res, json };
    };
    let { res, json } = await run();
    if (res.status === 401 && (await refreshAuthToken())) {
      ({ res, json } = await run());
    }
    if (!res.ok || json?.success === false) {
      const err = new Error(json?.message || `요청 실패 (${res.status})`);
      /** @type {any} */ (err).status = res.status;
      /** @type {any} */ (err).code = json?.code || null;
      throw err;
    }
    return json?.data ?? {};
  }

  /**
   * 방명록 API. 소켓이 잠깐 끊겼다 붙는 사이에는 서버가 "방에 없음(NOT_IN_ROOM)"으로 거절한다.
   * 그때는 방에 다시 들어간 뒤 한 번 더 시도한다.
   */
  async function boardApi(method, makePath, body) {
    try {
      return await api(method, makePath(), body);
    } catch (err) {
      if (/** @type {any} */ (err).code !== "NOT_IN_ROOM" || kicked) throw err;
      const res = await join();
      if (!res?.ok) throw err;
      return api(method, makePath(), body);
    }
  }

  function boardPath(boardId) {
    if (!room) throw new Error("방에 아직 들어가지 않았어요");
    return `/rooms/${encodeURIComponent(room.id)}/boards/${encodeURIComponent(boardId)}/strokes`;
  }

  return {
    isServer: true,
    get roomId() {
      return room?.id || requestedRoomId || null;
    },
    get room() {
      return room;
    },
    get me() {
      return meInfo;
    },

    async connect(identity) {
      gender = identity?.gender === "girl" ? "girl" : "boy";
      const { io } = await import("/socket.io/socket.io.esm.min.js");
      socket = io(window.location.origin, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        auth: (cb) => cb({ token: getAuthToken() }),
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 10000,
      });

      let authRetries = 0;
      let firstJoin = null;
      const firstJoinDone = new Promise((resolve, reject) => {
        firstJoin = { resolve, reject };
      });

      socket.on("connect", async () => {
        authRetries = 0;
        const res = await join();
        if (firstJoin) {
          const done = firstJoin;
          firstJoin = null;
          if (res?.ok) done.resolve(res);
          else {
            const err = new Error(res?.message || "스터디 카페에 들어가지 못했어요");
            /** @type {any} */ (err).code = res?.error || null;
            done.reject(err);
          }
        } else if (!res?.ok) {
          console.warn("[net:server] 재입장 실패", res);
        }
      });

      socket.on("connect_error", async (err) => {
        const code = err?.data?.code;
        console.warn("[net:server] connect_error", code || err?.message);
        // 인증 실패는 socket.io가 다시 붙지 않는다. 토큰을 새로 받고 직접 다시 연결한다.
        if ((code === "TOKEN_EXPIRED" || code === "INVALID_TOKEN") && authRetries < 2) {
          authRetries += 1;
          if (await refreshAuthToken()) {
            socket.connect();
            return;
          }
        }
        if (code && firstJoin) {
          const done = firstJoin;
          firstJoin = null;
          done.reject(new Error(err?.message || "서버에 연결하지 못했어요"));
        }
      });

      socket.on("cafe:player:state", (state) => emitPlayer(state));
      socket.on("cafe:player:leave", ({ userId } = {}) => {
        if (!userId || !known.delete(userId)) return;
        events.emit("leave", userId);
      });
      socket.on("cafe:chat", (msg) => events.emit("chat", msg));
      socket.on("cafe:stroke", ({ boardId, stroke } = {}) => {
        if (boardId && stroke) events.emit("stroke", boardId, stroke);
      });
      socket.on("cafe:stroke:remove", ({ boardId, strokeIds } = {}) => {
        if (boardId) events.emit("stroke-remove", boardId, strokeIds || []);
      });
      socket.on("cafe:seat:denied", (payload) => events.emit("seat-denied", payload || {}));
      socket.on("cafe:kicked", (payload) => {
        kicked = true;
        socket.disconnect();
        events.emit("kicked", payload || {});
      });

      const timeout = new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error("서버 연결이 너무 오래 걸려요")), 15000);
      });
      await Promise.race([firstJoinDone, timeout]);
      console.info("[net:server] connected", { room: room?.id, me: meInfo?.userId });
    },

    disconnect() {
      socket?.emit("cafe:leave");
      socket?.disconnect();
      socket = null;
    },

    sendState(state) {
      lastState = state;
      if (state?.gender) gender = state.gender;
      if (!socket?.connected || kicked) return;
      // 위치는 늦게 가느니 버리는 편이 낫다
      socket.volatile.emit("cafe:state", state);
    },
    onPlayerJoin: (cb) => events.on("join", cb),
    onPlayerState: (cb) => events.on("state", cb),
    onPlayerLeave: (cb) => events.on("leave", cb),

    sendChat(text) {
      emitAck("cafe:chat", { text }).then((res) => {
        if (!res?.ok) events.emit("chat-error", res?.error || "failed");
      });
    },
    onChat: (cb) => events.on("chat", cb),
    onChatError: (cb) => events.on("chat-error", cb),
    async getRecentChat(limit) {
      return joinChat.slice(-limit);
    },

    async listStrokes(boardId) {
      const data = await boardApi("GET", () => boardPath(boardId));
      return Array.isArray(data.strokes) ? data.strokes : [];
    },
    async addStroke(boardId, stroke) {
      const data = await boardApi("POST", () => boardPath(boardId), {
        color: stroke.color,
        width: stroke.width,
        points: stroke.points,
      });
      // 다른 사람에게는 소켓으로 간다. 나에게도 소켓으로 오지만 board.js가 id로 중복을 거른다.
      if (data.stroke) events.emit("stroke", boardId, data.stroke);
      return data.stroke;
    },
    async removeStroke(boardId, strokeId) {
      await boardApi("DELETE", () => `${boardPath(boardId)}/${encodeURIComponent(strokeId)}`);
      events.emit("stroke-remove", boardId, [String(strokeId)]);
      return true;
    },
    async removeMyStrokes(boardId) {
      const data = await boardApi("DELETE", () => `${boardPath(boardId)}/mine`);
      const ids = Array.isArray(data.strokeIds) ? data.strokeIds : [];
      if (ids.length) events.emit("stroke-remove", boardId, ids);
      return ids;
    },
    onStroke: (cb) => events.on("stroke", cb),
    onStrokeRemove: (cb) => events.on("stroke-remove", cb),

    /** 방 목록·인원 (방 이동 패널) */
    async listRooms() {
      const res = await emitAck("cafe:rooms", {});
      return res?.ok && Array.isArray(res.rooms) ? res.rooms : null;
    },
    onSeatDenied: (cb) => events.on("seat-denied", cb),
    onKicked: (cb) => events.on("kicked", cb),
    /** @param {string} userId */
    block(userId) {
      return emitAck("cafe:block", { userId });
    },
    /** @param {string} userId @param {string} [reason] */
    report(userId, reason) {
      return emitAck("cafe:report", { userId, reason });
    },
    /** 방명록 획 신고 */
    async reportStroke(strokeId, reason, description) {
      try {
        await api("POST", `/strokes/${encodeURIComponent(strokeId)}/report`, {
          reason,
          ...(description ? { description } : {}),
        });
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          code: /** @type {any} */ (err).code || null,
          message: err?.message || "신고하지 못했어요",
        };
      }
    },
  };
}

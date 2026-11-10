import { CONFIG } from "../config.js";
import { createEmitter } from "./emitter.js";

/**
 * 기존 서버 연결용 어댑터 (이식 지점).
 * config.js에서 NET_ADAPTER: "server" 로 바꾸면 이 파일이 쓰인다.
 *
 * 할 일 (docs/social-features-plan.md 11장):
 * 1. connect: 기존 서버 소켓/채널에 접속하고 room(CONFIG.NET_ROOM_ID)에 입장
 * 2. 서버 메시지를 아래 이벤트로 변환해 events.emit 호출
 *      입장  → events.emit("join", PlayerState)
 *      위치  → events.emit("state", PlayerState)
 *      퇴장  → events.emit("leave", userId)
 *      채팅  → events.emit("chat", ChatMessage)
 *      획 추가 → events.emit("stroke", boardId, BoardStroke)
 *      획 삭제 → events.emit("stroke-remove", boardId, strokeIds[])
 * 3. send* / listStrokes / addStroke / removeStroke / removeMyStrokes 를 서버 API로 연결
 * 서버는 removeStroke 시 authorId === 요청자인지 반드시 검증한다.
 * @param {string} [roomId]
 * @returns {import("./adapter.js").NetAdapter}
 */
export function createServerAdapter(roomId = CONFIG.NET_ROOM_ID) {
  const events = createEmitter();
  const room = roomId || CONFIG.NET_ROOM_ID;
  /** @type {WebSocket|null} */
  let socket = null;

  function send(type, payload) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, ...payload }));
  }

  return {
    roomId: room,
    async connect(identity) {
      // TODO(이식): 기존 서버 주소/인증 방식으로 교체
      // socket = new WebSocket(`wss://YOUR_SERVER/rooms/${room}?token=...`);
      // socket.addEventListener("message", (e) => {
      //   const msg = JSON.parse(e.data);
      //   if (msg.type === "join") events.emit("join", msg.state);
      //   else if (msg.type === "state") events.emit("state", msg.state);
      //   else if (msg.type === "leave") events.emit("leave", msg.userId);
      //   else if (msg.type === "chat") events.emit("chat", msg.message);
      //   else if (msg.type === "stroke:new") events.emit("stroke", msg.boardId, msg.stroke);
      //   else if (msg.type === "stroke:remove") events.emit("stroke-remove", msg.boardId, msg.strokeIds);
      // });
      console.warn("[net:server] 아직 연결 코드가 없습니다 — src/net/serverAdapter.js TODO 참고", {
        room,
        identity,
      });
    },
    disconnect() {
      socket?.close();
      socket = null;
    },

    sendState(state) {
      send("state", { state });
    },
    onPlayerJoin: (cb) => events.on("join", cb),
    onPlayerState: (cb) => events.on("state", cb),
    onPlayerLeave: (cb) => events.on("leave", cb),

    sendChat(text) {
      send("chat", { text });
    },
    onChat: (cb) => events.on("chat", cb),
    async getRecentChat(limit) {
      // TODO(이식): return (await fetch(`/api/rooms/${CONFIG.NET_ROOM_ID}/chat?limit=${limit}`)).json();
      return [];
    },

    async listStrokes(boardId) {
      // TODO(이식): return (await fetch(`/api/boards/${boardId}/strokes`)).json();
      return [];
    },
    async addStroke(boardId, stroke) {
      // TODO(이식): 서버에 저장하고 저장된 BoardStroke를 돌려받기
      // const res = await fetch(`/api/boards/${boardId}/strokes`, {
      //   method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(stroke),
      // });
      // return res.json();
      throw new Error("서버 어댑터가 아직 연결되지 않았습니다");
    },
    async removeStroke(boardId, strokeId) {
      // TODO(이식): 서버가 authorId를 검증한 뒤 삭제. 성공 여부 boolean
      // const res = await fetch(`/api/boards/${boardId}/strokes/${strokeId}`, { method: "DELETE" });
      // return res.ok;
      throw new Error("서버 어댑터가 아직 연결되지 않았습니다");
    },
    async removeMyStrokes(boardId) {
      // TODO(이식): 내 획만 일괄 삭제. 삭제된 id 배열 반환
      // const res = await fetch(`/api/boards/${boardId}/strokes/mine`, { method: "DELETE" });
      // return res.json();
      throw new Error("서버 어댑터가 아직 연결되지 않았습니다");
    },
    onStroke: (cb) => events.on("stroke", cb),
    onStrokeRemove: (cb) => events.on("stroke-remove", cb),
  };
}

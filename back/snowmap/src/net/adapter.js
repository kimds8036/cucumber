import { CONFIG } from "../config.js";
import { createMockAdapter } from "./mockAdapter.js";
import { createServerAdapter } from "./serverAdapter.js";

/**
 * 네트워크 어댑터 인터페이스. 게임 코드는 이 메서드만 쓴다(서버 종류를 모름).
 * 메시지 형식은 docs/social-features-plan.md 1-2 참고.
 *
 * @typedef {{ userId: string, displayName: string }} Identity
 * @typedef {{
 *   userId: string, displayName: string, gender: "boy"|"girl",
 *   x: number, y: number, z: number, yaw: number,
 *   anim: "stay"|"walk"|"run"|"sit"|"lay"|"sitHi", seatId: string|null, t: number
 * }} PlayerState
 * @typedef {{ id: string, userId: string, displayName: string, text: string, createdAt: string, system?: boolean }} ChatMessage
 * @typedef {{
 *   id: string, boardId: string, authorId: string, authorName: string,
 *   color: string, width: number, points: number[], createdAt: string
 * }} BoardStroke
 * // points는 [x0,y0,x1,y1,...] — 캔버스 논리 좌표(BOARD_CANVAS_W/H 기준)
 *
 * @typedef {{
 *   connect(identity: Identity): Promise<void>,
 *   disconnect(): void,
 *   sendState(state: PlayerState): void,
 *   onPlayerJoin(cb: (state: PlayerState) => void): void,
 *   onPlayerState(cb: (state: PlayerState) => void): void,
 *   onPlayerLeave(cb: (userId: string) => void): void,
 *   sendChat(text: string): void,
 *   onChat(cb: (msg: ChatMessage) => void): void,
 *   getRecentChat(limit: number): Promise<ChatMessage[]>,
 *   listStrokes(boardId: string): Promise<BoardStroke[]>,
 *   addStroke(boardId: string, stroke: { color: string, width: number, points: number[] }): Promise<BoardStroke>,
 *   removeStroke(boardId: string, strokeId: string): Promise<boolean>,
 *   removeMyStrokes(boardId: string): Promise<string[]>,
 *   onStroke(cb: (boardId: string, stroke: BoardStroke) => void): void,
 *   onStrokeRemove(cb: (boardId: string, strokeIds: string[]) => void): void,
 * }} NetAdapter
 */

/** @param {string} [roomId] @returns {NetAdapter & { roomId?: string }} */
export function createNetAdapter(roomId) {
  if (CONFIG.NET_ADAPTER === "server") return createServerAdapter(roomId);
  return createMockAdapter(roomId || CONFIG.NET_ROOM_ID);
}

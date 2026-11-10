import { CONFIG } from "../config.js";

const COLORS = ["#222222", "#e74c3c", "#e67e22", "#2ecc71", "#3498db", "#9b59b6", "#ffffff"];

/**
 * 방명록(그림판). 큰 캔버스에 그리고, 지우개는 본인이 그린 획만 지운다.
 * @param {import("../net/adapter.js").NetAdapter} net
 * @param {import("../net/adapter.js").Identity} me
 * @param {{ onOpenChange?: (open: boolean) => void }} [hooks]
 */
export function createBoardUI(net, me, hooks = {}) {
  const modal = document.getElementById("board-modal");
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("board-canvas"));
  const ctx = canvas.getContext("2d");
  const closeBtn = document.getElementById("board-close");
  const hint = document.getElementById("board-hint");
  const error = document.getElementById("board-error");
  const toolBtns = /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll("[data-board-tool]"));
  const colorBtns = /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll("[data-board-color]"));
  const clearMineBtn = document.getElementById("board-clear-mine");
  const sizeInput = /** @type {HTMLInputElement} */ (document.getElementById("board-size"));

  const W = CONFIG.BOARD_CANVAS_W;
  const H = CONFIG.BOARD_CANVAS_H;
  canvas.width = W;
  canvas.height = H;

  /** @type {string|null} */
  let boardId = null;
  /** @type {import("../net/adapter.js").BoardStroke[]} */
  let strokes = [];
  /** @type {"pen"|"eraser"} */
  let tool = "pen";
  let color = COLORS[0];
  let penWidth = CONFIG.BOARD_PEN_WIDTH;
  /** @type {number[]|null} */
  let draft = null;
  let pointerId = null;
  let sending = false;
  /** 지우개로 이미 지운 획(드래그 중 중복 요청 방지) */
  const erasing = new Set();

  function setError(text) {
    error.textContent = text || "";
  }

  function refreshTools() {
    for (const btn of toolBtns) btn.classList.toggle("active", btn.dataset.boardTool === tool);
    for (const btn of colorBtns) btn.classList.toggle("active", btn.dataset.boardColor === color);
    canvas.style.cursor = tool === "eraser" ? "cell" : "crosshair";
    hint.textContent =
      tool === "eraser"
        ? "지우개: 내가 그린 선만 지워져요"
        : "펜으로 그리고, 손을 떼면 바로 저장돼요";
  }

  function drawStroke(stroke, g = ctx) {
    const pts = stroke.points;
    if (!pts || pts.length < 4) return;
    g.strokeStyle = stroke.color;
    g.lineWidth = stroke.width;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.stroke();
  }

  function redraw() {
    ctx.fillStyle = "#f4efe6";
    ctx.fillRect(0, 0, W, H);
    // 옅은 격자 — 방명록 느낌
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    for (let x = 40; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 40; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (const s of strokes) drawStroke(s);
    if (draft && draft.length >= 4) {
      drawStroke({ color, width: penWidth, points: draft });
    }
  }

  function toCanvas(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const qx = x1 + t * dx;
    const qy = y1 + t * dy;
    return Math.hypot(px - qx, py - qy);
  }

  function hitMyStroke(x, y) {
    const r = CONFIG.BOARD_ERASER_RADIUS;
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      if (s.authorId !== me.userId) continue;
      if (erasing.has(s.id)) continue;
      const pts = s.points;
      const pad = r + s.width * 0.5;
      for (let j = 0; j < pts.length - 2; j += 2) {
        if (distToSegment(x, y, pts[j], pts[j + 1], pts[j + 2], pts[j + 3]) <= pad) return s;
      }
      if (pts.length === 2 && Math.hypot(x - pts[0], y - pts[1]) <= pad) return s;
    }
    return null;
  }

  async function eraseAt(x, y) {
    const hit = hitMyStroke(x, y);
    if (!hit || !boardId) return;
    erasing.add(hit.id);
    try {
      const ok = await net.removeStroke(boardId, hit.id);
      if (!ok) erasing.delete(hit.id);
    } catch (err) {
      erasing.delete(hit.id);
      setError("지우지 못했어요");
      console.error("[board] erase", err);
    }
  }

  async function commitDraft() {
    if (!boardId || !draft || draft.length < 4 || sending) {
      draft = null;
      redraw();
      return;
    }
    const points = draft.map((n) => +n.toFixed(1));
    draft = null;
    sending = true;
    setError("");
    try {
      await net.addStroke(boardId, { color, width: penWidth, points });
    } catch (err) {
      setError("저장하지 못했어요");
      console.error("[board] stroke", err);
      redraw();
    } finally {
      sending = false;
    }
  }

  function onPointerDown(e) {
    if (!boardId || e.button !== 0) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    pointerId = e.pointerId;
    const { x, y } = toCanvas(e);
    if (tool === "eraser") {
      eraseAt(x, y);
      return;
    }
    draft = [x, y];
    redraw();
  }

  function onPointerMove(e) {
    if (pointerId !== e.pointerId) return;
    const { x, y } = toCanvas(e);
    if (tool === "eraser") {
      eraseAt(x, y);
      return;
    }
    if (!draft) return;
    const lastX = draft[draft.length - 2];
    const lastY = draft[draft.length - 1];
    if (Math.hypot(x - lastX, y - lastY) < 1.2) return;
    if (draft.length >= CONFIG.BOARD_STROKE_MAX_POINTS * 2) return;
    draft.push(x, y);
    redraw();
  }

  async function onPointerUp(e) {
    if (pointerId !== e.pointerId) return;
    pointerId = null;
    if (tool === "pen") await commitDraft();
  }

  function upsertStroke(stroke) {
    if (strokes.some((s) => s.id === stroke.id)) return;
    strokes.push(stroke);
    redraw();
  }

  function dropStrokes(ids) {
    const set = new Set(ids);
    const before = strokes.length;
    strokes = strokes.filter((s) => !set.has(s.id));
    for (const id of ids) erasing.delete(id);
    if (strokes.length !== before) redraw();
  }

  async function open(id) {
    boardId = id;
    modal.hidden = false;
    setError("");
    draft = null;
    erasing.clear();
    tool = "pen";
    refreshTools();
    hooks.onOpenChange?.(true);
    strokes = [];
    redraw();
    try {
      strokes = await net.listStrokes(id);
    } catch (err) {
      setError("방명록을 불러오지 못했어요");
      console.error("[board] list", err);
    }
    if (boardId === id) redraw();
  }

  function close() {
    if (modal.hidden) return;
    modal.hidden = true;
    boardId = null;
    draft = null;
    pointerId = null;
    hooks.onOpenChange?.(false);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  for (const btn of toolBtns) {
    btn.addEventListener("click", () => {
      tool = /** @type {"pen"|"eraser"} */ (btn.dataset.boardTool);
      refreshTools();
    });
  }
  for (const btn of colorBtns) {
    btn.addEventListener("click", () => {
      color = btn.dataset.boardColor || color;
      tool = "pen";
      refreshTools();
    });
  }
  sizeInput.addEventListener("input", () => {
    penWidth = Number(sizeInput.value) || CONFIG.BOARD_PEN_WIDTH;
  });
  clearMineBtn.addEventListener("click", async () => {
    if (!boardId) return;
    try {
      await net.removeMyStrokes(boardId);
      setError("");
    } catch (err) {
      setError("지우지 못했어요");
      console.error("[board] clear mine", err);
    }
  });
  closeBtn.addEventListener("click", close);
  modal.addEventListener("pointerdown", (e) => {
    if (e.target === modal) close();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) {
      e.preventDefault();
      close();
    }
  });

  net.onStroke((id, stroke) => {
    if (id === boardId) upsertStroke(stroke);
  });
  net.onStrokeRemove((id, ids) => {
    if (id === boardId) dropStrokes(ids);
  });

  sizeInput.value = String(penWidth);
  refreshTools();
  redraw();

  return {
    open,
    close,
    get isOpen() {
      return !modal.hidden;
    },
  };
}

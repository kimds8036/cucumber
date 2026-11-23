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
  /** 그림판 위에 잠깐 떴다 사라지는 안내·오류 */
  const notice = document.getElementById("board-notice");
  const toolBtns = /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll("[data-board-tool]"));
  const colorBtns = /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll("[data-board-color]"));
  const clearMineBtn = document.getElementById("board-clear-mine");
  /** 굵기 세 단계 버튼 (가늘게·보통·굵게) */
  const sizeBtns = /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll("[data-board-size]"));

  const W = CONFIG.BOARD_CANVAS_W;
  const H = CONFIG.BOARD_CANVAS_H;
  canvas.width = W;
  canvas.height = H;

  /** @type {string|null} */
  let boardId = null;
  /** @type {import("../net/adapter.js").BoardStroke[]} */
  let strokes = [];
  /** @type {"pen"|"eraser"|"report"} */
  let tool = "pen";
  /** 서버 모드에서만 신고 도구를 보여 준다 */
  const canReport = typeof net.reportStroke === "function";
  const reportToolBtn = document.getElementById("board-tool-report");
  if (reportToolBtn) reportToolBtn.hidden = !canReport;
  /** 신고한 획 (내 화면에서는 바로 숨긴다) */
  const reportedStrokeIds = new Set();
  let color = COLORS[0];
  let penWidth = CONFIG.BOARD_PEN_WIDTH;
  /** @type {number[]|null} */
  let draft = null;
  let pointerId = null;
  let sending = false;
  /** 저장을 기다리는 획. 저장 중에 그린 획도 버리지 않고 차례로 보낸다 */
  /** @type {{ boardId: string, color: string, width: number, points: number[] }[]} */
  const outbox = [];
  /** 지우개로 이미 지운 획(드래그 중 중복 요청 방지) */
  const erasing = new Set();

  let noticeTimer = 0;
  /**
   * @param {string} text
   * @param {{ error?: boolean, ms?: number }} [opts]
   */
  function showNotice(text, { error = false, ms = 2600 } = {}) {
    if (!notice) return;
    window.clearTimeout(noticeTimer);
    if (!text) {
      notice.classList.remove("show");
      return;
    }
    notice.textContent = text;
    notice.classList.toggle("error", error);
    notice.classList.add("show");
    noticeTimer = window.setTimeout(() => notice.classList.remove("show"), ms);
  }

  function setError(text) {
    if (text) showNotice(text, { error: true, ms: 3200 });
  }

  function toolHint() {
    if (tool === "eraser") return "지우개: 내가 그린 선만 지워져요";
    if (tool === "report") return "누가 그렸는지 표시했어요. 신고할 그림의 테두리 안을 눌러 주세요";
    return "펜으로 그리고, 손을 떼면 바로 저장돼요";
  }

  function refreshTools() {
    for (const btn of toolBtns) btn.classList.toggle("active", btn.dataset.boardTool === tool);
    for (const btn of colorBtns) btn.classList.toggle("active", btn.dataset.boardColor === color);
    for (const btn of sizeBtns) btn.classList.toggle("active", Number(btn.dataset.boardSize) === penWidth);
    canvas.style.cursor = tool === "pen" ? "crosshair" : tool === "report" ? "pointer" : "cell";
  }

  /** 도구를 바꿀 때 안내를 잠깐 보여 주고 다시 그린다 (신고 모드는 테두리가 생긴다) */
  function selectTool(next) {
    const changed = tool !== next;
    tool = next;
    refreshTools();
    if (changed) {
      showNotice(toolHint(), { ms: next === "report" ? 4000 : 2400 });
      redraw();
    }
  }

  // ── 신고 모드: 다른 사람 그림을 그린 사람별·붙어 있는 선끼리 묶어 테두리와 이름표를 보여 준다 ──

  /** 묶음 캐시. 획이 바뀌면 다시 계산한다 */
  let groupCache = null;
  function invalidateGroups() {
    groupCache = null;
  }

  function strokeBox(stroke) {
    const pts = stroke.points || [];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i + 1 < pts.length; i += 2) {
      if (pts[i] < minX) minX = pts[i];
      if (pts[i] > maxX) maxX = pts[i];
      if (pts[i + 1] < minY) minY = pts[i + 1];
      if (pts[i + 1] > maxY) maxY = pts[i + 1];
    }
    const pad = (Number(stroke.width) || 4) / 2;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  function boxesNear(a, b, gap) {
    return !(a.maxX + gap < b.minX || b.maxX + gap < a.minX || a.maxY + gap < b.minY || b.maxY + gap < a.minY);
  }

  /**
   * 다른 사람 획을 [그린 사람 → 서로 가까운 선끼리] 묶는다.
   * @returns {{ authorId: string, authorName: string, strokes: any[], box: { minX: number, minY: number, maxX: number, maxY: number } }[]}
   */
  function reportGroups() {
    if (groupCache) return groupCache;
    const byAuthor = new Map();
    for (const s of strokes) {
      if (String(s.authorId) === String(me.userId)) continue;
      if (reportedStrokeIds.has(s.id) || !s.points || s.points.length < 4) continue;
      const key = String(s.authorId);
      if (!byAuthor.has(key)) byAuthor.set(key, []);
      byAuthor.get(key).push(s);
    }
    const groups = [];
    const GAP = CONFIG.BOARD_REPORT_GROUP_GAP;
    for (const [authorId, list] of byAuthor) {
      /** @type {{ strokes: any[], box: any }[]} */
      let clusters = [];
      for (const s of list) {
        const box = strokeBox(s);
        const merged = { strokes: [s], box };
        // 가까운 묶음은 모두 하나로 합친다
        clusters = clusters.filter((c) => {
          if (!boxesNear(c.box, merged.box, GAP)) return true;
          merged.strokes.push(...c.strokes);
          merged.box = {
            minX: Math.min(c.box.minX, merged.box.minX),
            minY: Math.min(c.box.minY, merged.box.minY),
            maxX: Math.max(c.box.maxX, merged.box.maxX),
            maxY: Math.max(c.box.maxY, merged.box.maxY),
          };
          return false;
        });
        clusters.push(merged);
      }
      const authorName = list[list.length - 1].authorName || "알 수 없음";
      for (const c of clusters) groups.push({ authorId, authorName, ...c });
    }
    groupCache = groups;
    return groups;
  }

  /** 사람마다 다른 색. 아이디가 비슷해도(u2, u3) 색이 고르게 벌어지도록 섞은 뒤 황금각으로 나눈다 */
  function authorColor(authorId) {
    let hash = 2166136261;
    const s = String(authorId || "");
    for (let i = 0; i < s.length; i += 1) {
      hash ^= s.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const hue = Math.round(((hash >>> 0) * 137.508) % 360);
    return `hsl(${hue}, 72%, 42%)`;
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function drawReportOverlay() {
    const PAD = 10;
    ctx.save();
    for (const group of reportGroups()) {
      const col = authorColor(group.authorId);
      const x = Math.max(2, group.box.minX - PAD);
      const y = Math.max(2, group.box.minY - PAD);
      const w = Math.min(W - 2, group.box.maxX + PAD) - x;
      const h = Math.min(H - 2, group.box.maxY + PAD) - y;
      roundRect(ctx, x, y, w, h, 10);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fill();
      ctx.setLineDash([10, 7]);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = col;
      ctx.stroke();
      ctx.setLineDash([]);

      // 이름표: 테두리 왼쪽 위. 캔버스 밖으로 나가지 않게 안쪽으로 붙인다
      const label = `@${String(group.authorName).replace(/^@/, "")}`;
      ctx.font = "700 22px 'Segoe UI', system-ui, sans-serif";
      const tw = Math.min(ctx.measureText(label).width, 360);
      const lw = tw + 20;
      const lh = 32;
      let lx = Math.min(Math.max(2, x), W - lw - 2);
      let ly = y - lh - 4;
      if (ly < 2) ly = Math.min(y + 4, H - lh - 2);
      roundRect(ctx, lx, ly, lw, lh, 16);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(label, lx + 10, ly + lh / 2 + 1, tw);
    }
    ctx.restore();
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
    for (const s of strokes) if (!reportedStrokeIds.has(s.id)) drawStroke(s);
    for (const s of outbox) if (s.boardId === boardId) drawStroke(s);
    if (draft && draft.length >= 4) {
      drawStroke({ color, width: penWidth, points: draft });
    }
    if (tool === "report") drawReportOverlay();
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

  /** @param {boolean} [mine] true면 내 획, false면 남의 획 */
  function hitStroke(x, y, mine = true) {
    const r = CONFIG.BOARD_ERASER_RADIUS;
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      if ((String(s.authorId) === String(me.userId)) !== mine) continue;
      if (reportedStrokeIds.has(s.id)) continue;
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

  function hitMyStroke(x, y) {
    return hitStroke(x, y, true);
  }

  /** 누른 곳의 그림 묶음. 선을 정확히 짚었으면 그 선의 묶음, 아니면 테두리 안에 든 가장 작은 묶음 */
  function groupAt(x, y) {
    const groups = reportGroups();
    const hit = hitStroke(x, y, false);
    if (hit) {
      const g = groups.find((group) => group.strokes.includes(hit));
      if (g) return { group: g, stroke: hit };
    }
    const PAD = 10;
    let best = null;
    let bestArea = Infinity;
    for (const g of groups) {
      const b = g.box;
      if (x < b.minX - PAD || x > b.maxX + PAD || y < b.minY - PAD || y > b.maxY + PAD) continue;
      const area = (b.maxX - b.minX) * (b.maxY - b.minY);
      if (area < bestArea) {
        best = g;
        bestArea = area;
      }
    }
    if (!best) return null;
    // 대표 선: 점이 가장 많은 선
    const stroke = best.strokes.reduce((a, b) => (b.points.length > a.points.length ? b : a));
    return { group: best, stroke };
  }

  let reporting = false;
  async function reportAt(x, y) {
    if (reporting) return;
    const found = groupAt(x, y);
    if (!found) {
      showNotice("신고할 그림의 테두리 안을 눌러 주세요", { ms: 2000 });
      return;
    }
    const { group, stroke } = found;
    const name = `@${String(group.authorName).replace(/^@/, "")}`;
    const count = group.strokes.length;
    if (!window.confirm(`${name} 님의 그림을 신고할까요?${count > 1 ? `\n(선 ${count}개)` : ""}`)) return;
    reporting = true;
    try {
      const otherIds = group.strokes.map((s) => s.id).filter((id) => id !== stroke.id);
      const description = otherIds.length ? `같은 그림의 다른 선 id: ${otherIds.slice(0, 50).join(", ")}` : "";
      const res = await net.reportStroke(stroke.id, "부적절한 그림", description);
      if (res?.ok || res?.code === "ALREADY_REPORTED") {
        // 신고한 그림은 내 화면에서 바로 숨긴다
        for (const s of group.strokes) reportedStrokeIds.add(s.id);
        invalidateGroups();
        redraw();
        showNotice(res?.ok ? "신고했어요. 운영진이 확인할게요." : "이미 신고한 그림이에요.");
      } else {
        setError(res?.message || "신고하지 못했어요");
      }
    } finally {
      reporting = false;
    }
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

  async function flushOutbox() {
    if (sending) return;
    sending = true;
    try {
      while (outbox.length) {
        const item = outbox[0];
        try {
          await net.addStroke(item.boardId, {
            color: item.color,
            width: item.width,
            points: item.points,
          });
        } catch (err) {
          setError("저장하지 못했어요");
          console.error("[board] stroke", err);
        }
        outbox.shift();
        redraw();
      }
    } finally {
      sending = false;
    }
  }

  function commitDraft() {
    if (!boardId || !draft || draft.length < 4) {
      draft = null;
      redraw();
      return;
    }
    const points = draft.map((n) => +n.toFixed(1));
    draft = null;
    setError("");
    outbox.push({ boardId, color, width: penWidth, points });
    redraw();
    flushOutbox();
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
    if (tool === "report") {
      pointerId = null;
      reportAt(x, y);
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
    if (tool === "pen") commitDraft();
  }

  function upsertStroke(stroke) {
    if (strokes.some((s) => s.id === stroke.id)) return;
    strokes.push(stroke);
    invalidateGroups();
    redraw();
  }

  function dropStrokes(ids) {
    const set = new Set(ids);
    const before = strokes.length;
    strokes = strokes.filter((s) => !set.has(s.id));
    for (const id of ids) erasing.delete(id);
    if (strokes.length !== before) {
      invalidateGroups();
      redraw();
    }
  }

  async function open(id) {
    boardId = id;
    modal.hidden = false;
    draft = null;
    erasing.clear();
    tool = "pen";
    refreshTools();
    showNotice(toolHint());
    hooks.onOpenChange?.(true);
    strokes = [];
    invalidateGroups();
    redraw();
    try {
      const loaded = await net.listStrokes(id);
      if (boardId === id) {
        // 불러오는 동안 실시간으로 들어온 획은 버리지 않고 합친다
        const known = new Set(loaded.map((stroke) => stroke.id));
        strokes = [...loaded, ...strokes.filter((stroke) => !known.has(stroke.id))];
        invalidateGroups();
      }
    } catch (err) {
      // 원인을 알 수 있게 서버가 준 이유(방에 없음 등)나 상태 코드를 붙인다
      const status = /** @type {any} */ (err)?.status;
      const reason = status && status < 500 ? err?.message : null;
      setError(reason || `방명록을 불러오지 못했어요${status ? ` (${status})` : ""}`);
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
      selectTool(/** @type {"pen"|"eraser"|"report"} */ (btn.dataset.boardTool));
    });
  }
  for (const btn of colorBtns) {
    btn.addEventListener("click", () => {
      color = btn.dataset.boardColor || color;
      selectTool("pen");
      refreshTools();
    });
  }
  for (const btn of sizeBtns) {
    btn.addEventListener("click", () => {
      penWidth = Number(btn.dataset.boardSize) || CONFIG.BOARD_PEN_WIDTH;
      selectTool("pen");
      refreshTools();
    });
  }
  clearMineBtn.addEventListener("click", async () => {
    if (!boardId) return;
    try {
      await net.removeMyStrokes(boardId);
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

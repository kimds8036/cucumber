/**
 * 연결 진단 표시창. 다른 사람이 안 움직여 보일 때 원인을 좁히는 용도.
 * 켜기: 위쪽 가운데 사용자 탭(#user-roster)을 2초 꾹 누르기, 또는 주소에 ?debug=net
 *
 * 보는 법
 * - 연결 X                 → 내 폰 소켓이 끊김 (재연결 대기)
 * - 연결 O, 받음 N초 전이 계속 커짐 → 연결은 살아 있다고 나오는데 아무것도 안 옴 (멎은 연결 / 서버가 안 보냄)
 * - 특정 사람만 N초 전이 커짐 → 그 사람 폰이 안 보내고 있음 (그 사람 쪽 문제)
 * - 끊김·재연결 횟수가 자꾸 오름 → 망이 불안정
 * - 강제재연결이 오름 → 안전장치가 멎은 연결을 찾아 다시 붙였음 (원인 1: 조용히 죽은 연결)
 * - 재입장이 오름 → 서버에서 방에서 빠져 있었음 (원인: 서버 쪽 입장 정보 유실)
 */
export function createNetHud() {
  const el = document.createElement("div");
  el.id = "net-hud";
  el.hidden = true;
  Object.assign(el.style, {
    position: "fixed",
    left: "50%",
    bottom: "8px",
    transform: "translateX(-50%)",
    zIndex: "40",
    maxWidth: "min(560px, calc(100vw - 24px))",
    padding: "6px 10px",
    borderRadius: "8px",
    background: "rgba(0, 0, 0, 0.78)",
    color: "#d5ffe4",
    font: "11px/1.45 ui-monospace, monospace",
    whiteSpace: "pre",
    overflow: "hidden",
    pointerEvents: "none",
  });
  document.body.appendChild(el);

  let on = /[?&]debug=net\b/.test(window.location.search);
  el.hidden = !on;
  let acc = 1;

  function toggle() {
    on = !on;
    el.hidden = !on;
    acc = 1;
  }

  // 사용자 탭 2초 꾹 누르기
  let pressTimer = 0;
  document.addEventListener("pointerdown", (e) => {
    const roster = document.getElementById("user-roster");
    if (!roster || !roster.contains(/** @type {Node} */ (e.target))) return;
    window.clearTimeout(pressTimer);
    pressTimer = window.setTimeout(toggle, 2000);
  });
  for (const type of ["pointerup", "pointercancel", "pointerleave"]) {
    document.addEventListener(type, () => window.clearTimeout(pressTimer));
  }

  const sec = (ms) => (ms > 0 ? ((performance.now() - ms) / 1000).toFixed(1) : "-");

  /**
   * @param {number} dt
   * @param {{ net: any, remotes: any }} deps
   */
  function frame(dt, deps) {
    if (!on) return;
    acc += dt;
    if (acc < 0.5) return;
    acc = 0;
    const s = deps.net?.netStats?.();
    const lines = [];
    if (!s) {
      lines.push("서버 연결 아님 (mock)");
    } else {
      lines.push(
        `연결 ${s.connected ? "O" : "X"} (${s.transport})  방 ${s.roomId || "-"}  id ${String(s.socketId || "-").slice(0, 6)}${s.kicked ? "  [밀려남]" : ""}`,
      );
      lines.push(
        `접속 ${s.connects}  끊김 ${s.disconnects}  복구 ${s.recovered}  입장실패 ${s.joinFails}  마지막끊김 ${s.lastDisconnectReason || "-"} (${sec(s.lastDisconnectAt)}초 전)`,
      );
      lines.push(
        `보냄 ${s.sent}  못보냄 ${s.skippedSend}  받음 ${s.received}  마지막받음 ${sec(s.lastReceivedAt)}초 전`,
      );
      lines.push(
        `점검 ${s.lastPingMs ?? "-"}ms  점검실패 ${s.pingFails}  강제재연결 ${s.forcedReconnects}  재입장 ${s.rejoins}`,
      );
    }
    const list = deps.remotes?.debugList?.() || [];
    if (!list.length) lines.push("다른 사람 없음");
    for (const p of list) {
      const age = p.ageSec == null ? "-" : p.ageSec.toFixed(1);
      lines.push(`· ${p.name}  ${age}초 전  ${p.anim}${p.hasChar ? "" : "  (캐릭터 로딩 중)"}`);
    }
    el.textContent = lines.join("\n");
  }

  return { frame, toggle };
}

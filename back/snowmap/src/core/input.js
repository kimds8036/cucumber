/** 채팅창·게시판 글상자에 입력 중이면 이동 키로 쓰지 않는다 */
export function isTyping(e) {
  const el = /** @type {HTMLElement|null} */ (e?.target);
  return Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable));
}

/**
 * 키보드 / 가상 스틱 / 게임패드 입력 상태.
 */
export function createInput() {
  const keys = new Set();
  const stick = { x: 0, y: 0 };
  let runHeld = false;

  function onKeyDown(e) {
    if (isTyping(e)) return;
    keys.add(e.key.toLowerCase());
  }
  function onKeyUp(e) {
    keys.delete(e.key.toLowerCase());
  }
  function onBlur() {
    keys.clear();
    stick.x = 0;
    stick.y = 0;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  /**
   * @returns {{ x: number, y: number, running: boolean }|null}
   * y: 앞(+)/뒤(-), x: 우(+)/좌(-)
   */
  function read() {
    let x = stick.x;
    let y = stick.y;
    if (keys.has("w") || keys.has("arrowup")) y += 1;
    if (keys.has("s") || keys.has("arrowdown")) y -= 1;
    if (keys.has("d") || keys.has("arrowright")) x += 1;
    if (keys.has("a") || keys.has("arrowleft")) x -= 1;

    const pads = navigator.getGamepads?.();
    if (pads) {
      for (const pad of pads) {
        if (!pad) continue;
        const ax = pad.axes[0] || 0;
        const ay = pad.axes[1] || 0;
        if (Math.hypot(ax, ay) > 0.2) {
          x += ax;
          y += -ay;
        }
      }
    }

    const len = Math.hypot(x, y);
    if (len < 0.12) return null;
    const inv = 1 / len;
    return {
      x: x * inv,
      y: y * inv,
      running: runHeld || keys.has("shift"),
    };
  }

  function setRunHeld(held) {
    runHeld = Boolean(held);
  }

  /**
   * 가상 조이스틱 DOM 연결 (있으면)
   * @param {HTMLElement|null} stickEl
   * @param {HTMLElement|null} knobEl
   */
  function bindStick(stickEl, knobEl) {
    if (!stickEl || !knobEl) return;
    let pointerId = null;

    function place(clientX, clientY) {
      const rect = stickEl.getBoundingClientRect();
      let dx = clientX - (rect.left + rect.width / 2);
      let dy = clientY - (rect.top + rect.height / 2);
      const length = Math.hypot(dx, dy) || 1;
      const limit = 36;
      const clamped = Math.min(length, limit);
      dx = (dx / length) * clamped;
      dy = (dy / length) * clamped;
      stick.x = dx / limit;
      stick.y = -dy / limit;
      knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    stickEl.addEventListener("pointerdown", (e) => {
      pointerId = e.pointerId;
      stickEl.setPointerCapture(pointerId);
      place(e.clientX, e.clientY);
    });
    stickEl.addEventListener("pointermove", (e) => {
      if (pointerId !== e.pointerId) return;
      place(e.clientX, e.clientY);
    });
    function end(e) {
      if (pointerId !== e.pointerId) return;
      pointerId = null;
      stick.x = 0;
      stick.y = 0;
      knobEl.style.transform = "translate(0, 0)";
    }
    stickEl.addEventListener("pointerup", end);
    stickEl.addEventListener("pointercancel", end);
  }

  return {
    read,
    bindStick,
    setRunHeld,
    keys,
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    },
  };
}

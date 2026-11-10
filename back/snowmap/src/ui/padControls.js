/**
 * 모바일용 우측 조작: 상호작용(조건부) + 뛰기(서 있을 때만).
 * @param {{
 *   onInteract: () => void,
 *   peekAction: () => { label: string }|null,
 *   setRunHeld: (held: boolean) => void,
 *   isSeated?: () => boolean,
 * }} opts
 */
export function createPadControls(opts) {
  let root = document.getElementById("pad-right");
  if (!root) {
    root = document.createElement("div");
    root.id = "pad-right";
    document.body.appendChild(root);
  }

  let interactBtn = document.getElementById("btn-interact");
  if (!interactBtn) {
    interactBtn = document.createElement("button");
    interactBtn.id = "btn-interact";
    interactBtn.type = "button";
    interactBtn.hidden = true;
    root.appendChild(interactBtn);
  }

  let runBtn = document.getElementById("btn-run");
  if (!runBtn) {
    runBtn = document.createElement("button");
    runBtn.id = "btn-run";
    runBtn.type = "button";
    runBtn.textContent = "뛰기";
    root.appendChild(runBtn);
  }

  let lastLabel = "";
  let lastSeated = null;

  interactBtn.addEventListener("click", (e) => {
    e.preventDefault();
    opts.onInteract?.();
    refresh();
  });

  function setRun(held) {
    opts.setRunHeld?.(held);
    runBtn.classList.toggle("held", held);
  }

  runBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (runBtn.hidden) return;
    runBtn.setPointerCapture(e.pointerId);
    setRun(true);
  });
  function endRun(e) {
    if (e && runBtn.hasPointerCapture?.(e.pointerId)) {
      runBtn.releasePointerCapture(e.pointerId);
    }
    setRun(false);
  }
  runBtn.addEventListener("pointerup", endRun);
  runBtn.addEventListener("pointercancel", endRun);
  runBtn.addEventListener("lostpointercapture", () => setRun(false));

  function refresh() {
    const seated = Boolean(opts.isSeated?.());
    if (seated !== lastSeated) {
      lastSeated = seated;
      runBtn.hidden = seated;
      if (seated) setRun(false);
    }

    const action = opts.peekAction?.() || null;
    const label = action?.label || "";
    if (label === lastLabel) {
      interactBtn.hidden = !action;
      return;
    }
    lastLabel = label;
    if (!action) {
      interactBtn.hidden = true;
      interactBtn.textContent = "";
      return;
    }
    interactBtn.hidden = false;
    interactBtn.textContent = label;
  }

  return { refresh, el: root };
}

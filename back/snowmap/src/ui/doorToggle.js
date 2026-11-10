/**
 * 근처 문 열기/닫기 버튼.
 * @param {{
 *   getNearbyDoor: () => any,
 *   toggleDoor: (door: any) => void,
 *   isSitting: () => boolean,
 * }} opts
 */
export function createDoorToggle(opts) {
  let el = document.getElementById("door-toggle");
  if (!el) {
    el = document.createElement("button");
    el.id = "door-toggle";
    el.type = "button";
    el.hidden = true;
    document.body.appendChild(el);
  }

  let lastKey = "";

  el.addEventListener("click", (e) => {
    e.preventDefault();
    const door = opts.getNearbyDoor();
    if (!door) return;
    opts.toggleDoor(door);
    refresh();
  });

  function refresh() {
    if (opts.isSitting()) {
      if (lastKey === "sit") return;
      lastKey = "sit";
      el.hidden = true;
      el.classList.remove("open");
      return;
    }
    const door = opts.getNearbyDoor();
    const key = !door ? "none" : `${door.x.toFixed(2)}:${door.z.toFixed(2)}:${door.open ? 1 : 0}`;
    if (key === lastKey) return;
    lastKey = key;
    if (!door) {
      el.hidden = true;
      el.classList.remove("open");
      return;
    }
    el.hidden = false;
    el.textContent = door.open ? "문 닫기" : "문 열기";
    el.classList.toggle("open", door.open);
    el.setAttribute("aria-pressed", door.open ? "true" : "false");
  }

  return { el, refresh };
}

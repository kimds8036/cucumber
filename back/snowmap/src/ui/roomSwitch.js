import {
  getRoomStatuses,
  switchToRoom,
} from "../net/rooms.js";

/**
 * 방 안: 현재 방 표시 + 다른 방 이동.
 * @param {{
 *   getUserId: () => string,
 *   getRoomId: () => string,
 *   canOpen?: () => boolean,
 * }} opts
 */
export function createRoomSwitch(opts) {
  let root = document.getElementById("room-switch");
  if (!root) {
    root = document.createElement("div");
    root.id = "room-switch";
    document.body.appendChild(root);
  }

  root.innerHTML = `
    <button type="button" id="room-switch-tab" aria-expanded="false">
      <span id="room-switch-label">방</span>
      <span id="room-switch-count">0/10</span>
    </button>
    <div id="room-switch-panel" hidden>
      <div class="room-switch-head">
        <strong>방 이동</strong>
        <span class="room-switch-sub">사람이 많으면 다른 방으로 옮겨 보세요</span>
      </div>
      <div id="room-switch-list" class="room-switch-list"></div>
    </div>
  `;

  const tab = root.querySelector("#room-switch-tab");
  const panel = root.querySelector("#room-switch-panel");
  const label = root.querySelector("#room-switch-label");
  const countEl = root.querySelector("#room-switch-count");
  const list = root.querySelector("#room-switch-list");

  let open = false;

  function setOpen(next) {
    if (opts.canOpen && !opts.canOpen() && next) return;
    open = next;
    panel.hidden = !open;
    tab.setAttribute("aria-expanded", open ? "true" : "false");
    root.classList.toggle("open", open);
    if (open) render();
  }

  function render() {
    const userId = opts.getUserId?.() || "";
    const roomId = opts.getRoomId?.() || "";
    const rooms = getRoomStatuses(userId, roomId);
    const mine = rooms.find((r) => r.isMine) || rooms[0];
    if (mine) {
      label.textContent = mine.name;
      countEl.textContent = `${mine.count}/${mine.capacity}`;
    }

    list.replaceChildren();
    for (const room of rooms) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "room-switch-item";
      if (room.isMine) row.classList.add("mine");
      if (room.full && !room.isMine) {
        row.classList.add("full");
        row.disabled = true;
      }

      const name = document.createElement("span");
      name.className = "room-switch-name";
      name.textContent = room.isMine ? `${room.name} · 지금` : room.name;

      const meta = document.createElement("span");
      meta.className = "room-switch-meta";
      meta.textContent = room.full && !room.isMine
        ? "만원"
        : `${room.count}/${room.capacity}`;

      row.append(name, meta);
      if (!room.isMine && !room.full) {
        row.addEventListener("click", (e) => {
          e.preventDefault();
          switchToRoom(room.id);
        });
      }
      list.append(row);
    }
  }

  tab.addEventListener("click", (e) => {
    e.preventDefault();
    setOpen(!open);
  });

  document.addEventListener("pointerdown", (e) => {
    if (!open) return;
    if (root.contains(/** @type {Node} */ (e.target))) return;
    setOpen(false);
  });

  render();
  const timer = window.setInterval(render, 2000);

  return {
    refresh: render,
    close: () => setOpen(false),
    dispose() {
      window.clearInterval(timer);
    },
  };
}

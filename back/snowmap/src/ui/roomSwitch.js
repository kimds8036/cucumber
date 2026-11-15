import {
  getRoomStatuses,
  switchToRoom,
} from "../net/rooms.js";

/**
 * 방 안: 현재 방 표시 + 다른 방 이동.
 * @param {{
 *   getUserId: () => string,
 *   getRoomId: () => string,
 *   listRooms?: null | (() => Promise<any[]|null>),
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
  /** 서버 모드에서 받은 방 목록 (없으면 mock: 이 기기 탭끼리) */
  let serverRooms = null;
  let loading = false;
  let ticks = 0;

  function currentRooms() {
    const userId = opts.getUserId?.() || "";
    const roomId = opts.getRoomId?.() || "";
    if (!opts.listRooms) return getRoomStatuses(userId, roomId);
    return (serverRooms || []).map((room) => ({ ...room, isMine: room.id === roomId }));
  }

  async function load() {
    if (!opts.listRooms || loading) return;
    loading = true;
    try {
      const list = await opts.listRooms();
      if (Array.isArray(list)) serverRooms = list;
    } catch {
      /* 다음 주기에 다시 */
    } finally {
      loading = false;
    }
    render();
  }

  function setOpen(next) {
    if (opts.canOpen && !opts.canOpen() && next) return;
    open = next;
    panel.hidden = !open;
    tab.setAttribute("aria-expanded", open ? "true" : "false");
    root.classList.toggle("open", open);
    if (open) {
      render();
      load();
    }
  }

  function render() {
    const rooms = currentRooms();
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
  load();
  // 서버 모드: 패널이 열려 있으면 2초, 닫혀 있으면 10초마다 인원 갱신
  const timer = window.setInterval(() => {
    ticks += 1;
    if (opts.listRooms) {
      if (open || ticks % 5 === 0) load();
      return;
    }
    render();
  }, 2000);

  return {
    refresh() {
      render();
      load();
    },
    close: () => setOpen(false),
    dispose() {
      window.clearInterval(timer);
    },
  };
}

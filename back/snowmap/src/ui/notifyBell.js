/**
 * 알림벨: 스터디 카페에 있는 동안 앱 알림(친구 요청 등)을 사용자 탭 오른쪽 벨로 보여 준다.
 * 앱 토스트는 세로 화면 기준이라 가로 카페 화면을 크게 덮었다. 앱은 카페에 있는 동안 토스트 대신
 * 'app:notice' 브릿지 메시지를 보낸다(TimerAniLab.jsx).
 *
 * - 알림이 오면 벨이 나타나 흔들리고, 안 읽은 개수를 보여 준다.
 * - 벨을 누르면 알림 내용을 펼친다. 다 보면(닫거나 몇 초 지나면) 벨이 스르륵 사라진다.
 */

const KEEP = 5;
const AUTO_CLOSE_MS = 6000;

const BELL_SVG = `
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path fill="currentColor" d="M12 22a2.2 2.2 0 0 0 2.2-2.2H9.8A2.2 2.2 0 0 0 12 22Zm7-5.6-1.6-1.7V10a5.4 5.4 0 0 0-4.2-5.3V4a1.2 1.2 0 1 0-2.4 0v.7A5.4 5.4 0 0 0 6.6 10v4.7L5 16.4V18h14v-1.6Z"/>
  </svg>`;

/** @param {{ type?: string|null, relatedType?: string|null, title?: string|null }} notice */
function noticeTitle(notice) {
  const t = String(notice.type || notice.relatedType || "");
  if (/friend_request|friendship/.test(t)) return "친구 요청이 왔어요";
  if (/friend_accept/.test(t)) return "친구 요청을 수락했어요";
  if (/poke/.test(t)) return "콕 찔렀어요";
  return notice.title || "새 알림";
}

export function createNotifyBell() {
  const tab = document.getElementById("user-roster-tab");
  if (!tab) return { push() {} };

  // 사용자 탭과 벨을 한 줄로. 벨은 탭 기준으로 따로 붙여 탭이 옆으로 밀리지 않게 한다
  const row = document.createElement("div");
  row.className = "user-roster-top";
  tab.replaceWith(row);
  row.append(tab);

  const wrap = document.createElement("div");
  wrap.id = "notify-bell-wrap";
  wrap.hidden = true;
  wrap.innerHTML = `
    <button type="button" id="notify-bell" aria-label="알림">
      ${BELL_SVG}
      <span id="notify-bell-badge"></span>
    </button>
    <div id="notify-bell-panel" hidden role="dialog" aria-label="알림">
      <div class="notify-bell-head">알림</div>
      <div id="notify-bell-list"></div>
    </div>
  `;
  row.append(wrap);

  const bell = wrap.querySelector("#notify-bell");
  const badge = wrap.querySelector("#notify-bell-badge");
  const panel = wrap.querySelector("#notify-bell-panel");
  const list = wrap.querySelector("#notify-bell-list");

  /** @type {{ id: string, title: string, message: string, senderName?: string|null, at: number }[]} */
  let notices = [];
  let unread = 0;
  let open = false;
  let autoCloseTimer = 0;
  let hideTimer = 0;

  function paint() {
    badge.textContent = unread > 9 ? "9+" : unread ? String(unread) : "";
    wrap.classList.toggle("ringing", unread > 0);
  }

  function renderList() {
    list.replaceChildren();
    for (const n of notices) {
      const item = document.createElement("div");
      item.className = "notify-bell-item";
      const title = document.createElement("div");
      title.className = "notify-bell-title";
      title.textContent = n.title;
      const msg = document.createElement("div");
      msg.className = "notify-bell-msg";
      msg.textContent = n.message;
      item.append(title, msg);
      list.append(item);
    }
  }

  function show() {
    window.clearTimeout(hideTimer);
    wrap.hidden = false;
    requestAnimationFrame(() => wrap.classList.add("show"));
  }

  /** 다 본 뒤 벨을 스르륵 없앤다 */
  function fadeAway() {
    wrap.classList.remove("show");
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (unread > 0) return;
      wrap.hidden = true;
      notices = [];
      list.replaceChildren();
    }, 450);
  }

  function setOpen(next) {
    open = next;
    panel.hidden = !open;
    window.clearTimeout(autoCloseTimer);
    if (open) {
      renderList();
      unread = 0;
      paint();
      autoCloseTimer = window.setTimeout(() => setOpen(false), AUTO_CLOSE_MS);
    } else if (unread === 0) {
      fadeAway();
    }
  }

  bell.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
  });
  panel.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(false);
  });
  document.addEventListener("pointerdown", (e) => {
    if (!open) return;
    if (wrap.contains(/** @type {Node} */ (e.target))) return;
    setOpen(false);
  });

  /**
   * @param {{ id?: string, title?: string|null, message?: string, senderName?: string|null,
   *   body?: string|null, type?: string|null, relatedType?: string|null, at?: number }} payload
   */
  function push(payload = {}) {
    const message = String(payload.message || payload.body || "").trim();
    if (!message) return;
    notices.unshift({
      id: String(payload.id || Date.now()),
      title: noticeTitle(payload),
      message,
      senderName: payload.senderName || null,
      at: Number(payload.at) || Date.now(),
    });
    if (notices.length > KEEP) notices.length = KEEP;
    unread += 1;
    paint();
    show();
    if (open) renderList();
  }

  return { push };
}

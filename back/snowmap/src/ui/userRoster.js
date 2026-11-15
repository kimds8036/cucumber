/**
 * 중앙 상단: 겹친 프로필 아이콘 + 방 인원 목록(친구 추가).
 * 친구 상태는 앱 브릿지(friend:list) 우선, 없으면 로컬 폴백.
 *
 * @param {{
 *   me: { userId: string, displayName: string, avatarUrl?: string|null },
 *   remotes: { list: () => { userId: string, displayName: string, avatarUrl?: string|null }[] },
 *   canOpen?: () => boolean,
 *   bridge?: { isNative: boolean, friendAdd: Function },
 *   onFriendAdd?: (user: { userId: string, displayName: string }, status: "requested"|"already") => void,
 *   moderation?: null | {
 *     report: (userId: string, reason?: string) => Promise<{ ok: boolean, code?: string|null, message?: string|null }>,
 *     block: (userId: string, displayName: string) => Promise<{ ok: boolean, message?: string }>,
 *   },
 * }} opts
 */
export function createUserRoster(opts) {
  const FRIEND_KEY = `study-cafe:friends:${opts.me.userId}`;

  /** @type {Map<string, { id: string, username?: string, nickname?: string, avatarUrl?: string|null }>} */
  let friendById = new Map();
  /** @type {Set<string>} */
  let friendIds = loadLocalFriendIds();
  /** @type {Set<string>} */
  let pendingIds = new Set();
  /** 친구 요청을 보내는 중(응답 대기) */
  const requestingIds = new Set();
  let fromApp = false;
  /** 마지막으로 그린 목록 내용. 같으면 다시 그리지 않는다(버튼·사진이 깜빡이거나 눌림이 사라지지 않게) */
  let lastStackKey = "";
  let lastListKey = "";
  /** 신고·차단 메뉴를 펼친 사람 */
  let menuFor = null;
  /** 신고를 보낸 사람 (같은 화면에서 다시 못 누르게) */
  const reportedIds = new Set();

  let root = document.getElementById("user-roster");
  if (!root) {
    root = document.createElement("div");
    root.id = "user-roster";
    document.body.appendChild(root);
  }

  root.innerHTML = `
    <button type="button" id="user-roster-tab" aria-expanded="false" aria-label="방 인원">
      <span id="user-roster-stack" class="user-roster-stack" aria-hidden="true"></span>
      <span class="user-roster-plus" aria-hidden="true">+</span>
    </button>
    <div id="user-roster-panel" hidden>
      <div class="user-roster-head">
        <strong>방 인원</strong>
        <span id="user-roster-sub" class="user-roster-sub">0명</span>
      </div>
      <div id="user-roster-list" class="user-roster-list"></div>
    </div>
  `;

  const tab = root.querySelector("#user-roster-tab");
  const stack = root.querySelector("#user-roster-stack");
  const panel = root.querySelector("#user-roster-panel");
  const sub = root.querySelector("#user-roster-sub");
  const list = root.querySelector("#user-roster-list");

  let open = false;

  function loadLocalFriendIds() {
    try {
      const raw = localStorage.getItem(FRIEND_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr.map(String) : []);
    } catch {
      return new Set();
    }
  }

  function saveLocalFriendIds() {
    if (fromApp) return;
    try {
      localStorage.setItem(FRIEND_KEY, JSON.stringify([...friendIds]));
    } catch {
      // ignore
    }
  }

  function colorForId(userId) {
    let hash = 0;
    const s = String(userId || "");
    for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 55% 58%)`;
  }

  function initialOf(name) {
    const t = String(name || "?").trim();
    return (t[0] || "?").toUpperCase();
  }

  function formatId(name) {
    const t = String(name || "").trim();
    if (!t) return "@unknown";
    return t.startsWith("@") ? t : `@${t}`;
  }

  function isFriend(userId, displayName) {
    if (friendIds.has(String(userId))) return true;
    const uname = String(displayName || "")
      .trim()
      .replace(/^@/, "")
      .toLowerCase();
    if (!uname) return false;
    for (const f of friendById.values()) {
      const fu = String(f.username || f.nickname || "")
        .trim()
        .replace(/^@/, "")
        .toLowerCase();
      if (fu && fu === uname) return true;
    }
    return false;
  }

  function fillAvatar(el, user) {
    el.replaceChildren();
    el.style.background = colorForId(user.userId);
    const url = user.avatarUrl || friendById.get(String(user.userId))?.avatarUrl;
    if (url) {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", () => {
        img.remove();
        el.textContent = initialOf(user.displayName);
      });
      el.append(img);
    } else {
      el.textContent = initialOf(user.displayName);
    }
  }

  function members() {
    const remotes = opts.remotes.list?.() || [];
    return [
      {
        userId: opts.me.userId,
        displayName: opts.me.displayName,
        avatarUrl: opts.me.avatarUrl || null,
        isMe: true,
      },
      ...remotes
        .filter((u) => String(u.userId) !== String(opts.me.userId))
        .map((u) => ({
          userId: u.userId,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl || null,
          isMe: false,
        })),
    ];
  }

  function setOpen(next) {
    if (opts.canOpen && !opts.canOpen() && next) return;
    open = next;
    panel.hidden = !open;
    tab.setAttribute("aria-expanded", open ? "true" : "false");
    root.classList.toggle("open", open);
    if (open) render();
  }

  function renderStack(users) {
    stack.replaceChildren();
    users.slice(0, 3).forEach((user, i) => {
      const av = document.createElement("span");
      av.className = "user-roster-avatar";
      av.style.zIndex = String(3 - i);
      fillAvatar(av, user);
      stack.append(av);
    });
  }

  function renderList(users) {
    list.replaceChildren();
    for (const user of users) {
      const row = document.createElement("div");
      row.className = "user-roster-row";
      if (user.isMe) row.classList.add("me");

      const av = document.createElement("div");
      av.className = "user-roster-avatar lg";
      fillAvatar(av, user);

      const meta = document.createElement("div");
      meta.className = "user-roster-meta";
      const id = document.createElement("div");
      id.className = "user-roster-id";
      id.textContent = user.isMe
        ? `${formatId(user.displayName)} · 나`
        : formatId(user.displayName);
      meta.append(id);
      row.append(av, meta);

      if (user.isMe) {
        const badge = document.createElement("span");
        badge.className = "user-roster-badge";
        badge.textContent = "나";
        row.append(badge);
      } else if (isFriend(user.userId, user.displayName)) {
        const badge = document.createElement("span");
        badge.className = "user-roster-badge friend";
        badge.textContent = "이미 친구";
        row.append(badge);
      } else if (pendingIds.has(String(user.userId))) {
        const badge = document.createElement("span");
        badge.className = "user-roster-badge";
        badge.textContent = "요청됨";
        row.append(badge);
      } else if (requestingIds.has(String(user.userId))) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "user-roster-friend";
        btn.textContent = "요청 중…";
        btn.disabled = true;
        row.append(btn);
      } else {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "user-roster-friend";
        btn.textContent = "친구 추가";
        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const uid = String(user.userId);
          if (requestingIds.has(uid)) return;
          requestingIds.add(uid);
          render();
          const payload = {
            userId: user.userId,
            displayName: user.displayName,
            username: String(user.displayName || "").replace(/^@/, ""),
          };
          let result = { ok: true, status: "requested" };
          try {
            if (opts.bridge?.isNative) {
              result = await opts.bridge.friendAdd(payload);
            } else {
              friendIds.add(uid);
              saveLocalFriendIds();
              result = { ok: true, status: "already" };
            }
          } catch {
            result = { ok: false };
          } finally {
            requestingIds.delete(uid);
          }
          if (result?.ok) {
            if (result.status === "already") {
              friendIds.add(uid);
            } else {
              pendingIds.add(uid);
            }
            opts.onFriendAdd?.(payload, result.status === "already" ? "already" : "requested");
          }
          render();
        });
        row.append(btn);
      }

      if (!user.isMe && opts.moderation) {
        const uid = String(user.userId);
        const more = document.createElement("button");
        more.type = "button";
        more.className = "user-roster-more";
        more.textContent = "⋯";
        more.setAttribute("aria-label", `${formatId(user.displayName)} 신고·차단`);
        more.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          menuFor = menuFor === uid ? null : uid;
          render({ force: true });
        });
        row.append(more);

        if (menuFor === uid) {
          const actions = document.createElement("div");
          actions.className = "user-roster-actions";
          const reportBtn = document.createElement("button");
          reportBtn.type = "button";
          reportBtn.textContent = reportedIds.has(uid) ? "신고함" : "신고";
          reportBtn.disabled = reportedIds.has(uid);
          reportBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!window.confirm(`${formatId(user.displayName)} 님을 신고할까요?\n최근 채팅이 함께 전달돼요.`)) return;
            reportBtn.disabled = true;
            const res = await opts.moderation.report(uid, "스터디 카페 부적절한 행동");
            if (res?.ok || res?.code === "ALREADY_REPORTED") {
              reportedIds.add(uid);
              window.alert(res?.ok ? "신고했어요. 운영진이 확인할게요." : "이미 신고한 사용자예요.");
            } else {
              reportBtn.disabled = false;
              window.alert(res?.message || "신고하지 못했어요.");
            }
            render({ force: true });
          });
          const blockBtn = document.createElement("button");
          blockBtn.type = "button";
          blockBtn.className = "danger";
          blockBtn.textContent = "차단";
          blockBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (
              !window.confirm(
                `${formatId(user.displayName)} 님을 차단할까요?\n서로의 캐릭터·채팅·방명록이 보이지 않고 친구 관계도 끊겨요.`,
              )
            ) {
              return;
            }
            blockBtn.disabled = true;
            const res = await opts.moderation.block(uid, user.displayName);
            if (!res?.ok) {
              blockBtn.disabled = false;
              window.alert(res?.message || "차단하지 못했어요.");
              return;
            }
            menuFor = null;
            friendIds.delete(uid);
            render({ force: true });
          });
          actions.append(reportBtn, blockBtn);
          row.append(actions);
        }
      }

      list.append(row);
    }
  }

  function userKey(user) {
    const uid = String(user.userId);
    const state = user.isMe
      ? "me"
      : isFriend(user.userId, user.displayName)
        ? "friend"
        : pendingIds.has(uid)
          ? "pending"
          : requestingIds.has(uid)
            ? "requesting"
            : "none";
    const avatar = user.avatarUrl || friendById.get(uid)?.avatarUrl || "";
    return `${uid}|${user.displayName}|${avatar}|${state}|${menuFor === uid ? "menu" : ""}`;
  }

  function render({ force = false } = {}) {
    const users = members();
    sub.textContent = `${users.length}명`;
    const keys = users.map(userKey);
    const stackKey = keys.slice(0, 3).join("\n");
    if (force || stackKey !== lastStackKey) {
      lastStackKey = stackKey;
      renderStack(users);
    }
    if (!open) {
      lastListKey = "";
      return;
    }
    const listKey = keys.join("\n");
    if (force || listKey !== lastListKey) {
      lastListKey = listKey;
      renderList(users);
    }
  }

  function setFriendsFromApp(listIn) {
    fromApp = true;
    friendById = new Map();
    friendIds = new Set();
    for (const f of Array.isArray(listIn) ? listIn : []) {
      const id = String(f.id ?? f.userId ?? "");
      if (!id) continue;
      friendById.set(id, {
        id,
        username: f.username || "",
        nickname: f.nickname || f.name || "",
        avatarUrl: f.avatarUrl || null,
      });
      friendIds.add(id);
    }
    render();
  }

  function applyFriendResult(payload = {}) {
    const uid = payload.userId != null ? String(payload.userId) : null;
    if (!uid) return;
    if (payload.ok && payload.status === "already") {
      pendingIds.delete(uid);
      friendIds.add(uid);
    } else if (payload.ok) {
      pendingIds.add(uid);
    } else {
      pendingIds.delete(uid);
    }
    render();
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
  const timer = window.setInterval(render, 1200);

  return {
    refresh: render,
    setFriendsFromApp,
    applyFriendResult,
    close: () => setOpen(false),
    get isOpen() {
      return open;
    },
    dispose() {
      window.clearInterval(timer);
      root.remove();
    },
  };
}

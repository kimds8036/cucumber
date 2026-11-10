import { CONFIG } from "../config.js";

/**
 * 채팅: 좌측 상단 로그(최근 4줄, 10초 뒤 페이드아웃) + 가운데 아래 입력 버튼.
 * Enter = 입력창 열기 / 보내기, Esc = 닫기. 사용자 글은 textContent로만 넣는다.
 * @param {{
 *   net: import("../net/adapter.js").NetAdapter,
 *   me: import("../net/adapter.js").Identity,
 *   nameTags: ReturnType<import("./nameTags.js").createNameTags>,
 *   canOpen?: () => boolean,
 *   onOpenChange?: (open: boolean) => void,
 * }} deps
 */
export function createChat(deps) {
  const { net, me, nameTags } = deps;
  const root = document.getElementById("chat");
  const log = document.getElementById("chat-log");
  const form = document.getElementById("chat-form");
  const input = /** @type {HTMLInputElement} */ (document.getElementById("chat-input"));
  const openBtn = document.getElementById("chat-open");

  input.maxLength = CONFIG.CHAT_MAX_LENGTH;
  const seenIds = new Set();
  let lastSentAt = 0;
  let idleTimer = 0;
  let hideTimer = 0;

  function showLog() {
    window.clearTimeout(hideTimer);
    log.hidden = false;
    // 다음 프레임에 fade 클래스를 빼야 transition이 먹는다.
    requestAnimationFrame(() => {
      log.classList.remove("fade-out");
    });
  }

  function hideLog() {
    if (root.classList.contains("typing")) return;
    log.classList.add("fade-out");
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (root.classList.contains("typing")) return;
      if (!log.classList.contains("fade-out")) return;
      log.hidden = true;
    }, 450);
  }

  function wake() {
    showLog();
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      hideLog();
    }, CONFIG.CHAT_LOG_FADE_SEC * 1000);
  }

  function appendLine(build) {
    const line = document.createElement("div");
    line.className = "line";
    build(line);
    log.append(line);
    while (log.childElementCount > CONFIG.CHAT_LOG_KEEP) {
      log.firstElementChild?.remove();
    }
    wake();
  }

  /** @param {import("../net/adapter.js").ChatMessage} msg */
  function addMessage(msg) {
    if (msg.id) {
      if (seenIds.has(msg.id)) return;
      seenIds.add(msg.id);
    }
    appendLine((line) => {
      if (msg.userId === me.userId) line.classList.add("me");
      const who = document.createElement("span");
      who.className = "who";
      who.textContent = msg.displayName;
      line.append(who, msg.text);
    });
  }

  function system(text) {
    appendLine((line) => {
      line.classList.add("system");
      line.textContent = text;
    });
  }

  function isOpen() {
    return root.classList.contains("typing");
  }

  function open() {
    if (isOpen()) return;
    root.classList.add("typing");
    showLog();
    window.clearTimeout(idleTimer);
    deps.onOpenChange?.(true);
    window.setTimeout(() => input.focus(), 0);
  }

  function close() {
    if (!isOpen()) return;
    root.classList.remove("typing");
    input.value = "";
    input.blur();
    wake();
    deps.onOpenChange?.(false);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim().slice(0, CONFIG.CHAT_MAX_LENGTH);
    if (!text) {
      close();
      return;
    }
    const wait = CONFIG.CHAT_COOLDOWN_SEC * 1000 - (Date.now() - lastSentAt);
    if (wait > 0) return;
    lastSentAt = Date.now();
    net.sendChat(text);
    close();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });
  openBtn.addEventListener("click", open);
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.repeat || isOpen()) return;
    const tag = /** @type {HTMLElement} */ (e.target)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
    if (deps.canOpen && !deps.canOpen()) return;
    e.preventDefault();
    open();
  });

  net.onChat((msg) => {
    addMessage(msg);
    if (!msg.system) nameTags.say(msg.userId, msg.text);
  });

  async function loadHistory() {
    try {
      const recent = await net.getRecentChat(CONFIG.CHAT_HISTORY_ON_JOIN);
      const slice = Array.isArray(recent)
        ? recent.slice(-CONFIG.CHAT_LOG_KEEP)
        : [];
      for (const msg of slice) addMessage(msg);
      if (!slice.length) hideLog();
    } catch (err) {
      console.error("[chat] history", err);
      hideLog();
    }
  }

  hideLog();

  return {
    open,
    close,
    system,
    loadHistory,
    get isOpen() {
      return isOpen();
    },
  };
}

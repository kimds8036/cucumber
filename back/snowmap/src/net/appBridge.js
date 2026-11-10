/**
 * 앱 WebView 브릿지. ReactNativeWebView가 없으면 로컬(브라우저) 모드.
 */

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * @param {{
 *   onTimerSnapshot?: (payload: object) => void,
 *   onTimerResult?: (payload: object) => void,
 *   onFriendList?: (payload: object) => void,
 *   onFriendResult?: (payload: object) => void,
 * }} handlers
 */
export function createAppBridge(handlers = {}) {
  const pending = new Map();
  let native = typeof window !== "undefined" && !!window.ReactNativeWebView?.postMessage;

  function emit(msg) {
    if (!msg || !msg.type) return;
    if (msg.type === "timer:snapshot") handlers.onTimerSnapshot?.(msg.payload || {});
    else if (msg.type === "timer:result") {
      handlers.onTimerResult?.(msg.payload || {});
      const replyTo = msg.payload?.replyTo || msg.id;
      const waiter = replyTo ? pending.get(String(replyTo)) : null;
      if (waiter) {
        pending.delete(String(replyTo));
        waiter(msg.payload || {});
      }
    } else if (msg.type === "friend:list") handlers.onFriendList?.(msg.payload || {});
    else if (msg.type === "friend:result") {
      handlers.onFriendResult?.(msg.payload || {});
      const replyTo = msg.payload?.replyTo || msg.id;
      const waiter = replyTo ? pending.get(String(replyTo)) : null;
      if (waiter) {
        pending.delete(String(replyTo));
        waiter(msg.payload || {});
      }
    }
  }

  function onEvent(ev) {
    const detail = ev?.detail;
    if (detail) emit(detail);
  }

  function onWindowMessage(ev) {
    // 일부 WebView는 window.postMessage로도 넣는다
    try {
      const data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
      if (data?.type) emit(data);
    } catch {
      // ignore
    }
  }

  window.addEventListener("study-cafe-bridge", onEvent);
  window.addEventListener("message", onWindowMessage);
  window.__onStudyCafeBridge = (msg) => emit(msg);
  if (window.__studyCafeBridgeLast) emit(window.__studyCafeBridgeLast);

  function post(type, payload = {}, id = randomId()) {
    const msg = { v: 1, type, id, payload };
    native = !!window.ReactNativeWebView?.postMessage;
    if (!native) return msg;
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    } catch (err) {
      console.warn("[bridge] post failed", err);
    }
    return msg;
  }

  function request(type, payload = {}, timeoutMs = 8000) {
    const id = randomId();
    return new Promise((resolve) => {
      if (!window.ReactNativeWebView?.postMessage) {
        resolve({ ok: false, error: "not_native", replyTo: id });
        return;
      }
      const timer = window.setTimeout(() => {
        pending.delete(id);
        resolve({ ok: false, error: "timeout", replyTo: id });
      }, timeoutMs);
      pending.set(id, (payloadResult) => {
        window.clearTimeout(timer);
        resolve(payloadResult);
      });
      post(type, payload, id);
    });
  }

  return {
    get isNative() {
      return !!window.ReactNativeWebView?.postMessage;
    },
    ready() {
      return post("bridge:ready", { at: Date.now() });
    },
    timerCommand(action, extra = {}) {
      return request("timer:command", { action, ...extra });
    },
    friendAdd(user) {
      return request("friend:add", {
        userId: user?.userId ?? null,
        username: user?.username ?? null,
        displayName: user?.displayName ?? null,
      });
    },
    dispose() {
      window.removeEventListener("study-cafe-bridge", onEvent);
      window.removeEventListener("message", onWindowMessage);
      if (window.__onStudyCafeBridge) delete window.__onStudyCafeBridge;
      pending.clear();
    },
  };
}

/**
 * 스터디 카페 WebView ↔ 앱 타이머/친구 브릿지.
 * 타이머 원본은 useTimerDay(TimerContent 등록). 카페는 리모컨.
 */

const BRIDGE_VERSION = 1;

/** @type {null | {
 *   getSnapshot: () => object,
 *   start: (subjectId?: string|number|null) => boolean|Promise<boolean>,
 *   stop: () => boolean|Promise<boolean>,
 *   selectSubject: (subjectId: string|number|null) => boolean|Promise<boolean>,
 *   listFriends: () => Promise<object[]>,
 *   addFriend: (payload: { userId?: string|number, username?: string, displayName?: string }) => Promise<{ ok: boolean, status: string, error?: string }>,
 * }} */
let controller = null;

const controllerListeners = new Set();

export function registerStudyCafeController(next) {
  controller = next || null;
  controllerListeners.forEach((fn) => {
    try {
      fn(controller);
    } catch {
      // noop
    }
  });
  return () => {
    if (controller === next) controller = null;
  };
}

export function getStudyCafeController() {
  return controller;
}

export function subscribeStudyCafeController(listener) {
  if (typeof listener !== 'function') return () => {};
  controllerListeners.add(listener);
  return () => controllerListeners.delete(listener);
}

export function makeBridgeMessage(type, payload = {}, id = null) {
  return {
    v: BRIDGE_VERSION,
    type,
    id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    payload: payload || {},
  };
}

export function parseBridgeMessage(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || typeof data !== 'object') return null;
    if (data.v != null && Number(data.v) !== BRIDGE_VERSION) return null;
    if (!data.type || typeof data.type !== 'string') return null;
    return {
      v: BRIDGE_VERSION,
      type: data.type,
      id: data.id != null ? String(data.id) : null,
      payload: data.payload && typeof data.payload === 'object' ? data.payload : {},
    };
  } catch {
    return null;
  }
}

/** WebView에 주입할 JS — window 이벤트로 snowmap이 받는다 */
export function buildInjectBridgeScript(message) {
  const json = JSON.stringify(JSON.stringify(message));
  return `
    (function(){
      try {
        var raw = ${json};
        var msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
        window.__studyCafeBridgeLast = msg;
        window.dispatchEvent(new CustomEvent('study-cafe-bridge', { detail: msg }));
        if (typeof window.__onStudyCafeBridge === 'function') {
          window.__onStudyCafeBridge(msg);
        }
      } catch (e) {}
      true;
    })();
  `;
}

export async function handleStudyCafeIncoming(message) {
  const ctrl = controller;
  if (!ctrl) {
    return makeBridgeMessage('timer:result', {
      replyTo: message?.id || null,
      ok: false,
      error: 'controller_unavailable',
    }, message?.id);
  }

  if (message.type === 'bridge:ready') {
    return null; // caller sends snapshot + friends separately
  }

  if (message.type === 'timer:command') {
    const action = String(message.payload?.action || '');
    const subjectId =
      message.payload?.subjectId === undefined
        ? undefined
        : message.payload.subjectId;
    let ok = false;
    let error = null;
    try {
      if (action === 'start') {
        ok = !!(await ctrl.start(subjectId ?? null));
      } else if (action === 'stop') {
        ok = !!(await ctrl.stop());
      } else if (action === 'selectSubject') {
        ok = !!(await ctrl.selectSubject(subjectId ?? null));
      } else {
        error = 'unknown_action';
      }
    } catch (err) {
      ok = false;
      error = err?.message || 'command_failed';
    }
    return makeBridgeMessage(
      'timer:result',
      {
        replyTo: message.id,
        ok,
        error: ok ? undefined : error || 'command_failed',
        snapshot: ctrl.getSnapshot(),
      },
      message.id,
    );
  }

  if (message.type === 'friend:add') {
    let result = { ok: false, status: 'failed', error: 'add_failed' };
    try {
      result = await ctrl.addFriend(message.payload || {});
    } catch (err) {
      result = {
        ok: false,
        status: 'failed',
        error: err?.message || 'add_failed',
      };
    }
    return makeBridgeMessage(
      'friend:result',
      {
        replyTo: message.id,
        ok: !!result?.ok,
        status: result?.status || (result?.ok ? 'requested' : 'failed'),
        error: result?.error,
        userId: message.payload?.userId ?? null,
      },
      message.id,
    );
  }

  return null;
}

export function buildTimerSnapshotMessage(snapshot) {
  return makeBridgeMessage('timer:snapshot', {
    ...(snapshot || {}),
    appNow: Date.now(),
  });
}

export function buildFriendListMessage(friends) {
  return makeBridgeMessage('friend:list', {
    friends: Array.isArray(friends) ? friends : [],
  });
}

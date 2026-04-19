const listeners = new Set();
let nativeAlert = null;
const pendingAlerts = [];

const toText = (value, fallback = '') => {
  if (value == null) return fallback;
  return String(value);
};

export const appAlert = {
  setNativeAlert(fn) {
    nativeAlert = typeof fn === 'function' ? fn : null;
  },

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    if (pendingAlerts.length > 0) {
      const queued = pendingAlerts.splice(0, pendingAlerts.length);
      queued.forEach((payload) => listener(payload));
    }
    return () => listeners.delete(listener);
  },

  alert(title, message, buttons, options) {
    const payload = {
      title: toText(title),
      message: toText(message),
      buttons: Array.isArray(buttons) && buttons.length > 0
        ? buttons
        : [{ text: '확인' }],
      options: options || {},
    };

    if (listeners.size === 0) {
      pendingAlerts.push(payload);
      // 앱 초기 부팅 직후 AlertHost가 없을 수 있어 fallback을 지연 처리한다.
      setTimeout(() => {
        if (listeners.size === 0 && pendingAlerts.length > 0 && nativeAlert) {
          const [first] = pendingAlerts.splice(0, 1);
          nativeAlert(first.title, first.message, first.buttons, first.options);
        }
      }, 400);
      return;
    }

    listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (e) {
        if (nativeAlert) {
          nativeAlert(payload.title, payload.message, payload.buttons, payload.options);
        }
      }
    });
  },
};


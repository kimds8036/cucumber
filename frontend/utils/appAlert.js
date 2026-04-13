const listeners = new Set();
let nativeAlert = null;

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
      if (nativeAlert) {
        nativeAlert(payload.title, payload.message, payload.buttons, payload.options);
      }
      return;
    }

    listeners.forEach((listener) => listener(payload));
  },
};


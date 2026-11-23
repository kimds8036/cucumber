/** 이벤트 콜백 묶음 (어댑터 구현에서 공용) */
export function createEmitter() {
  /** @type {Map<string, Function[]>} */
  const map = new Map();
  return {
    on(name, cb) {
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(cb);
    },
    emit(name, ...args) {
      for (const cb of map.get(name) || []) {
        try {
          cb(...args);
        } catch (err) {
          console.error(`[net] ${name} handler`, err);
        }
      }
    },
  };
}

const listeners = new Set();

export function notifySchoolCheckIn() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // 구독자가 실패해도 등교 체크는 그대로 둔다.
    }
  });
}

export function subscribeSchoolCheckIn(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

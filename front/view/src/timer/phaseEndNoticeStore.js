/**
 * 뽀모도로 종료 알림 — 타이머 화면과 스터디룸이 같이 본다.
 * 타이머 탭이 가려져 있어도 스터디룸에서 바로 띄울 수 있다.
 */
let notice = null;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => {
    try {
      listener(notice);
    } catch {
      /* ignore */
    }
  });
}

export function getPhaseEndNotice() {
  return notice;
}

export function publishPhaseEndNotice(next) {
  notice = next || null;
  emit();
}

export function subscribePhaseEndNotice(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const listeners = new Set();
let stopTimerHandler = null;
export const TIMER_COUNTDOWN_TOTAL_SECONDS = 600;

let state = {
  isRunning: false,
  startTimestamp: null,
  countdownBaseTimestamp: null,
  countdownRemainingSec: TIMER_COUNTDOWN_TOTAL_SECONDS,
  countdownTotalSec: TIMER_COUNTDOWN_TOTAL_SECONDS,
  /** 오늘(타이머일) 종료된 세션 누적 — 진행 중 세션 제외 (타이머 화면과 동일) */
  totalElapsedMs: 0,
};

export function setTimerRuntimeState(next) {
  state = {
    ...state,
    ...(next || {}),
  };
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch {
      // noop
    }
  });
}

export function getTimerRuntimeState() {
  return state;
}

export function subscribeTimerRuntime(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function registerTimerStopHandler(handler) {
  stopTimerHandler = typeof handler === 'function' ? handler : null;
  return () => {
    if (stopTimerHandler === handler) {
      stopTimerHandler = null;
    }
  };
}

export function requestRuntimeTimerStop() {
  if (typeof stopTimerHandler !== 'function') return false;
  try {
    stopTimerHandler();
    return true;
  } catch {
    return false;
  }
}

export function resetRuntimeCountdown() {
  state = {
    ...state,
    countdownBaseTimestamp: Date.now(),
    countdownRemainingSec: TIMER_COUNTDOWN_TOTAL_SECONDS,
    countdownTotalSec: TIMER_COUNTDOWN_TOTAL_SECONDS,
  };
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch {
      // noop
    }
  });
}

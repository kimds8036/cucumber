/**
 * 뽀모도로 순수 엔진 — UI/저장/알림과 분리.
 * 남은 시간은 setInterval 감소가 아니라 endsAtMs 기준이라 백그라운드에서도 맞다.
 *
 * 화면에서는 toView() / pomodoroRuntimeStore / usePomodoro 만 쓰면 된다.
 */

export const POMODORO_PHASE = {
  FOCUS: 'focus',
  SHORT_BREAK: 'short_break',
  LONG_BREAK: 'long_break',
};

export const POMODORO_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
};

export const DEFAULT_POMODORO_CONFIG = {
  focusSec: 25 * 60,
  shortBreakSec: 5 * 60,
  longBreakSec: 15 * 60,
  /** 집중 N회 완료마다 긴 휴식 */
  longBreakEvery: 4,
  /** true면 페이즈 종료 즉시 다음 페이즈 시작. 기본은 화면이 알림 후 start */
  autoStartNext: false,
};

function clampInt(value, min, fallback) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < min) return fallback;
  return n;
}

export function normalizePomodoroConfig(raw) {
  const base = DEFAULT_POMODORO_CONFIG;
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    focusSec: clampInt(src.focusSec, 1, base.focusSec),
    shortBreakSec: clampInt(src.shortBreakSec, 1, base.shortBreakSec),
    longBreakSec: clampInt(src.longBreakSec, 1, base.longBreakSec),
    longBreakEvery: clampInt(src.longBreakEvery, 1, base.longBreakEvery),
    autoStartNext: src.autoStartNext === true,
  };
}

export function durationMsForPhase(phase, config) {
  const c = normalizePomodoroConfig(config);
  if (phase === POMODORO_PHASE.SHORT_BREAK) return c.shortBreakSec * 1000;
  if (phase === POMODORO_PHASE.LONG_BREAK) return c.longBreakSec * 1000;
  return c.focusSec * 1000;
}

export function nextPhaseAfter(phase, focusCountInCycle, longBreakEvery) {
  if (phase === POMODORO_PHASE.FOCUS) {
    const every = Math.max(1, Number(longBreakEvery) || 4);
    const count = Number(focusCountInCycle) || 0;
    return count > 0 && count % every === 0
      ? POMODORO_PHASE.LONG_BREAK
      : POMODORO_PHASE.SHORT_BREAK;
  }
  return POMODORO_PHASE.FOCUS;
}

export function createInitialState(config) {
  const normalized = normalizePomodoroConfig(config);
  const durationMs = durationMsForPhase(POMODORO_PHASE.FOCUS, normalized);
  return {
    status: POMODORO_STATUS.IDLE,
    phase: POMODORO_PHASE.FOCUS,
    remainingMs: durationMs,
    durationMs,
    endsAtMs: null,
    focusCountInCycle: 0,
    completedFocusTotal: 0,
    config: normalized,
  };
}

export function getRemainingMs(state, now = Date.now()) {
  if (!state) return 0;
  if (state.status === POMODORO_STATUS.RUNNING && Number.isFinite(state.endsAtMs)) {
    return Math.max(0, state.endsAtMs - now);
  }
  return Math.max(0, Number(state.remainingMs) || 0);
}

function withPhase(state, phase) {
  const durationMs = durationMsForPhase(phase, state.config);
  return {
    ...state,
    phase,
    durationMs,
    remainingMs: durationMs,
    endsAtMs: null,
    status: POMODORO_STATUS.IDLE,
  };
}

function startRunning(state, now) {
  const remainingMs = getRemainingMs(state, now);
  if (remainingMs <= 0) {
    return completePhase(state, now);
  }
  return {
    state: {
      ...state,
      status: POMODORO_STATUS.RUNNING,
      remainingMs,
      endsAtMs: now + remainingMs,
    },
    events: [],
  };
}

function completePhase(state, now) {
  const events = [
    { type: 'phase_complete', phase: state.phase, atMs: now },
  ];
  let focusCountInCycle = state.focusCountInCycle;
  let completedFocusTotal = state.completedFocusTotal;

  if (state.phase === POMODORO_PHASE.FOCUS) {
    focusCountInCycle += 1;
    completedFocusTotal += 1;
    if (focusCountInCycle % state.config.longBreakEvery === 0) {
      events.push({
        type: 'cycle_complete',
        completedFocusTotal,
        atMs: now,
      });
    }
  }

  const nextPhase = nextPhaseAfter(
    state.phase,
    focusCountInCycle,
    state.config.longBreakEvery,
  );
  if (state.phase === POMODORO_PHASE.LONG_BREAK) {
    focusCountInCycle = 0;
  }

  let next = {
    ...withPhase(state, nextPhase),
    focusCountInCycle,
    completedFocusTotal,
  };

  if (state.config.autoStartNext) {
    const started = startRunning(next, now);
    return { state: started.state, events: events.concat(started.events) };
  }
  return { state: next, events };
}

export function start(state, now = Date.now()) {
  if (!state) return { state: createInitialState(), events: [] };
  if (state.status === POMODORO_STATUS.RUNNING) {
    return { state, events: [] };
  }
  return startRunning(state, now);
}

export function pause(state, now = Date.now()) {
  if (!state || state.status !== POMODORO_STATUS.RUNNING) {
    return { state, events: [] };
  }
  return {
    state: {
      ...state,
      status: POMODORO_STATUS.PAUSED,
      remainingMs: getRemainingMs(state, now),
      endsAtMs: null,
    },
    events: [],
  };
}

export function resume(state, now = Date.now()) {
  if (!state || state.status !== POMODORO_STATUS.PAUSED) {
    return { state, events: [] };
  }
  return startRunning(state, now);
}

/** 현재 페이즈를 완료하지 않고 다음으로. 집중 skip은 횟수에 안 셈. */
export function skip(state, now = Date.now()) {
  if (!state) return { state: createInitialState(), events: [] };
  const events = [{ type: 'phase_skip', phase: state.phase, atMs: now }];
  let focusCountInCycle = state.focusCountInCycle;
  if (state.phase === POMODORO_PHASE.LONG_BREAK) {
    focusCountInCycle = 0;
  }
  const nextPhase = nextPhaseAfter(
    state.phase,
    focusCountInCycle,
    state.config.longBreakEvery,
  );
  let next = {
    ...withPhase(state, nextPhase),
    focusCountInCycle,
  };
  if (state.config.autoStartNext) {
    const started = startRunning(next, now);
    return { state: started.state, events: events.concat(started.events) };
  }
  return { state: next, events };
}

export function reset(state, config) {
  const keep = config
    ? normalizePomodoroConfig(config)
    : state?.config || DEFAULT_POMODORO_CONFIG;
  return {
    state: createInitialState(keep),
    events: [{ type: 'reset', atMs: Date.now() }],
  };
}

export function setConfig(state, config, now = Date.now()) {
  const nextConfig = normalizePomodoroConfig(config);
  if (!state) {
    return { state: createInitialState(nextConfig), events: [] };
  }
  const remainingMs = getRemainingMs(state, now);
  const nextDuration = durationMsForPhase(state.phase, nextConfig);
  const untouched =
    state.status === POMODORO_STATUS.IDLE &&
    remainingMs === state.durationMs;
  const durationMs = untouched ? nextDuration : state.durationMs;
  const nextRemaining = untouched ? nextDuration : remainingMs;
  const next = {
    ...state,
    config: nextConfig,
    durationMs,
    remainingMs: nextRemaining,
    endsAtMs:
      state.status === POMODORO_STATUS.RUNNING ? now + nextRemaining : null,
  };
  return { state: next, events: [] };
}

export function tick(state, now = Date.now()) {
  if (!state || state.status !== POMODORO_STATUS.RUNNING) {
    return { state, events: [] };
  }
  if (getRemainingMs(state, now) > 0) {
    return { state, events: [] };
  }
  return completePhase(state, now);
}

export function toView(state, now = Date.now()) {
  const remainingMs = getRemainingMs(state, now);
  const durationMs = Math.max(1, Number(state?.durationMs) || 1);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const durationSec = Math.round(durationMs / 1000);
  const nextPhase = nextPhaseAfter(
    state?.phase,
    state?.phase === POMODORO_PHASE.FOCUS
      ? (Number(state?.focusCountInCycle) || 0) + 1
      : Number(state?.focusCountInCycle) || 0,
    state?.config?.longBreakEvery,
  );
  return {
    status: state?.status || POMODORO_STATUS.IDLE,
    phase: state?.phase || POMODORO_PHASE.FOCUS,
    remainingMs,
    remainingSec,
    durationMs,
    durationSec,
    progress: Math.min(1, Math.max(0, 1 - remainingMs / durationMs)),
    focusCountInCycle: Number(state?.focusCountInCycle) || 0,
    completedFocusTotal: Number(state?.completedFocusTotal) || 0,
    longBreakEvery: state?.config?.longBreakEvery || 4,
    nextPhase,
    endsAtMs: state?.status === POMODORO_STATUS.RUNNING ? state.endsAtMs : null,
    config: state?.config || DEFAULT_POMODORO_CONFIG,
  };
}

export function serializeState(state) {
  return {
    status:
      state?.status === POMODORO_STATUS.RUNNING
        ? POMODORO_STATUS.PAUSED
        : state?.status || POMODORO_STATUS.IDLE,
    phase: state?.phase || POMODORO_PHASE.FOCUS,
    remainingMs: getRemainingMs(state, Date.now()),
    durationMs: Number(state?.durationMs) || 0,
    endsAtMs: null,
    focusCountInCycle: Number(state?.focusCountInCycle) || 0,
    completedFocusTotal: Number(state?.completedFocusTotal) || 0,
    config: normalizePomodoroConfig(state?.config),
  };
}

export function hydrateState(raw) {
  if (!raw || typeof raw !== 'object') return createInitialState();
  const config = normalizePomodoroConfig(raw.config);
  const phase = Object.values(POMODORO_PHASE).includes(raw.phase)
    ? raw.phase
    : POMODORO_PHASE.FOCUS;
  const durationMs =
    Number(raw.durationMs) > 0
      ? Math.floor(Number(raw.durationMs))
      : durationMsForPhase(phase, config);
  const remainingMs = Math.min(
    durationMs,
    Math.max(0, Math.floor(Number(raw.remainingMs) || durationMs)),
  );
  return {
    status:
      raw.status === POMODORO_STATUS.PAUSED
        ? POMODORO_STATUS.PAUSED
        : POMODORO_STATUS.IDLE,
    phase,
    remainingMs,
    durationMs,
    endsAtMs: null,
    focusCountInCycle: Math.max(0, Math.floor(Number(raw.focusCountInCycle) || 0)),
    completedFocusTotal: Math.max(
      0,
      Math.floor(Number(raw.completedFocusTotal) || 0),
    ),
    config,
  };
}

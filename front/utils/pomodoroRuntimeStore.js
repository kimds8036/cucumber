/**
 * 뽀모도로 런타임 — 화면은 subscribe / usePomodoro 로만 구독.
 * 기존 공부 타이머(timerRuntimeStore)와 상태를 섞지 않는다.
 */
import {
  createInitialState,
  start,
  pause,
  resume,
  skip,
  reset,
  setConfig,
  tick,
  toView,
  serializeState,
  hydrateState,
} from './pomodoroEngine';

const listeners = new Set();
let state = createInitialState();

function emit(events) {
  const view = toView(state, Date.now());
  listeners.forEach((listener) => {
    try {
      listener(view, events);
    } catch {
      // noop
    }
  });
  return { view, events };
}

function apply(reducer, now = Date.now()) {
  const result = reducer(state, now);
  state = result.state;
  return emit(result.events || []);
}

export function getPomodoroState() {
  return state;
}

export function getPomodoroView(now = Date.now()) {
  return toView(state, now);
}

export function subscribePomodoro(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function pomodoroStart(now = Date.now()) {
  return apply(start, now);
}

export function pomodoroPause(now = Date.now()) {
  return apply(pause, now);
}

export function pomodoroResume(now = Date.now()) {
  return apply(resume, now);
}

export function pomodoroSkip(now = Date.now()) {
  return apply(skip, now);
}

export function pomodoroReset(config) {
  const result = reset(state, config);
  state = result.state;
  return emit(result.events || []);
}

export function pomodoroSetConfig(config, now = Date.now()) {
  return apply((prev) => setConfig(prev, config, now), now);
}

export function pomodoroTick(now = Date.now()) {
  return apply(tick, now);
}

export function pomodoroHydrate(raw) {
  state = hydrateState(raw);
  return emit([]);
}

export function pomodoroSerialize() {
  return serializeState(state);
}

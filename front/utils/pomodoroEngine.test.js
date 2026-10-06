import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POMODORO_PHASE,
  POMODORO_STATUS,
  createInitialState,
  start,
  pause,
  resume,
  skip,
  reset,
  setConfig,
  tick,
  toView,
  hydrateState,
  serializeState,
  nextPhaseAfter,
} from './pomodoroEngine.js';

const CFG = {
  focusSec: 25,
  shortBreakSec: 5,
  longBreakSec: 15,
  longBreakEvery: 4,
  autoStartNext: false,
};

function apply(result) {
  return result.state;
}

test('초기 상태는 집중 idle', () => {
  const s = createInitialState(CFG);
  assert.equal(s.phase, POMODORO_PHASE.FOCUS);
  assert.equal(s.status, POMODORO_STATUS.IDLE);
  assert.equal(s.remainingMs, 25_000);
});

test('start → pause → resume 은 남은 시간을 유지한다', () => {
  let s = createInitialState(CFG);
  s = apply(start(s, 1_000));
  assert.equal(s.status, POMODORO_STATUS.RUNNING);
  assert.equal(s.endsAtMs, 26_000);

  s = apply(pause(s, 6_000));
  assert.equal(s.status, POMODORO_STATUS.PAUSED);
  assert.equal(s.remainingMs, 20_000);
  assert.equal(s.endsAtMs, null);

  s = apply(resume(s, 10_000));
  assert.equal(s.status, POMODORO_STATUS.RUNNING);
  assert.equal(s.endsAtMs, 30_000);
});

test('집중이 끝나면 짧은 휴식으로 넘어가고 횟수를 센다', () => {
  let s = apply(start(createInitialState(CFG), 0));
  const done = tick(s, 25_000);
  assert.equal(done.events[0].type, 'phase_complete');
  assert.equal(done.events[0].phase, POMODORO_PHASE.FOCUS);
  assert.equal(done.state.phase, POMODORO_PHASE.SHORT_BREAK);
  assert.equal(done.state.status, POMODORO_STATUS.IDLE);
  assert.equal(done.state.focusCountInCycle, 1);
  assert.equal(done.state.completedFocusTotal, 1);
  assert.equal(done.state.remainingMs, 5_000);
});

test('4번째 집중 완료 후 긴 휴식 + cycle_complete', () => {
  let s = createInitialState(CFG);
  let lastEvents = [];
  for (let i = 0; i < 4; i += 1) {
    s = apply(start(s, i * 100_000));
    const result = tick(s, i * 100_000 + 25_000);
    s = result.state;
    lastEvents = result.events;
    if (i < 3) {
      assert.equal(s.phase, POMODORO_PHASE.SHORT_BREAK);
      s = apply(skip(s));
    }
  }
  assert.equal(s.phase, POMODORO_PHASE.LONG_BREAK);
  assert.equal(s.completedFocusTotal, 4);
  assert.equal(lastEvents.some((e) => e.type === 'cycle_complete'), true);
});

test('skip 은 집중 횟수를 올리지 않는다', () => {
  let s = apply(start(createInitialState(CFG), 0));
  const skipped = skip(s, 3_000);
  assert.equal(skipped.events[0].type, 'phase_skip');
  assert.equal(skipped.state.phase, POMODORO_PHASE.SHORT_BREAK);
  assert.equal(skipped.state.focusCountInCycle, 0);
  assert.equal(skipped.state.completedFocusTotal, 0);
});

test('autoStartNext 는 다음 페이즈를 바로 running 으로 둔다', () => {
  const s0 = createInitialState({ ...CFG, autoStartNext: true });
  const running = apply(start(s0, 0));
  const done = tick(running, 25_000);
  assert.equal(done.state.phase, POMODORO_PHASE.SHORT_BREAK);
  assert.equal(done.state.status, POMODORO_STATUS.RUNNING);
  assert.equal(done.state.endsAtMs, 30_000);
});

test('idle 에서 setConfig 는 현재 페이즈 길이를 바꾼다', () => {
  const s = apply(setConfig(createInitialState(CFG), { ...CFG, focusSec: 40 }));
  assert.equal(s.remainingMs, 40_000);
  assert.equal(s.durationMs, 40_000);
});

test('serialize 후 hydrate 하면 running 이 paused 로 복원된다', () => {
  let s = apply(start(createInitialState(CFG), 1_000));
  s = apply(pause(s, 6_000));
  const raw = serializeState(s);
  const restored = hydrateState(raw);
  assert.equal(restored.status, POMODORO_STATUS.PAUSED);
  assert.equal(restored.remainingMs, 20_000);
  assert.equal(restored.phase, POMODORO_PHASE.FOCUS);
});

test('nextPhaseAfter — 4회마다 긴 휴식', () => {
  assert.equal(nextPhaseAfter('focus', 0, 4), 'short_break');
  assert.equal(nextPhaseAfter('focus', 1, 4), 'short_break');
  assert.equal(nextPhaseAfter('focus', 4, 4), 'long_break');
  assert.equal(nextPhaseAfter('short_break', 2, 4), 'focus');
});

test('toView remainingSec 은 올림', () => {
  const s = apply(start(createInitialState(CFG), 0));
  const view = toView(s, 24_100);
  assert.equal(view.remainingSec, 1);
  assert.ok(view.progress > 0.9);
});

test('reset 은 설정만 남기고 처음으로', () => {
  let s = apply(start(createInitialState(CFG), 0));
  s = apply(tick(s, 25_000));
  s = apply(reset(s));
  assert.equal(s.phase, POMODORO_PHASE.FOCUS);
  assert.equal(s.completedFocusTotal, 0);
  assert.equal(s.config.focusSec, 25);
});

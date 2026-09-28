import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getPomodoroView,
  pomodoroPause,
  pomodoroReset,
  pomodoroResume,
  pomodoroSetConfig,
  pomodoroSkip,
  pomodoroStart,
  pomodoroTick,
  subscribePomodoro,
} from '../utils/pomodoroRuntimeStore';

/**
 * 뽀모도로 화면용 훅. 레이아웃은 넣지 않는다.
 *
 * const p = usePomodoro();
 * p.remainingSec / p.phase / p.status
 * p.start() p.pause() p.resume() p.skip() p.reset()
 * onEvent(view, events) 로 phase_complete / cycle_complete 처리
 */
export function usePomodoro({ onEvent } = {}) {
  const [view, setView] = useState(() => getPomodoroView());
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const start = useCallback(() => pomodoroStart(), []);
  const pause = useCallback(() => pomodoroPause(), []);
  const resumeFn = useCallback(() => pomodoroResume(), []);
  const skip = useCallback(() => pomodoroSkip(), []);
  const reset = useCallback((config) => pomodoroReset(config), []);
  const setConfig = useCallback((config) => pomodoroSetConfig(config), []);
  const tick = useCallback(() => pomodoroTick(), []);

  useEffect(
    () =>
      subscribePomodoro((next, events) => {
        setView(next);
        if (events?.length && typeof onEventRef.current === 'function') {
          onEventRef.current(next, events);
        }
      }),
    [],
  );

  useEffect(() => {
    if (view.status !== 'running') return undefined;
    const id = setInterval(() => {
      pomodoroTick();
    }, 250);
    return () => clearInterval(id);
  }, [view.status]);

  return {
    ...view,
    start,
    pause,
    resume: resumeFn,
    skip,
    reset,
    setConfig,
    tick,
  };
}

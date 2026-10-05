/**
 * 스터디룸의 뽀모도로 조작을 타이머 화면의 시작·정지·건너뛰기와 같은 함수로 연결한다.
 */
let toggleHandler = null;
let skipHandler = null;

export function registerPomodoroRoomActions(actions) {
  toggleHandler = typeof actions?.toggle === 'function' ? actions.toggle : null;
  skipHandler = typeof actions?.skip === 'function' ? actions.skip : null;
  return () => {
    if (toggleHandler === actions?.toggle) toggleHandler = null;
    if (skipHandler === actions?.skip) skipHandler = null;
  };
}

export function requestPomodoroToggle() {
  if (typeof toggleHandler !== 'function') return false;
  try {
    toggleHandler();
    return true;
  } catch {
    return false;
  }
}

export function requestPomodoroSkip() {
  if (typeof skipHandler !== 'function') return false;
  try {
    skipHandler();
    return true;
  } catch {
    return false;
  }
}

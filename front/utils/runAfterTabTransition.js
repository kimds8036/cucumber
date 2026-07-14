import { InteractionManager } from 'react-native';

/** 탭 전환·터치 피드백이 먼저 그려진 뒤 무거운 작업 실행 */
export function runAfterTabTransition(task) {
  const handle = InteractionManager.runAfterInteractions(() => {
    task();
  });
  return () => handle.cancel();
}

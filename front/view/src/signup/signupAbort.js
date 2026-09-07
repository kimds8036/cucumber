import { InteractionManager, Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { waitForPresentationLayerRelease } from '../../../services/inicisAuth';

/** SignupIosSafeModal(500) / AppPopupModal(320) dismiss 여유 */
const IOS_MODAL_CLEAR_MS = 520;
const ANDROID_MODAL_CLEAR_MS = 80;

/**
 * iOS Modal·Alert 잔여 터치 레이어가 사라질 때까지 대기
 */
export async function waitForSignupModalsToClear() {
  await waitForPresentationLayerRelease();
  await new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(
        resolve,
        Platform.OS === 'ios' ? IOS_MODAL_CLEAR_MS : ANDROID_MODAL_CLEAR_MS,
      );
    });
  });
}

/**
 * 가입 플로우를 종료하고 SignupEntry 로 돌아간다 (확인 팝업 없음).
 * Modal/Alert 가 닫히는 중 이동하지 않도록 prepareLeave → 대기 → reset 순서.
 * Auth 초기와 같이 SignupEntry 단일 스택으로 비운다.
 *
 * @param {object} opts
 * @param {*} opts.navigation
 * @param {() => void|Promise<void>} [opts.clearFlowSession]
 * @param {() => void|Promise<void>} [opts.prepareLeave] 오버레이·알림 visible=false 등
 */
export async function leaveSignupToEntry({
  navigation,
  clearFlowSession,
  prepareLeave,
} = {}) {
  try {
    if (typeof prepareLeave === 'function') {
      await prepareLeave();
    }
  } catch {
    // 무시 — 이동은 계속
  }

  try {
    if (typeof clearFlowSession === 'function') {
      await clearFlowSession();
    }
  } catch {
    // 세션 정리 실패해도 Entry 복귀는 진행
  }

  await waitForSignupModalsToClear();

  if (!navigation) return;

  navigation.dispatch?.(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'SignupEntry' }],
    }),
  );
}

/**
 * SignupBlockingAlertModal 용 — 「가입을 중단할까요?」
 */
export function buildAbortSignupConfirmAlert({ onConfirm, onKeepGoing }) {
  return {
    visible: true,
    title: '가입을 중단할까요?',
    message: '',
    buttons: [
      {
        text: '중단',
        onPress: () => {
          void onConfirm?.();
        },
      },
      {
        text: '계속하기',
        variant: 'secondary',
        onPress: () => onKeepGoing?.(),
      },
    ],
  };
}

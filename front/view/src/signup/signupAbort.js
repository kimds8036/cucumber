/**
 * 가입 플로우를 종료하고 SignupEntry 로 돌아간다 (확인 팝업 없음).
 * Entry 는 replace 로 열어 스택에 가입 화면이 남지 않게 한다.
 */
export async function leaveSignupToEntry({
  navigation,
  clearFlowSession,
} = {}) {
  try {
    if (typeof clearFlowSession === 'function') {
      await clearFlowSession();
    }
  } catch {
    // 세션 정리 실패해도 Entry 복귀는 진행
  }

  if (!navigation) return;

  if (typeof navigation.replace === 'function') {
    navigation.replace('SignupEntry');
    return;
  }
  navigation.navigate?.('SignupEntry');
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

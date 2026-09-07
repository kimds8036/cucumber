import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * 가입 플로우(SignKakao/Apple/Phone)에서 스택 pop·시스템 뒤로가기를 막는다.
 * replace/navigate/reset 등 의도적 화면 전환은 허용한다.
 */
export default function usePreventSignupStackExit(navigation) {
  useEffect(() => {
    if (!navigation) return undefined;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const type = e?.data?.action?.type;
      if (type === 'GO_BACK' || type === 'POP' || type === 'POP_TO_TOP') {
        e.preventDefault();
      }
    });

    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);

    return () => {
      unsubscribe();
      sub.remove();
    };
  }, [navigation]);
}

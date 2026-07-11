import { useCallback, useMemo } from 'react';
import {
  useNavigation,
  CommonActions,
  StackActions,
} from '@react-navigation/native';

/**
 * 앱 전역에서 사용하는 공통 네비게이션 훅.
 * 스택 중복/뒤로가기 시 이전 화면 재노출 문제를 방지하기 위해
 * goTo / replaceWith / resetTo / goBack 를 직관적으로 사용할 수 있게 합니다.
 *
 * @example
 * const { goTo, replaceWith, resetTo, goBack } = useAppNavigation();
 * goTo('BoardDetail', { id: 123 });
 * replaceWith('Main');  // 글쓰기 완료 후 작성 화면이 스택에 남지 않도록
 * resetTo('Login');    // 로그아웃 시 전체 스택 비우고 로그인으로 (단일 스택 사용 시)
 */
export function useAppNavigation() {
  const navigation = useNavigation();

  const goTo = useCallback(
    (name, params) => {
      navigation.navigate(name, params);
    },
    [navigation],
  );

  const replaceWith = useCallback(
    (name, params) => {
      navigation.dispatch(StackActions.replace(name, params ?? {}));
    },
    [navigation],
  );

  const resetTo = useCallback(
    (name, params) => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name, params: params ?? {} }],
        }),
      );
    },
    [navigation],
  );

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return useMemo(
    () => ({ goTo, replaceWith, resetTo, goBack }),
    [goTo, replaceWith, resetTo, goBack],
  );
}

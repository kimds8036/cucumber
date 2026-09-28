import { createContext, useContext } from 'react';

/**
 * 콘텐츠 위에 떠 있는 메인 탭 바 높이.
 * 탭 바가 콘텐츠 아래에 따로 자리를 차지하는 화면에서는 0이다.
 */
export const MainTabBarInsetContext = createContext(0);

export function useMainTabBarInset() {
  return useContext(MainTabBarInsetContext);
}

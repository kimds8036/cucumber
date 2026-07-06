import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export const MAIN_TAB_TITLES = {
  board: '전체 게시판',
  message: '메시지',
  school: '우리 학교',
  timer: '타이머',
  mypage: '마이페이지',
};

export function getMainTabTitle(tab) {
  return MAIN_TAB_TITLES[tab] ?? MAIN_TAB_TITLES.board;
}

const MainShellContext = createContext(null);

export function MainShellProvider({
  children,
  navigation,
  activeTab,
  setActiveTab,
}) {
  const [headerTitle, setHeaderTitleState] = useState(MAIN_TAB_TITLES.board);

  const setHeaderTitle = useCallback((title) => {
    setHeaderTitleState(title);
  }, []);

  const value = useMemo(
    () => ({
      navigation,
      headerTitle,
      setHeaderTitle,
      activeTab,
      setActiveTab,
    }),
    [navigation, headerTitle, setHeaderTitle, activeTab, setActiveTab],
  );

  return (
    <MainShellContext.Provider value={value}>{children}</MainShellContext.Provider>
  );
}

export function useMainShell() {
  const ctx = useContext(MainShellContext);
  if (!ctx) {
    throw new Error('useMainShell must be used within MainShellProvider');
  }
  return ctx;
}

export function useMainShellOptional() {
  return useContext(MainShellContext);
}

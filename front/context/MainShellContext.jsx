import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

/**
 * @typedef {'national'|'student'} BoardFeedMode
 */

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
  /** @type {[BoardFeedMode, function]} */
  const [boardFeedMode, setBoardFeedModeState] = useState('national');
  const [studentVerifyRequest, setStudentVerifyRequest] = useState(null);

  const setHeaderTitle = useCallback((title) => {
    setHeaderTitleState(title);
  }, []);

  const setBoardFeedMode = useCallback((mode) => {
    setBoardFeedModeState(mode === 'student' ? 'student' : 'national');
  }, []);

  /** 우리학교 등에서 학생증 인증 플로우 요청 (App이 구독) */
  const requestStudentVerification = useCallback((payload = {}) => {
    setStudentVerifyRequest({
      id: Date.now(),
      reason: payload.reason || 'school',
      statusHint: payload.statusHint || null,
    });
  }, []);

  const clearStudentVerificationRequest = useCallback(() => {
    setStudentVerifyRequest(null);
  }, []);

  const value = useMemo(
    () => ({
      navigation,
      headerTitle,
      setHeaderTitle,
      activeTab,
      setActiveTab,
      boardFeedMode,
      setBoardFeedMode,
      studentVerifyRequest,
      requestStudentVerification,
      clearStudentVerificationRequest,
    }),
    [
      navigation,
      headerTitle,
      setHeaderTitle,
      activeTab,
      setActiveTab,
      boardFeedMode,
      setBoardFeedMode,
      studentVerifyRequest,
      requestStudentVerification,
      clearStudentVerificationRequest,
    ],
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

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
  /** CTA/준비물/학생증 화면 등 학생인증 UI가 열려 있으면 true (탭 CTA 재표시 방지) */
  const [studentVerifyUiOpen, setStudentVerifyUiOpen] = useState(false);

  const setHeaderTitle = useCallback((title) => {
    setHeaderTitleState(title);
  }, []);

  const setBoardFeedMode = useCallback((mode) => {
    setBoardFeedModeState(mode === 'student' ? 'student' : 'national');
  }, []);

  /** 우리학교 등에서 학생인증 플로우 요청 (MainScreen Bridge가 구독) */
  const requestStudentVerification = useCallback((payload = {}) => {
    // CTA 모달 dismiss 직후 재표시·이중 Modal 경쟁을 막기 위해 즉시 잠금
    setStudentVerifyUiOpen(true);
    setStudentVerifyRequest({
      id: Date.now(),
      reason: payload.reason || 'school',
      statusHint: payload.statusHint || null,
    });
  }, []);

  const clearStudentVerificationRequest = useCallback(() => {
    setStudentVerifyRequest(null);
  }, []);

  const endStudentVerificationUi = useCallback(() => {
    setStudentVerifyUiOpen(false);
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
      studentVerifyUiOpen,
      requestStudentVerification,
      clearStudentVerificationRequest,
      endStudentVerificationUi,
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
      studentVerifyUiOpen,
      requestStudentVerification,
      clearStudentVerificationRequest,
      endStudentVerificationUi,
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

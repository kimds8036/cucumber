import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { getAppLockEnabled } from '../utils/appLockStorage';
import LockScreen from '../src/screens/LockScreen';

const BACKGROUND_LOCK_THRESHOLD_MS = 30_000;

const AppLockContext = createContext({
  refreshFromStorage: async () => {},
});

export function useAppLock() {
  return useContext(AppLockContext);
}

export function AppLockProvider({ children }) {
  const { isLoggedIn, authHydrated } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const backgroundTime = useRef(null);
  const isLockedRef = useRef(false);
  const prevLoggedInRef = useRef(null);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  const refreshFromStorage = useCallback(
    async ({ lockIfEnabled = false } = {}) => {
      if (!isLoggedIn) {
        setIsLocked(false);
        setIsReady(true);
        return;
      }

      const lockEnabled = await getAppLockEnabled();
      if (!lockEnabled) {
        setIsLocked(false);
      } else if (lockIfEnabled) {
        setIsLocked(true);
      }
      setIsReady(true);
    },
    [isLoggedIn],
  );

  useEffect(() => {
    if (!authHydrated) return;

    const prevLoggedIn = prevLoggedInRef.current;
    prevLoggedInRef.current = isLoggedIn;

    if (!isLoggedIn) {
      setIsLocked(false);
      setIsReady(true);
      return;
    }

    // 로그인 직후(false → true): 캐시된 앱 잠금 설정이 있어도 LockScreen 생략
    if (prevLoggedIn === false) {
      refreshFromStorage({ lockIfEnabled: false });
      return;
    }

    // 앱 재실행 등 기존 세션 복원(prev === null → true): 잠금 적용
    refreshFromStorage({ lockIfEnabled: true });
  }, [authHydrated, isLoggedIn, refreshFromStorage]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;

    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'background') {
        backgroundTime.current = Date.now();
      }

      if (nextState === 'active' && backgroundTime.current) {
        const elapsed = Date.now() - backgroundTime.current;
        const lockEnabled = await getAppLockEnabled();

        if (
          lockEnabled &&
          elapsed >= BACKGROUND_LOCK_THRESHOLD_MS &&
          !isLockedRef.current
        ) {
          setIsLocked(true);
        }
        backgroundTime.current = null;
      }
    });

    return () => subscription.remove();
  }, [isLoggedIn]);

  const handleUnlock = useCallback(() => {
    setIsLocked(false);
    backgroundTime.current = null;
  }, []);

  const contextValue = useMemo(
    () => ({ refreshFromStorage }),
    [refreshFromStorage],
  );

  if (!authHydrated || !isReady) return null;

  if (isLoggedIn && isLocked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <AppLockContext.Provider value={contextValue}>
      {children}
    </AppLockContext.Provider>
  );
}

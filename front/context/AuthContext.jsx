import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, clearAuthToken, clearUserSessionStorage } from '../utils/api';
import { appAlert } from '../utils/appAlert';
import {
  getCachedStudentVerificationStatus,
  setCachedStudentVerificationStatus,
  clearCachedStudentVerificationStatus,
} from '../utils/studentVerificationStorage';
import {
  getCachedReverification,
  setCachedReverification,
  clearCachedReverification,
} from '../utils/reverificationStorage';
import {
  registerSessionTerminateHandler,
  getSessionTerminateTitle,
  resetSessionTerminateGuard,
  markSessionTerminateAlertShown,
} from '../utils/sessionTerminate';
import * as socketManager from '../view/src/socketManager';

const AUTH_TOKEN_KEY = '@auth_token';

const AuthContext = createContext(null);

/**
 * 로그인 상태 + 학생증 검수 + 재인증(reverification) 상태 관리
 */
export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [postLoginRoute, setPostLoginRoute] = useState('Main');
  const [studentVerificationStatus, setStudentVerificationStatus] =
    useState('PENDING');
  const [rejectReason, setRejectReason] = useState(null);
  const [reverificationStatus, setReverificationStatus] = useState('none');
  const [reverificationDeadline, setReverificationDeadline] = useState(null);
  const [reverificationSubmissionPending, setReverificationSubmissionPending] =
    useState(false);

  const applyVerification = useCallback(async (status, reason, extra = {}) => {
    const nextStatus = status || 'PENDING';
    setStudentVerificationStatus(nextStatus);
    setRejectReason(reason || null);
    if (extra.reverificationSubmissionPending != null) {
      setReverificationSubmissionPending(Boolean(extra.reverificationSubmissionPending));
    }
    await setCachedStudentVerificationStatus(nextStatus, reason || null);
  }, []);

  const applyReverification = useCallback(async (status, deadline) => {
    const nextStatus = status || 'none';
    setReverificationStatus(nextStatus);
    setReverificationDeadline(deadline || null);
    await setCachedReverification(nextStatus, deadline || null);
  }, []);

  const applyUserProfile = useCallback(
    async (data) => {
      if (!data) return;
      await applyVerification(
        data.studentVerificationStatus,
        data.rejectReason,
        { reverificationSubmissionPending: data.reverificationSubmissionPending },
      );
      await applyReverification(
        data.reverificationStatus,
        data.reverificationDeadline,
      );
    },
    [applyVerification, applyReverification],
  );

  const refreshStudentVerification = useCallback(async () => {
    try {
      const res = await api.get('/api/auth/me');
      const data = res.data?.data;
      if (data) {
        await applyUserProfile(data);
      }
      return data;
    } catch {
      return null;
    }
  }, [applyUserProfile]);

  const logout = useCallback(async () => {
    setPostLoginRoute('Main');
    setStudentVerificationStatus('PENDING');
    setRejectReason(null);
    setReverificationStatus('none');
    setReverificationDeadline(null);
    setReverificationSubmissionPending(false);
    await clearCachedStudentVerificationStatus();
    await clearCachedReverification();
    await clearAuthToken();
    setIsLoggedIn(false);
  }, []);

  useEffect(() => {
    registerSessionTerminateHandler(async ({ code, message }) => {
      try {
        socketManager.disconnectSocket?.({
          force: true,
          reason: `session_terminated:${code || 'unknown'}`,
        });
      } catch {
        // ignore
      }
      await clearUserSessionStorage();
      await clearAuthToken();
      await logout();
      if (markSessionTerminateAlertShown()) {
        appAlert.alert(
          getSessionTerminateTitle(code),
          message || '로그인이 만료되어 다시 로그인해주세요.',
        );
      }
    });
  }, [logout]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
          if (mounted) {
            setIsLoggedIn(false);
            setAuthHydrated(true);
          }
          return;
        }

        const [cachedVerification, cachedReverification] = await Promise.all([
          getCachedStudentVerificationStatus(),
          getCachedReverification(),
        ]);
        if (mounted) {
          setStudentVerificationStatus(cachedVerification.status);
          setRejectReason(cachedVerification.rejectReason);
          setReverificationStatus(cachedReverification.status);
          setReverificationDeadline(cachedReverification.deadline);
          setIsLoggedIn(true);
          setAuthHydrated(true);
        }

        if (mounted) {
          refreshStudentVerification();
        }
      } catch {
        if (mounted) {
          setAuthHydrated(true);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshStudentVerification]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshStudentVerification();
      }
    });

    return () => sub.remove();
  }, [isLoggedIn, refreshStudentVerification]);

  const login = useCallback(
    async (options = {}) => {
      const nextRoute =
        options?.postLoginRoute === 'GuideOverlay' ? 'GuideOverlay' : 'Main';
      setPostLoginRoute(nextRoute);

      if (options?.studentVerificationStatus) {
        await applyVerification(
          options.studentVerificationStatus,
          options.rejectReason,
        );
      }

      if (options?.reverificationStatus != null) {
        await applyReverification(
          options.reverificationStatus,
          options.reverificationDeadline,
        );
      }

      resetSessionTerminateGuard();
      setIsLoggedIn(true);
    },
    [applyVerification, applyReverification],
  );

  const value = {
    isLoggedIn,
    authHydrated,
    login,
    logout,
    postLoginRoute,
    setPostLoginRoute,
    studentVerificationStatus,
    rejectReason,
    reverificationStatus,
    reverificationDeadline,
    reverificationSubmissionPending,
    applyVerification,
    applyReverification,
    refreshStudentVerification,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

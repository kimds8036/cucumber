import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';
import {
  getCachedStudentVerificationStatus,
  setCachedStudentVerificationStatus,
  clearCachedStudentVerificationStatus,
} from '../utils/studentVerificationStorage';

const AUTH_TOKEN_KEY = '@auth_token';

const AuthContext = createContext(null);

/**
 * 로그인 상태 + 학생증 검수 상태(PENDING/APPROVED/REJECTED) 관리
 */
export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [postLoginRoute, setPostLoginRoute] = useState('Main');
  const [studentVerificationStatus, setStudentVerificationStatus] =
    useState('APPROVED');
  const [rejectReason, setRejectReason] = useState(null);

  const applyVerification = useCallback(async (status, reason) => {
    const nextStatus = status || 'APPROVED';
    setStudentVerificationStatus(nextStatus);
    setRejectReason(reason || null);
    await setCachedStudentVerificationStatus(nextStatus, reason || null);
  }, []);

  const refreshStudentVerification = useCallback(async () => {
    try {
      const res = await api.get('/api/auth/me');
      const data = res.data?.data;
      if (data) {
        await applyVerification(
          data.studentVerificationStatus,
          data.rejectReason,
        );
      }
      return data;
    } catch {
      return null;
    }
  }, [applyVerification]);

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

        const cached = await getCachedStudentVerificationStatus();
        if (mounted) {
          setStudentVerificationStatus(cached.status);
          setRejectReason(cached.rejectReason);
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

      setIsLoggedIn(true);
    },
    [applyVerification],
  );

  const logout = useCallback(async () => {
    setPostLoginRoute('Main');
    setStudentVerificationStatus('APPROVED');
    setRejectReason(null);
    await clearCachedStudentVerificationStatus();
    setIsLoggedIn(false);
  }, []);

  const value = {
    isLoggedIn,
    authHydrated,
    login,
    logout,
    postLoginRoute,
    setPostLoginRoute,
    studentVerificationStatus,
    rejectReason,
    applyVerification,
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

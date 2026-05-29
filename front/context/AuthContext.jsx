import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = '@auth_token';

const AuthContext = createContext(null);

/**
 * 로그인 상태에 따른 Auth Flow(선언적 스택 분리)를 위한 Context.
 * isLoggedIn 값에 따라 App.js에서 Auth 스택 / Main 스택을 분리 렌더링합니다.
 */
export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [postLoginRoute, setPostLoginRoute] = useState('Main');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (mounted && token) setIsLoggedIn(true);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback((options = {}) => {
    const nextRoute =
      options?.postLoginRoute === 'GuideOverlay' ? 'GuideOverlay' : 'Main';
    setPostLoginRoute(nextRoute);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    setPostLoginRoute('Main');
    setIsLoggedIn(false);
  }, []);

  const value = { isLoggedIn, login, logout, postLoginRoute, setPostLoginRoute };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

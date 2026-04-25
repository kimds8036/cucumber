import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, clearAuthToken, setAuthToken } from '../utils/api';
import { useAuth } from './AuthContext';
import * as socketManager from '../view/src/socketManager';

const AUTH_TOKEN_KEY = '@auth_token';
const SOCKET_AUTH_ERROR_CODE = 'AUTH_FAILED';
const AUTH_ERROR_KEYWORDS = ['토큰', '인증', 'invalid', 'Unauthorized', '만료'];

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { logout } = useAuth();
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const appStateRef = useRef(AppState.currentState);
  const cancelledRef = useRef(false);
  const isReconnectingRef = useRef(false);
  const isRecoveringAuthRef = useRef(false);
  const hasRetriedAfterRefreshRef = useRef(false);
  const pendingAuthFailureRef = useRef(false);
  const isLoggingOutRef = useRef(false);
  const alertShownRef = useRef(false);

  const cleanupContextListeners = useCallback((targetSocket) => {
    if (!targetSocket) return;
    targetSocket.off('connect');
    targetSocket.off('disconnect');
    targetSocket.off('connect_error');
  }, []);

  const isAuthConnectError = useCallback((err) => {
    const code = err?.data?.code;
    if (code === SOCKET_AUTH_ERROR_CODE) return true;

    const msg = String(err?.message || '');
    return AUTH_ERROR_KEYWORDS.some((keyword) => msg.includes(keyword));
  }, []);

  const forceLogoutBySessionExpired = useCallback(async () => {
    if (isLoggingOutRef.current || cancelledRef.current) return;
    isLoggingOutRef.current = true;

    try {
      const latest = socketManager.getSocket?.();
      if (latest) {
        // disconnect 이벤트/재시도 콜백 재진입을 막기 위해 리스너를 먼저 정리한다.
        cleanupContextListeners(latest);
        latest.removeAllListeners?.();
        latest.disconnect();
      }

      await clearAuthToken();
      setConnected(false);
      setSocket(null);
      logout();

      if (appStateRef.current === 'active' && !alertShownRef.current) {
        alertShownRef.current = true;
        Alert.alert('세션 만료', '로그인이 만료되어 다시 로그인해주세요.', [
          {
            text: '확인',
            onPress: () => {
              alertShownRef.current = false;
            },
          },
        ]);
      }
    } finally {
      isRecoveringAuthRef.current = false;
    }
  }, [cleanupContextListeners, logout]);

  const tryRefreshAccessToken = useCallback(async () => {
    try {
      const response = await api.post('/api/auth/refresh');
      const nextToken = response?.data?.data?.token || response?.data?.token;
      if (!nextToken) return null;
      await setAuthToken(nextToken);
      return nextToken;
    } catch (error) {
      if (__DEV__) {
        console.warn('[SocketContext] RT 갱신 실패:', error?.response?.status ?? error?.message);
      }
      return null;
    }
  }, []);

  const recoverSocketAuth = useCallback(async () => {
    if (isRecoveringAuthRef.current || cancelledRef.current || isLoggingOutRef.current) return;
    isRecoveringAuthRef.current = true;

    try {
      const refreshedToken = await tryRefreshAccessToken();
      if (!refreshedToken) {
        await forceLogoutBySessionExpired();
        return;
      }

      if (hasRetriedAfterRefreshRef.current) {
        await forceLogoutBySessionExpired();
        return;
      }

      hasRetriedAfterRefreshRef.current = true;
      const latest = socketManager.getSocket?.();
      if (!latest) {
        await forceLogoutBySessionExpired();
        return;
      }

      latest.auth = { token: refreshedToken };
      latest.connect();
    } finally {
      if (!isLoggingOutRef.current) {
        isRecoveringAuthRef.current = false;
      }
    }
  }, [forceLogoutBySessionExpired, tryRefreshAccessToken]);

  const connect = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token || cancelledRef.current) return;

      const s = await socketManager.connectSocket?.(null, token);
      if (!s || cancelledRef.current) return;

      cleanupContextListeners(s);

      s.on('connect', () => {
        isReconnectingRef.current = false;
        pendingAuthFailureRef.current = false;
        hasRetriedAfterRefreshRef.current = false;
        if (!cancelledRef.current) {
          setConnected(true);
          setSocket(s);
        }
        if (__DEV__) {
          console.log('[SocketContext] 연결됨', {
            socketId: s.id,
            transport: s.io?.engine?.transport?.name,
          });
        }
      });

      s.on('disconnect', (reason) => {
        setConnected(false);
        if (__DEV__) console.log('[SocketContext] 연결 끊김', reason);
      });

      s.on('connect_error', (err) => {
        console.warn('[SocketContext] connect_error:', err?.message);
        if (!isAuthConnectError(err)) {
          return;
        }

        if (appStateRef.current !== 'active') {
          pendingAuthFailureRef.current = true;
          return;
        }

        recoverSocketAuth();
      });

      setSocket(s);
      if (!s.connected) s.connect();
    } catch (e) {
      console.error('[SocketContext] 연결 실패:', e);
    }
  }, [cleanupContextListeners]);

  useEffect(() => {
    cancelledRef.current = false;
    connect();

    const handleAppStateChange = (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev.match(/inactive|background/) && nextState === 'active') {
        if (pendingAuthFailureRef.current) {
          pendingAuthFailureRef.current = false;
          recoverSocketAuth();
          return;
        }

        const activeSocket = socketManager.getSocket?.();
        if (activeSocket && !activeSocket.connected) {
          if (isReconnectingRef.current) return;
          isReconnectingRef.current = true;
          if (__DEV__) {
            console.log('[SocketContext] AppState active → 소켓 재연결 시도');
          }
          activeSocket.connect();
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      cancelledRef.current = true;
      sub.remove();
      // 컨텍스트에서 등록한 리스너만 정리하고, 소켓 연결은 유지한다.
      cleanupContextListeners(socketManager.getSocket?.());
      setSocket(null);
      setConnected(false);
    };
  }, [connect, cleanupContextListeners, recoverSocketAuth]);

  const value = {
    socket,
    connected,
    reconnect: connect,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return ctx;
}

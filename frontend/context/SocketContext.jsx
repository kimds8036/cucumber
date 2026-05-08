import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { Alert, AppState } from 'react-native';
import { api, clearUserSessionStorage, getAuthToken, setAuthToken } from '../utils/api';
import { useAuth } from './AuthContext';
import * as socketManager from '../view/src/socketManager';

const SOCKET_AUTH_ERROR_CODE = 'AUTH_FAILED';
const AUTH_ERROR_KEYWORDS = ['토큰', '인증', 'invalid', 'Unauthorized', '만료'];
const SOCKET_HEALTHCHECK_MS = 15000;

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isLoggedIn, logout } = useAuth();
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
  const reconnectBackoffMsRef = useRef(1000);
  const reconnectTimerRef = useRef(null);

  const logSocket = useCallback((event, payload = {}) => {
    if (!__DEV__) return;
    console.log(`[SocketContext][${event}]`, {
      at: new Date().toISOString(),
      appState: appStateRef.current,
      ...payload,
    });
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

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
        socketManager.disconnectSocket?.({
          force: true,
          reason: 'session_expired_logout',
        });
      }

      await clearUserSessionStorage();
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

  const scheduleReconnect = useCallback((reason = 'unspecified') => {
    if (cancelledRef.current || isLoggingOutRef.current) return;
    clearReconnectTimer();
    const delay = reconnectBackoffMsRef.current;
    reconnectBackoffMsRef.current = Math.min(
      Math.floor(reconnectBackoffMsRef.current * 1.8),
      15000,
    );
    logSocket('reconnect_scheduled', { reason, delayMs: delay });
    reconnectTimerRef.current = setTimeout(() => {
      const latest = socketManager.getSocket?.();
      if (latest && !latest.connected) {
        logSocket('reconnect_attempt', { reason });
        latest.connect();
      }
    }, delay);
  }, [clearReconnectTimer, logSocket]);

  /**
   * socketManager 가 들고 있는 인스턴스에 SocketContext 전용 lifecycle 을 붙인다.
   * - setAuthTokenAndReconnect 가 removeAllListeners 로 기존 인스턴스를 비운 뒤
   *   새 인스턴스만 남기므로, 반드시 여기서 다시 connect/disconnect/error 를 등록하고
   *   React state(socket) 를 최신 참조로 맞춰 Notification/Friend 리스너 useEffect 가 재실행되게 한다.
   */
  const attachSocketLifecycle = useCallback(
    (s) => {
      if (!s || cancelledRef.current) return;

      cleanupContextListeners(s);

      s.on('connect', () => {
        isReconnectingRef.current = false;
        pendingAuthFailureRef.current = false;
        hasRetriedAfterRefreshRef.current = false;
        reconnectBackoffMsRef.current = 1000;
        clearReconnectTimer();
        if (!cancelledRef.current) {
          setConnected(true);
          setSocket(s);
        }
        logSocket('connected', {
          socketId: s.id,
          transport: s.io?.engine?.transport?.name,
        });
      });

      s.on('disconnect', (reason) => {
        setConnected(false);
        logSocket('disconnected', { reason });
        scheduleReconnect(`disconnect:${reason}`);
      });

      s.on('connect_error', (err) => {
        logSocket('connect_error', {
          message: err?.message,
          code: err?.data?.code,
          description: err?.description,
        });
        if (!isAuthConnectError(err)) {
          scheduleReconnect('connect_error_non_auth');
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
    },
    [
      cleanupContextListeners,
      clearReconnectTimer,
      isAuthConnectError,
      logSocket,
      recoverSocketAuth,
      scheduleReconnect,
    ],
  );

  const connect = useCallback(async () => {
    try {
      // 자동로그인 OFF(인메모리만 보관) 사용자도 소켓이 붙도록 인메모리 폴백까지 본다.
      const token = await getAuthToken();
      if (!token || cancelledRef.current) return;

      const s = await socketManager.connectSocket?.(null, token);
      if (!s || cancelledRef.current) return;

      attachSocketLifecycle(s);
    } catch (e) {
      console.error('[SocketContext][connect_failed]', {
        at: new Date().toISOString(),
        message: e?.message,
      });
    }
  }, [attachSocketLifecycle]);

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
          logSocket('appstate_reconnect', { prev, nextState });
          activeSocket.connect();
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    const healthcheck = setInterval(() => {
      if (appStateRef.current !== 'active') return;
      const latest = socketManager.getSocket?.();
      if (!latest || latest.connected) return;
      scheduleReconnect('healthcheck');
    }, SOCKET_HEALTHCHECK_MS);

    return () => {
      cancelledRef.current = true;
      sub.remove();
      clearInterval(healthcheck);
      clearReconnectTimer();
      // 컨텍스트에서 등록한 리스너만 정리하고, 소켓 연결은 유지한다.
      cleanupContextListeners(socketManager.getSocket?.());
      setSocket(null);
      setConnected(false);
    };
  }, [clearReconnectTimer, connect, cleanupContextListeners, logSocket, recoverSocketAuth, scheduleReconnect]);

  // 로그인 상태가 바뀌면 소켓을 새 토큰으로 갈아끼우거나, 로그아웃 시 안전하게 끊는다.
  // - 로그인: 새 JWT 로 setAuthTokenAndReconnect → 옛 토큰으로 INVALID_TOKEN 무한 재시도 방지
  // - 로그아웃: 소켓을 강제 종료해 다음 로그인 때 깔끔하게 새로 붙도록
  useEffect(() => {
    if (cancelledRef.current) return;

    if (isLoggedIn) {
      (async () => {
        const token = await getAuthToken();
        if (!token || cancelledRef.current) return;
        try {
          await socketManager.setAuthTokenAndReconnect?.(token);
          const s = socketManager.getSocket?.();
          if (s && !cancelledRef.current) {
            attachSocketLifecycle(s);
          }
        } catch (e) {
          if (__DEV__) {
            console.warn('[SocketContext] setAuthTokenAndReconnect 실패:', e?.message);
          }
        }
      })();
      return;
    }

    // 로그아웃 상태: 기존 소켓 정리
    try {
      socketManager.disconnectSocket?.({ force: true, reason: 'auth_logged_out' });
    } catch {
      // ignore
    }
    setConnected(false);
    setSocket(null);
  }, [isLoggedIn, attachSocketLifecycle]);

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

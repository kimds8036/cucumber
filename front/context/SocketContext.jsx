import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { AppState } from 'react-native';
import {
  api,
  clearAuthToken,
  clearUserSessionStorage,
  getAuthToken,
  getDeviceId,
  getRefreshToken,
  setAuthToken,
  setRefreshToken,
} from '../utils/api';
import { appAlert } from '../utils/appAlert';
import {
  getSessionTerminateTitle,
  notifySessionTerminated,
  isSocketAuthBlockedCode,
  SESSION_FORCE_LOGOUT_CODES,
  markSessionTerminateAlertShown,
} from '../utils/sessionTerminate';
import { useAuth } from './AuthContext';
import * as socketManager from '../view/src/socketManager';

const SOCKET_AUTH_ERROR_CODE = 'AUTH_FAILED';
const AUTH_ERROR_KEYWORDS = ['토큰', '인증', 'invalid', 'Unauthorized', '만료'];
const SOCKET_HEALTHCHECK_MS = 15000;

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isLoggedIn, logout, reverificationStatus } = useAuth();
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const appStateRef = useRef(AppState.currentState);
  const cancelledRef = useRef(false);
  const isReconnectingRef = useRef(false);
  const isRecoveringAuthRef = useRef(false);
  const hasRetriedAfterRefreshRef = useRef(false);
  const pendingAuthFailureRef = useRef(false);
  const isLoggingOutRef = useRef(false);
  const socketAuthBlockedRef = useRef(false);
  const isLoggedInRef = useRef(isLoggedIn);
  const reconnectBackoffMsRef = useRef(1000);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    isLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn]);

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
    targetSocket.off('session_revoked');
  }, []);

  const isAuthConnectError = useCallback((err) => {
    const code = err?.data?.code;
    if (code === SOCKET_AUTH_ERROR_CODE) return true;

    const msg = String(err?.message || '');
    return AUTH_ERROR_KEYWORDS.some((keyword) => msg.includes(keyword));
  }, []);

  const forceLogoutBySessionExpired = useCallback(async (payload = {}) => {
    if (isLoggingOutRef.current || cancelledRef.current) return;
    isLoggingOutRef.current = true;

    try {
      const latest = socketManager.getSocket?.();
      if (latest) {
        cleanupContextListeners(latest);
        latest.removeAllListeners?.();
        socketManager.disconnectSocket?.({
          force: true,
          reason: 'session_expired_logout',
        });
      }

      await clearUserSessionStorage();
      await clearAuthToken();
      setConnected(false);
      setSocket(null);
      logout();

      const title = getSessionTerminateTitle(payload?.code);
      const message =
        payload?.message || '로그인이 만료되어 다시 로그인해주세요.';

      if (appStateRef.current === 'active' && markSessionTerminateAlertShown()) {
        appAlert.alert(title, message);
      }
    } finally {
      isRecoveringAuthRef.current = false;
      isLoggingOutRef.current = false;
    }
  }, [cleanupContextListeners, logout]);

  const tryRefreshAccessToken = useCallback(async () => {
    try {
      const [refreshToken, deviceId] = await Promise.all([
        getRefreshToken(),
        getDeviceId(),
      ]);
      if (!refreshToken || !deviceId) return null;

      const response = await api.post('/api/auth/refresh', {
        refreshToken,
        deviceId,
      });
      const nextToken = response?.data?.data?.token || response?.data?.token;
      const nextRefresh =
        response?.data?.data?.refreshToken || response?.data?.refreshToken;
      if (!nextToken) return null;
      await setAuthToken(nextToken);
      if (nextRefresh) await setRefreshToken(nextRefresh);
      return nextToken;
    } catch (error) {
      if (__DEV__) {
        console.warn(
          '[SocketContext] RT 갱신 실패:',
          error?.response?.status ?? error?.message,
        );
      }
      return null;
    }
  }, []);

  const recoverSocketAuth = useCallback(async () => {
    if (
      isRecoveringAuthRef.current ||
      cancelledRef.current ||
      isLoggingOutRef.current
    )
      return;
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

  const scheduleReconnect = useCallback(
    (reason = 'unspecified') => {
      if (
        cancelledRef.current ||
        isLoggingOutRef.current ||
        socketAuthBlockedRef.current ||
        !isLoggedInRef.current
      ) {
        return;
      }
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
    },
    [clearReconnectTimer, logSocket],
  );

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

        const terminateCodes = [...SESSION_FORCE_LOGOUT_CODES];
        if (terminateCodes.includes(err?.data?.code)) {
          clearReconnectTimer();
          notifySessionTerminated({
            code: err.data.code,
            message: err?.message,
          });
          return;
        }

        if (isSocketAuthBlockedCode(err?.data?.code)) {
          socketAuthBlockedRef.current = true;
          clearReconnectTimer();
          setConnected(false);
          return;
        }

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

      s.on('session_revoked', (payload = {}) => {
        logSocket('session_revoked', {
          code: payload?.code,
          message: payload?.message,
        });
        notifySessionTerminated(payload);
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
      if (
        ['graduated_blocked', 'adult_blocked'].includes(reverificationStatus)
      ) {
        socketAuthBlockedRef.current = true;
        return;
      }

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
  }, [attachSocketLifecycle, reverificationStatus]);

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
      if (appStateRef.current !== 'active' || !isLoggedInRef.current) return;
      if (socketAuthBlockedRef.current) return;
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
  }, [
    clearReconnectTimer,
    connect,
    cleanupContextListeners,
    logSocket,
    recoverSocketAuth,
    scheduleReconnect,
  ]);

  // 로그인 상태가 바뀌면 소켓을 새 토큰으로 갈아끼우거나, 로그아웃 시 안전하게 끊는다.
  // - 로그인: 새 JWT 로 setAuthTokenAndReconnect → 옛 토큰으로 INVALID_TOKEN 무한 재시도 방지
  // - 로그아웃: 소켓을 강제 종료해 다음 로그인 때 깔끔하게 새로 붙도록
  useEffect(() => {
    if (cancelledRef.current) return;

    if (isLoggedIn) {
      socketAuthBlockedRef.current = false;
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
            console.warn(
              '[SocketContext] setAuthTokenAndReconnect 실패:',
              e?.message,
            );
          }
        }
      })();
      return;
    }

    // 로그아웃 상태: 기존 소켓 정리
    socketAuthBlockedRef.current = false;
    clearReconnectTimer();
    try {
      socketManager.disconnectSocket?.({
        force: true,
        reason: 'auth_logged_out',
      });
    } catch {
      // ignore
    }
    setConnected(false);
    setSocket(null);
  }, [isLoggedIn, attachSocketLifecycle, clearReconnectTimer]);

  const value = {
    socket,
    connected,
    reconnect: connect,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return ctx;
}

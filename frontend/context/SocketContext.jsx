import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as socketManager from '../view/src/socketManager';

const AUTH_TOKEN_KEY = '@auth_token';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const reconnectAuthTimerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const cancelledRef = useRef(false);

  const cleanupContextListeners = useCallback((targetSocket) => {
    if (!targetSocket) return;
    targetSocket.off('connect');
    targetSocket.off('disconnect');
    targetSocket.off('connect_error');
  }, []);

  const connect = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token || cancelledRef.current) return;

      const s = await socketManager.connectSocket?.(null, token);
      if (!s || cancelledRef.current) return;

      cleanupContextListeners(s);

      s.on('connect', () => {
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
        if (reason === 'io server disconnect' && !cancelledRef.current) {
          setTimeout(() => {
            if (!cancelledRef.current) {
              connect();
            }
          }, 1000);
        }
      });

      s.on('connect_error', (err) => {
        console.warn('[SocketContext] connect_error:', err?.message);
        const msg = err?.message || '';
        if (
          msg.includes('토큰') ||
          msg.includes('인증') ||
          msg.includes('invalid') ||
          msg.includes('Unauthorized')
        ) {
          if (reconnectAuthTimerRef.current) {
            clearTimeout(reconnectAuthTimerRef.current);
            reconnectAuthTimerRef.current = null;
          }
          reconnectAuthTimerRef.current = setTimeout(async () => {
            const latest = socketManager.getSocket?.();
            if (!cancelledRef.current && latest) {
              const latestToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
              if (!latestToken) return;
              latest.auth = { token: latestToken };
              latest.connect();
            }
            reconnectAuthTimerRef.current = null;
          }, 2000);
        }
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
        const activeSocket = socketManager.getSocket?.();
        if (!activeSocket || !activeSocket.connected) {
          if (__DEV__) {
            console.log('[SocketContext] AppState active → 소켓 재연결 시도');
          }
          connect();
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      cancelledRef.current = true;
      sub.remove();
      if (reconnectAuthTimerRef.current) {
        clearTimeout(reconnectAuthTimerRef.current);
        reconnectAuthTimerRef.current = null;
      }
      // 컨텍스트에서 등록한 리스너만 정리하고, 소켓 연결은 유지한다.
      cleanupContextListeners(socketManager.getSocket?.());
      setSocket(null);
      setConnected(false);
    };
  }, [connect, cleanupContextListeners]);

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

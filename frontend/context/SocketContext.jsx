import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { api } from '../utils/api';

const AUTH_TOKEN_KEY = '@auth_token';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const cancelledRef = useRef(false);

  const connect = useCallback(async () => {
    try {
      if (socketRef.current && socketRef.current.connected) {
        return;
      }

      // 끊긴 인스턴스가 남아 있으면 정리 후 새로 연결
      if (socketRef.current && !socketRef.current.connected) {
        try {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
        } catch (e) {
          /* ignore */
        }
        socketRef.current = null;
        setSocket(null);
      }

      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token || cancelledRef.current) return;

      const baseURL = api.defaults.baseURL;
      const transports =
        Platform.OS === 'ios' ? ['websocket', 'polling'] : ['websocket', 'polling'];

      const s = io(baseURL, {
        transports,
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      s.on('connect', () => {
        if (!cancelledRef.current) {
          setConnected(true);
          setSocket(s);
        }
        if (__DEV__) {
          console.log('[SocketContext] 연결됨', {
            transport: s.io?.engine?.transport?.name,
            os: Platform.OS,
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
          setTimeout(() => {
            if (!cancelledRef.current && socketRef.current) {
              try {
                socketRef.current.removeAllListeners();
                socketRef.current.disconnect();
              } catch (e) {
                /* ignore */
              }
              socketRef.current = null;
              setSocket(null);
              connect();
            }
          }, 5000);
        }
      });

      socketRef.current = s;
    } catch (e) {
      console.error('[SocketContext] 연결 실패:', e);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    connect();

    const handleAppStateChange = (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev.match(/inactive|background/) && nextState === 'active') {
        if (!socketRef.current || !socketRef.current.connected) {
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
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setConnected(false);
    };
  }, [connect]);

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

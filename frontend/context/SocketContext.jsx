import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    let cancelled = false;

    const connect = async () => {
      try {
        // 이미 소켓이 있고 연결되어 있으면 재연결하지 않는다.
        if (socketRef.current && socketRef.current.connected) {
          return;
        }

        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (!token || cancelled) return;

        const baseURL = api.defaults.baseURL;
        // iOS: WebSocket 단독 시 실패하는 경우가 있어 폴링 폴백 허용. Android/웹은 websocket 우선.
        const transports = Platform.OS === 'ios' ? ['websocket', 'polling'] : ['websocket', 'polling'];

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
          if (!cancelled) {
            setConnected(true);
            setSocket(s);
          }
          if (__DEV__) {
            console.log('[SocketContext] 연결됨', { transport: s.io?.engine?.transport?.name, os: Platform.OS });
          }
        });

        s.on('disconnect', (reason) => {
          setConnected(false);
          if (__DEV__) console.log('[SocketContext] 연결 끊김', reason);
        });

        s.on('connect_error', (err) => {
          console.warn('[SocketContext] connect_error:', err?.message);
          // TODO: 토큰 만료 등으로 인한 실패 시, 별도의 토큰 갱신 로직과 연동 가능
        });

        socketRef.current = s;
        setSocket(s);
      } catch (e) {
        console.error('[SocketContext] 연결 실패:', e);
      }
    };

    connect();

    // 앱이 포그라운드로 돌아올 때 소켓이 끊겨 있으면 재연결 시도
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
      cancelled = true;
      sub.remove();
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setConnected(false);
    };
  }, []);

  const value = {
    socket,
    connected,
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


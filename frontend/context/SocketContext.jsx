import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { api } from '../utils/api';

const AUTH_TOKEN_KEY = '@auth_token';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const connect = async () => {
      try {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (!token || cancelled) return;

        const baseURL = api.defaults.baseURL;
        // iOS: WebSocket 단독 시 실패하는 경우가 있어 폴링 폴백 허용. Android/웹은 websocket 우선.
        const transports = Platform.OS === 'ios' ? ['websocket', 'polling'] : ['websocket', 'polling'];

        const s = io(baseURL, {
          transports,
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 10,
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
        });

        socketRef.current = s;
        setSocket(s);
      } catch (e) {
        console.error('[SocketContext] 연결 실패:', e);
      }
    };

    connect();

    return () => {
      cancelled = true;
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


import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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

        const s = io(api.defaults.baseURL, {
          transports: ['websocket'],
          auth: { token },
        });

        s.on('connect', () => {
          if (!cancelled) {
            setConnected(true);
            setSocket(s);
          }
        });

        s.on('disconnect', () => {
          setConnected(false);
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


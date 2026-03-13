import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { AppState } from 'react-native';
import { api } from '../utils/api';

const AUTH_TOKEN_KEY = '@auth_token';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [hasUnread, setHasUnread] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const socketRef = useRef(null);

  const refreshHasUnread = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications', {
        params: { page: 1, limit: 20 },
      });
      const list = res.data?.data || [];
      // 좋아요 알림은 UI에서 제외하고 있으므로 여기서도 제외
      const filtered = list.filter((n) => n.type !== 'like');
      const anyUnread = filtered.some((n) => !n.isRead);
      setHasUnread(anyUnread);
      setInitialized(true);
    } catch (error) {
      console.error('[NotificationContext] hasUnread 조회 실패:', error);
      setHasUnread(false);
      setInitialized(true);
    }
  }, []);

  // 초기 1회 + 앱 포그라운드 복귀 시 서버에서 재확인
  useEffect(() => {
    refreshHasUnread();

    const handleAppStateChange = (nextState) => {
      if (nextState === 'active') {
        refreshHasUnread();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [refreshHasUnread]);

  // 전역 socket.io 연결: 알림 이벤트 수신 시 빨간 점 즉시 ON
  useEffect(() => {
    // 이미 소켓이 있으면 재연결하지 않음 (전역 1회 유지)
    if (socketRef.current) {
      return;
    }

    let cancelled = false;

    const connectSocket = async () => {
      try {
        console.log('[NotificationContext] try connect socket. baseURL =', api.defaults.baseURL);
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        console.log('[NotificationContext] loaded token from storage. hasToken =', !!token);
        if (!token || cancelled) return;

        const socket = io(api.defaults.baseURL, {
          transports: ['websocket'],
          auth: { token },
        });

        // 디버깅용: 서버에서 어떤 이벤트가 오는지 전부 로그로 확인
        socket.onAny((event, ...args) => {
          console.log('[NotificationContext] socket event:', event, args?.[0]);
        });

        socket.on('connect_error', (err) => {
          console.error('[NotificationContext] socket connect_error:', err?.message, err?.data);
        });

        socket.on('error', (err) => {
          console.error('[NotificationContext] socket error:', err);
        });

        socket.on('connect', () => {
          console.log('[NotificationContext] socket connected to', api.defaults.baseURL);
          // 연결 성공 시 한 번 서버 상태도 동기화
          refreshHasUnread();
        });

        socket.on('notification', (payload) => {
          // 새 알림 도착 → 즉시 빨간 점 ON
          console.log('[NotificationContext] notification event raw payload:', payload);
          console.log(
            '[NotificationContext] notification summary:',
            'type =', payload?.type,
            'title =', payload?.title,
            'senderId =', payload?.senderId,
            'targetUserId =', payload?.targetUserId,
            'postId =', payload?.postId,
          );
          setHasUnread(true);
        });

        socket.on('disconnect', () => {
          console.log('[NotificationContext] socket disconnected');
        });

        socketRef.current = socket;
      } catch (e) {
        console.error('[NotificationContext] socket 연결 실패:', e);
      }
    };

    connectSocket();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [refreshHasUnread]);

  const value = {
    hasUnread,
    initialized,
    refreshHasUnread,
    setHasUnread,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return ctx;
}


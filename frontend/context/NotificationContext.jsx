/**
 * NotificationContext
 * - 일반 알림(댓글, 우편, 채팅 등) 벨 빨간점(hasUnread)만 담당
 * - SocketContext의 소켓을 구독해 notification 수신 시 friend_request 는 제외하고 처리
 * - 리스너 등록 후 반드시 socket.off 로 클린업
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { api } from '../utils/api';
import { useSocket } from './SocketContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { socket } = useSocket();
  const [hasUnread, setHasUnread] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const refreshHasUnread = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications', {
        params: { page: 1, limit: 20 },
      });
      const list = res.data?.data || [];
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

  useEffect(() => {
    refreshHasUnread();

    const handleAppStateChange = (nextState) => {
      if (nextState === 'active') refreshHasUnread();
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [refreshHasUnread]);

  useEffect(() => {
    if (!socket) return;

    const handler = (payload) => {
      if (payload?.type === 'friend_request') return;
      setHasUnread(true);
    };

    socket.on('notification', handler);

    const onConnect = () => {
      refreshHasUnread();
    };
    socket.on('connect', onConnect);

    return () => {
      socket.off('notification', handler);
      socket.off('connect', onConnect);
    };
  }, [socket, refreshHasUnread]);

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

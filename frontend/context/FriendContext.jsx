/**
 * FriendContext
 * - 친구 요청 빨간점 두 가지:
 *   1) hasUnreadFriendRequestsForBell — 메인헤더 벨만. 알림 화면 들어가면 끔.
 *   2) hasUnreadFriendRequests — 프로필카드 친구 아이콘. 친구 화면에서 확인/수락·거절 후에만 끔.
 * - refreshFriendRequestBadge(updateBell) 에서 updateBell=true 일 때만 벨 상태 갱신 (앱 초기/포그라운드).
 *   FriendScreen 포커스에서는 updateBell=false 로 호출해 벨이 다시 안 뜨게 함.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { api } from '../utils/api';
import { useSocket } from './SocketContext';

const FriendContext = createContext(null);

export function FriendProvider({ children }) {
  const { socket } = useSocket();
  const [hasUnreadFriendRequests, setHasUnreadFriendRequests] = useState(false);
  const [hasUnreadFriendRequestsForBell, setHasUnreadFriendRequestsForBell] = useState(false);

  const refreshFriendRequestBadge = useCallback(async (opts = {}) => {
    const { updateBell = false } = opts;
    try {
      const res = await api.get('/api/friends/requests/received');
      const list = res.data?.data || [];
      const hasPending = list.length > 0;
      setHasUnreadFriendRequests(hasPending);
      if (updateBell) setHasUnreadFriendRequestsForBell(hasPending);
    } catch (error) {
      console.error('[FriendContext] 친구 요청 수 조회 실패:', error);
      setHasUnreadFriendRequests(false);
      if (updateBell) setHasUnreadFriendRequestsForBell(false);
    }
  }, []);

  useEffect(() => {
    refreshFriendRequestBadge({ updateBell: true });

    const handleAppStateChange = (nextState) => {
      if (nextState === 'active') refreshFriendRequestBadge({ updateBell: true });
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [refreshFriendRequestBadge]);

  useEffect(() => {
    if (!socket) return;

    const handler = (payload) => {
      if (payload?.type !== 'friend_request') return;
      setHasUnreadFriendRequests(true);
      setHasUnreadFriendRequestsForBell(true);
    };

    socket.on('notification', handler);

    const onConnect = () => {
      refreshFriendRequestBadge({ updateBell: true });
    };
    socket.on('connect', onConnect);

    return () => {
      socket.off('notification', handler);
      socket.off('connect', onConnect);
    };
  }, [socket, refreshFriendRequestBadge]);

  /** 알림 화면 진입 시 호출 → 헤더 벨 빨간점만 끔. 프로필카드 친구 아이콘은 그대로 */
  const markFriendRequestsSeenForBell = useCallback(() => {
    setHasUnreadFriendRequestsForBell(false);
  }, []);

  const value = {
    hasUnreadFriendRequests,
    hasUnreadFriendRequestsForBell,
    refreshFriendRequestBadge,
    markFriendRequestsSeenForBell,
  };

  return (
    <FriendContext.Provider value={value}>
      {children}
    </FriendContext.Provider>
  );
}

export function useFriend() {
  const ctx = useContext(FriendContext);
  if (!ctx) {
    throw new Error('useFriend must be used within a FriendProvider');
  }
  return ctx;
}

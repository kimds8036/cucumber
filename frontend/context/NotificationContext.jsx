/**
 * NotificationContext
 * - 일반 알림(댓글, 우편, 채팅 등) 벨 빨간점(hasUnread)만 담당
 * - SocketContext의 소켓을 구독해 notification 수신 시 friend_request 는 제외하고 처리
 * - 리스너 등록 후 반드시 socket.off 로 클린업
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, DeviceEventEmitter, Platform } from 'react-native';
import { api } from '../utils/api';
import { useSocket } from './SocketContext';
import { useToast } from './ToastContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { socket } = useSocket();
  const { showToast, activeChatRoomId, isMessageTab } = useToast();
  const [hasUnread, setHasUnread] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [bellSuppressed, setBellSuppressed] = useState(false);
  const [lastBellSeenAt, setLastBellSeenAt] = useState(null);

  const parseDateMs = (value) => {
    if (!value) return 0;
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : 0;
  };

  const markNotificationsSeenForBell = useCallback(() => {
    setBellSuppressed(true);
    setLastBellSeenAt(new Date().toISOString());
    setHasUnread(false);
  }, []);

  const refreshHasUnread = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications', {
        params: { page: 1, limit: 20 },
      });
      const list = res.data?.data || [];
      const filtered = list
        .filter((n) => n.type !== 'like')
        .filter(
          (n) =>
            n.relatedType !== 'message_room' && n.relatedType !== 'dm_room',
        );
      const anyUnread = filtered.some((n) => !n.isRead);
      const latestCreatedAtMs = filtered.reduce((max, n) => {
        const t = parseDateMs(n?.createdAt);
        return t > max ? t : max;
      }, 0);
      const lastSeenMs = parseDateMs(lastBellSeenAt);
      const hasNewSinceBellSeen =
        bellSuppressed && latestCreatedAtMs > 0 && latestCreatedAtMs > lastSeenMs;

      if (hasNewSinceBellSeen) {
        setBellSuppressed(false);
      }

      const shouldShowBell = anyUnread && (!bellSuppressed || hasNewSinceBellSeen);
      setHasUnread(shouldShowBell);
      setInitialized(true);
    } catch (error) {
      console.error('[NotificationContext] hasUnread 조회 실패:', error);
      // 조회 실패 시 기존 표시 상태를 유지해서, 임시 네트워크 오류로 점이 갑자기 바뀌지 않게 한다.
      setInitialized(true);
    }
  }, [bellSuppressed, lastBellSeenAt]);

  useEffect(() => {
    refreshHasUnread();

    const handleAppStateChange = (nextState) => {
      if (nextState === 'active') refreshHasUnread();
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [refreshHasUnread]);

  /** 네이티브 채팅에서 read-by-related 후 벨 배지와 JSX 동기화 */
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = DeviceEventEmitter.addListener('nativeRequestRefreshUnread', () => {
      refreshHasUnread();
    });
    return () => sub.remove();
  }, [refreshHasUnread]);

  useEffect(() => {
    if (!socket) return;

    const handler = (payload) => {
      const isChatNotification =
        payload?.relatedType === 'message_room' ||
        payload?.relatedType === 'dm_room';
      if (!isChatNotification) {
        setBellSuppressed(false);
        setHasUnread(true);
      }
      const titleText = String(payload?.title ?? '').trim();
      const bodyText = String(payload?.body ?? '').trim();
      const composedMessage = isChatNotification
        ? `${titleText || '새 메시지'}: ${bodyText || '(이미지)'}`
        : (titleText || bodyText);

      if (!composedMessage) return;
      showToast({
        message: composedMessage,
        senderName: isChatNotification
          ? titleText || '새 메시지'
          : null,
        body: isChatNotification ? bodyText || '(이미지)' : null,
        roomId: payload?.relatedId,
        relatedType: payload?.relatedType,
        relatedId: payload?.relatedId,
        type: payload?.type,
        category: payload?.category,
        isChat: isChatNotification,
      });
    };

    const pokeHandler = () => setHasUnread(true);
    const studyFinishedSummaryHandler = () => {
      refreshHasUnread();
    };
    const newMessageHandler = (payload) => {
      const roomId = payload?.message?.room_id;
      const senderName = payload?.message?.sender_name || '새 메시지';
      const content = payload?.message?.content || '(이미지)';
      const isActiveRoom =
        roomId != null &&
        activeChatRoomId != null &&
        String(roomId) === String(activeChatRoomId);

      console.log('[NotificationSocket] new_message received', {
        roomId,
        activeChatRoomId,
        isActiveRoom,
        isMessageTab,
        senderName,
        hasContent: Boolean(payload?.message?.content),
        receivedAt: new Date().toISOString(),
      });

      if (isMessageTab) {
        console.log('[NotificationSocket] toast skipped', {
          reason: 'isMessageTab=true',
          roomId,
        });
        return;
      }
      if (isActiveRoom) {
        console.log('[NotificationSocket] toast skipped', {
          reason: 'activeChatRoomId matched',
          roomId,
          activeChatRoomId,
        });
        return;
      }
      console.log('[NotificationSocket] toast shown', {
        roomId,
        senderName,
      });
      showToast({
        message: `${senderName}: ${content}`,
        senderName,
        body: content,
        roomId,
        relatedType: 'message_room',
        relatedId: roomId,
        type: 'mail',
        category: 'mail',
        isChat: true,
      });
    };

    socket.on('notification', handler);
    socket.on('friend_poke', pokeHandler);
    socket.on('friend_study_finished_summary', studyFinishedSummaryHandler);
    socket.on('new_message', newMessageHandler);

    const notificationReadHandler = () => {
      // 읽음 처리로 인해 헤더 빨간 점 상태가 바뀔 수 있으므로 즉시 재계산
      refreshHasUnread();
    };
    socket.on('notification_read', notificationReadHandler);

    const onConnect = () => {
      refreshHasUnread();
    };
    socket.on('connect', onConnect);

    return () => {
      socket.off('notification', handler);
      socket.off('friend_poke', pokeHandler);
      socket.off('friend_study_finished_summary', studyFinishedSummaryHandler);
      socket.off('new_message', newMessageHandler);
      socket.off('notification_read', notificationReadHandler);
      socket.off('connect', onConnect);
    };
  }, [socket, refreshHasUnread, showToast, activeChatRoomId, isMessageTab]);

  const value = {
    hasUnread,
    initialized,
    refreshHasUnread,
    setHasUnread,
    markNotificationsSeenForBell,
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

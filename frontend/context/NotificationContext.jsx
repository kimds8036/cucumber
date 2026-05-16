/**
 * NotificationContext
 * - 일반 알림(댓글, 우편, 채팅 등) 벨 빨간점(hasUnread)만 담당
 * - SocketContext의 소켓을 구독해 notification 수신 시 friend_request 는 제외하고 처리
 * - 리스너 등록 후 반드시 socket.off 로 클린업
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, DeviceEventEmitter, Platform } from 'react-native';
import { api } from '../utils/api';
import { useSocket } from './SocketContext';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import {
  isStudySummaryNotification,
  normalizeStudySummaryWatchers,
} from '../utils/studySummaryNotification';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { socket } = useSocket();
  const { isLoggedIn } = useAuth();
  const { showToast, activeChatRoomId, isMessageTab, isTimerScreenActive } = useToast();
  const appStateRef = useRef(AppState.currentState);
  const [hasUnread, setHasUnread] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [bellSuppressed, setBellSuppressed] = useState(false);
  const [lastBellSeenAt, setLastBellSeenAt] = useState(null);
  const studySummaryWatchersRef = useRef(new Map());

  const toSummaryKey = (value) => {
    if (value == null) return null;
    const normalized = String(value).trim();
    return normalized ? normalized : null;
  };

  const toWatchersArray = (watchers) => normalizeStudySummaryWatchers(watchers);

  const cacheStudySummaryWatchers = (payload) => {
    const watchers = toWatchersArray(payload?.watchers);
    if (!watchers.length) return;
    const payloadRelatedType = String(payload?.relatedType ?? '').trim();
    const payloadType = String(payload?.type ?? '').trim();
    const isSocketStudySummary =
      payloadType === 'friend_study_finished_summary' ||
      payloadRelatedType === 'study_summary_single' ||
      payloadRelatedType === 'study_summary_multi';
    const keys = [
      toSummaryKey(payload?.relatedId),
      // friend_study_finished_summary 소켓 payload는 relatedId가 없고 userId만 오므로 key에 포함한다.
      isSocketStudySummary ? toSummaryKey(payload?.userId) : null,
      toSummaryKey(payload?.finishedAt),
      toSummaryKey(payload?.createdAt),
      toSummaryKey(payload?.id),
      toSummaryKey(payload?.notificationId),
      toSummaryKey(payload?.title && payload?.body ? `${payload.title}::${payload.body}` : null),
    ].filter(Boolean);
    if (!keys.length) return;
    keys.forEach((key) => {
      studySummaryWatchersRef.current.set(key, watchers);
    });
  };

  const getStudySummaryWatchers = useCallback((notification) => {
    const direct = toWatchersArray(notification?.watchers);
    if (direct.length) return direct;
    const keys = [
      toSummaryKey(notification?.relatedId),
      toSummaryKey(notification?.createdAt),
      toSummaryKey(notification?.id),
      toSummaryKey(
        notification?.title && notification?.content
          ? `${notification.title}::${notification.content}`
          : null,
      ),
    ].filter(Boolean);
    for (const key of keys) {
      const cached = studySummaryWatchersRef.current.get(key);
      if (cached?.length) return cached;
    }
    return [];
  }, []);

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
    // 비로그인 상태에서는 호출 자체를 스킵 (토큰 없이 401 노이즈 방지)
    if (!isLoggedIn) {
      setHasUnread(false);
      setInitialized(true);
      return;
    }
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
  }, [bellSuppressed, lastBellSeenAt, isLoggedIn]);

  useEffect(() => {
    refreshHasUnread();

    const handleAppStateChange = (nextState) => {
      appStateRef.current = nextState;
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

    const fallbackToastMessage = (payload) => {
      const category = String(payload?.category ?? '').trim();
      const type = String(payload?.type ?? '').trim();
      if (type === 'poke' || payload?.relatedType === 'timer_poke') {
        return '친구가 쿡 찔렀어요';
      }
      if (category === 'post' || payload?.relatedType === 'post') {
        return '게시글에 새 소식이 도착했어요';
      }
      if (category === 'mail' || type === 'mail') {
        return '새로운 우편이 도착했어요';
      }
      if (category === 'system') {
        return '새로운 알림이 도착했어요';
      }
      return '새로운 소식이 도착했어요';
    };

    const handler = (payload) => {
      const isForeground = appStateRef.current === 'active';
      const isChatNotification =
        payload?.relatedType === 'message_room' ||
        payload?.relatedType === 'dm_room';
      const isStudySummary = isStudySummaryNotification(payload);
      if (!isChatNotification) {
        // 벨 점은 DB 알림 목록 기준으로만 갱신한다.
        // (실시간 신호만으로 점을 켜면 알림 목록과 불일치 가능)
        setBellSuppressed(false);
        refreshHasUnread();
      }
      if (isStudySummary) {
        // 타이머 화면이 활성화된 경우에는 타이머 전용 토스트를 우선 사용한다.
        if (isTimerScreenActive) {
          console.log('[NotificationContext] study summary toast skipped (timer screen active)', {
            relatedType: payload?.relatedType,
            type: payload?.type,
            relatedId: payload?.relatedId,
          });
          return;
        }
        // 타이머 화면이 아닐 땐 일반 알림 토스트로 fallback 한다.
        console.log('[NotificationContext] study summary toast fallback (timer screen inactive)', {
          relatedType: payload?.relatedType,
          type: payload?.type,
          relatedId: payload?.relatedId,
        });
      }
      const relatedType = String(payload?.relatedType ?? '').trim();
      const isAnonymousMessageRoom = relatedType === 'message_room';
      const ANONYMOUS_MAIL_LABEL = '익명 쪽지';

      let titleText = String(payload?.title ?? '').trim();
      if (isAnonymousMessageRoom) {
        titleText = ANONYMOUS_MAIL_LABEL;
      }

      const bodyText = String(payload?.body ?? '').trim();
      const composedMessage = isChatNotification
        ? `${titleText || (isAnonymousMessageRoom ? ANONYMOUS_MAIL_LABEL : '새 메시지')}: ${bodyText || '(이미지)'}`
        : (titleText || bodyText || fallbackToastMessage(payload));

      if (!composedMessage) return;
      if (!isForeground) return;

      const dmSenderName =
        payload?.senderName != null && String(payload.senderName).trim() !== ''
          ? String(payload.senderName).trim()
          : relatedType === 'dm_room'
            ? titleText || null
            : null;

      showToast({
        message: composedMessage,
        senderName: isChatNotification
          ? isAnonymousMessageRoom
            ? ANONYMOUS_MAIL_LABEL
            : dmSenderName || titleText || '새 메시지'
          : null,
        body: isChatNotification ? bodyText || '(이미지)' : null,
        roomId: isChatNotification ? payload?.relatedId : null,
        relatedType: payload?.relatedType,
        relatedId: payload?.relatedId,
        type: payload?.type,
        category: payload?.category,
        isChat: isChatNotification,
        watchers: payload?.watchers,
        senderUserId:
          payload?.senderUserId != null ? String(payload.senderUserId) : null,
        senderSchoolName:
          payload?.senderSchoolName != null
            ? String(payload.senderSchoolName)
            : null,
        senderColorId:
          payload?.senderColorId != null ? Number(payload.senderColorId) : null,
      });
    };

    const pokeHandler = (payload) => {
      const isForeground = appStateRef.current === 'active';
      const senderName = String(
        payload?.fromName ??
        payload?.fromNickname ??
        payload?.senderName ??
        '',
      ).trim();
      // friend_poke는 즉시 토스트는 띄우되, 벨 점은 DB 목록 기준으로만 갱신.
      // 온라인 즉시 전달 poke는 알림 목록에 없을 수 있다.
      setBellSuppressed(false);
      refreshHasUnread();
      if (!isForeground) return;
      showToast({
        message: senderName
          ? `${senderName} 님이 쿡 찔렀어요`
          : '친구가 쿡 찔렀어요',
        relatedType: 'timer_poke',
        relatedId:
          payload?.fromUserId != null ? String(payload.fromUserId) : null,
        type: 'poke',
        category: 'timer',
        isChat: false,
      });
    };
    const studyFinishedSummaryHandler = (payload) => {
      cacheStudySummaryWatchers(payload);
      refreshHasUnread();
    };
    const resolveNewMessageRoomType = (payload) => {
      const raw = String(
        payload?.roomType ??
          payload?.room_type ??
          payload?.message?.room_type ??
          '',
      )
        .trim()
        .toLowerCase();
      if (raw === 'dm' || raw === 'dm_room') return 'dm_room';
      if (raw === 'message' || raw === 'message_room') return 'message_room';
      return 'message_room';
    };

    const newMessageHandler = (payload) => {
      const isForeground = appStateRef.current === 'active';
      const roomId = payload?.message?.room_id;
      const relatedType = resolveNewMessageRoomType(payload);
      const isDm = relatedType === 'dm_room';
      const ANONYMOUS_MAIL_LABEL = '익명 쪽지';
      const senderNameRaw = String(payload?.message?.sender_name ?? '').trim();
      const senderName = isDm
        ? senderNameRaw || '새 메시지'
        : ANONYMOUS_MAIL_LABEL;
      const content = payload?.message?.content || '(이미지)';
      const isActiveRoom =
        roomId != null &&
        activeChatRoomId != null &&
        String(roomId) === String(activeChatRoomId);

      console.log('[NotificationSocket] new_message received', {
        roomId,
        relatedType,
        isDm,
        activeChatRoomId,
        isActiveRoom,
        isMessageTab,
        senderName: isDm ? senderName : ANONYMOUS_MAIL_LABEL,
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
      if (!isForeground) {
        console.log('[NotificationSocket] toast skipped', {
          reason: 'app_not_active',
          roomId,
          appState: appStateRef.current,
        });
        return;
      }
      console.log('[NotificationSocket] toast shown', {
        roomId,
        relatedType,
        senderName,
      });
      showToast({
        message: `${senderName}: ${content}`,
        senderName,
        body: content,
        roomId,
        relatedType,
        relatedId: roomId,
        type: 'mail',
        category: 'mail',
        isChat: true,
        ...(isDm
          ? {
              senderUserId:
                payload?.message?.sender_id != null
                  ? String(payload.message.sender_id)
                  : null,
              senderSchoolName:
                payload?.message?.sender_school_name != null
                  ? String(payload.message.sender_school_name)
                  : null,
              senderColorId:
                payload?.message?.sender_color_id != null
                  ? Number(payload.message.sender_color_id)
                  : null,
            }
          : {}),
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
  }, [socket, refreshHasUnread, showToast, activeChatRoomId, isMessageTab, isTimerScreenActive]);

  const value = {
    hasUnread,
    initialized,
    refreshHasUnread,
    setHasUnread,
    markNotificationsSeenForBell,
    getStudySummaryWatchers,
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

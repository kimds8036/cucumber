/**
 * FriendContext
 * - 친구 요청 빨간점 두 가지:
 *   1) hasUnreadFriendRequestsForBell — 메인헤더 벨만. 알림 화면 들어가면 끔.
 *   2) hasUnreadFriendRequests — 프로필카드 친구 아이콘. 친구 화면에서 확인/수락·거절 후에만 끔.
 * - refreshFriendRequestBadge(updateBell) 에서 updateBell=true 일 때만 벨 상태 갱신 (앱 초기/포그라운드).
 *   FriendScreen 포커스에서는 updateBell=false 로 호출해 벨이 다시 안 뜨게 함.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { AppState } from 'react-native';
import { api } from '../utils/api';
import { useSocket } from './SocketContext';

const FriendContext = createContext(null);

/** 재현용: 빨간점(친구 요청) 관련 로그 — Metro/디버거 콘솔에서 `[FriendBadge]` 검색 */
const FB = '[FriendBadge]';

export function FriendProvider({ children }) {
  const { socket } = useSocket();
  const [hasUnreadFriendRequests, setHasUnreadFriendRequests] = useState(false);
  const [hasUnreadFriendRequestsForBell, setHasUnreadFriendRequestsForBell] =
    useState(false);
  const [studyingFriends, setStudyingFriends] = useState({}); // { [userId]: boolean }

  // 프로필 친구 점 / 헤더 벨 점이 바뀔 때마다 한 줄로 확인
  useEffect(() => {
    console.log(FB, 'STATE_CHANGED', {
      profileFriendDot: hasUnreadFriendRequests,
      headerBellDot: hasUnreadFriendRequestsForBell,
      at: new Date().toISOString(),
    });
  }, [hasUnreadFriendRequests, hasUnreadFriendRequestsForBell]);

  const refreshFriendRequestBadge = useCallback(async (opts = {}) => {
    const { updateBell = false, reason = 'unspecified' } = opts;
    console.log(FB, 'refresh START', {
      reason,
      updateBell,
      at: new Date().toISOString(),
    });
    try {
      const res = await api.get('/api/friends/requests/received');
      const list = res.data?.data || [];
      const hasPending = list.length > 0;
      const preview = list.slice(0, 3).map((r) => ({
        requestId: r.requestId,
        fromUserId: r.userId,
        name: r.name,
      }));
      console.log(FB, 'refresh RESULT (REST /requests/received)', {
        reason,
        updateBell,
        receivedCount: list.length,
        hasPending,
        preview,
      });
      setHasUnreadFriendRequests(hasPending);
      if (updateBell) setHasUnreadFriendRequestsForBell(hasPending);
      console.log(FB, 'refresh APPLY', {
        reason,
        setProfileDot: hasPending,
        setBellDot: updateBell ? hasPending : '(bell unchanged)',
      });
    } catch (error) {
      console.error('[FriendContext] 친구 요청 수 조회 실패:', error);
      console.log(FB, 'refresh ERROR → dots OFF', { reason, updateBell });
      setHasUnreadFriendRequests(false);
      if (updateBell) setHasUnreadFriendRequestsForBell(false);
    }
  }, []);

  /** 타이머 화면 진입 시, 놓친 이벤트 보완용: 현재 공부 중인 친구 목록을 REST로 조회 */
  const refreshStudyingFriends = useCallback(async () => {
    try {
      const res = await api.get('/api/friends/studying-status');
      const list = res.data?.data || [];
      const next = {};
      list.forEach((item) => {
        if (item.userId != null) {
          next[item.userId] = item.isStudying === true;
        }
      });
      setStudyingFriends(next);
    } catch (error) {
      console.error('[FriendContext] 공부 중 친구 상태 조회 실패:', error);
    }
  }, []);

  useEffect(() => {
    refreshFriendRequestBadge({ updateBell: true, reason: 'mount' });

    const handleAppStateChange = (nextState) => {
      console.log(FB, 'AppState', { nextState, at: new Date().toISOString() });
      if (nextState === 'active') {
        refreshFriendRequestBadge({ updateBell: true, reason: 'appstate_active' });
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [refreshFriendRequestBadge]);

  useEffect(() => {
    if (!socket) return;

    const notificationHandler = (payload) => {
      if (payload?.type !== 'friend_request') return;
      console.log(FB, 'SOCKET notification (friend_request)', {
        type: payload?.type,
        category: payload?.category,
        relatedType: payload?.relatedType,
        relatedId: payload?.relatedId,
        title: payload?.title,
        at: new Date().toISOString(),
      });
      console.log(FB, 'SOCKET → set profileDot=true, bellDot=true (no REST here)');
      setHasUnreadFriendRequests(true);
      setHasUnreadFriendRequestsForBell(true);
    };

    const timerStatusHandler = ({ userId, status }) => {
      if (!userId) return;
      setStudyingFriends((prev) => ({
        ...prev,
        [userId]: status === 'studying',
      }));
    };

    socket.on('notification', notificationHandler);
    socket.on('friend_timer_status', timerStatusHandler);

    const onConnect = () => {
      console.log(FB, 'SOCKET connect');
      refreshFriendRequestBadge({ updateBell: true, reason: 'socket_connect' });
      refreshStudyingFriends();
    };
    socket.on('connect', onConnect);

    return () => {
      socket.off('notification', notificationHandler);
      socket.off('friend_timer_status', timerStatusHandler);
      socket.off('connect', onConnect);
    };
  }, [socket, refreshFriendRequestBadge, refreshStudyingFriends]);

  /** 알림 화면 진입 시 호출 → 헤더 벨 빨간점만 끔. 프로필카드 친구 아이콘은 그대로 */
  const markFriendRequestsSeenForBell = useCallback(() => {
    console.log(FB, 'markFriendRequestsSeenForBell → bellDot=false (프로필 점은 유지)');
    setHasUnreadFriendRequestsForBell(false);
  }, []);

  const value = {
    hasUnreadFriendRequests,
    hasUnreadFriendRequestsForBell,
    studyingFriends,
    refreshFriendRequestBadge,
    refreshStudyingFriends,
    markFriendRequestsSeenForBell,
  };

  return (
    <FriendContext.Provider value={value}>{children}</FriendContext.Provider>
  );
}

export function useFriend() {
  const ctx = useContext(FriendContext);
  if (!ctx) {
    throw new Error('useFriend must be used within a FriendProvider');
  }
  return ctx;
}

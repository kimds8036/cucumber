import { useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * 친구/타이머용 소켓 이벤트 훅
 * - onFriendTimerStatus(payload) : 친구 공부 상태 변경 수신
 * - onFriendPoke(payload)       : 친구 찌르기 수신
 */
export function useSocketEvents({ onFriendTimerStatus, onFriendPoke } = {}) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    if (onFriendTimerStatus) {
      socket.on('friend_timer_status', onFriendTimerStatus);
    }
    if (onFriendPoke) {
      socket.on('friend_poke', onFriendPoke);
    }

    return () => {
      if (!socket) return;
      if (onFriendTimerStatus) {
        socket.off('friend_timer_status', onFriendTimerStatus);
      }
      if (onFriendPoke) {
        socket.off('friend_poke', onFriendPoke);
      }
    };
  }, [socket, onFriendTimerStatus, onFriendPoke]);

  const emitFriendPoke = useCallback(
    (targetUserId) => {
      if (!socket) return;
      socket.emit('friend_poke', { targetUserId });
    },
    [socket],
  );

  const emitTimerStatus = useCallback(
    (status, payload = {}) => {
      if (!socket) return;
      if (status === 'studying') {
        socket.emit('friend_timer_status', {
          status,
          dayKey: payload.dayKey,
          subjectId: payload.subjectId,
          subjectName: payload.subjectName,
          startSeconds: payload.startSeconds,
        });
      } else {
        socket.emit('friend_timer_status', { status });
      }
    },
    [socket],
  );

  const emitFriendNotifyOnStop = useCallback(
    (targetUserId) => {
      if (!socket) return;
      socket.emit('friend_notify_on_stop', { targetUserId });
    },
    [socket],
  );

  return {
    emitFriendPoke,
    emitTimerStatus,
    emitFriendNotifyOnStop,
  };
}


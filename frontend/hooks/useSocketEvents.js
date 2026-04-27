import { useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * 친구/타이머용 소켓 이벤트 훅
 * - onFriendTimerStatus(payload) : 친구 공부 상태 변경 수신
 * - onFriendPoke(payload)       : 친구 찌르기 수신
 */
export function useSocketEvents({
  onFriendTimerStatus,
  onFriendPoke,
  onFriendPokeResult,
} = {}) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    if (onFriendTimerStatus) {
      socket.on('friend_timer_status', onFriendTimerStatus);
    }
    if (onFriendPoke) {
      socket.on('friend_poke', onFriendPoke);
    }
    if (onFriendPokeResult) {
      socket.on('friend_poke_result', onFriendPokeResult);
    }

    return () => {
      if (!socket) return;
      if (onFriendTimerStatus) {
        socket.off('friend_timer_status', onFriendTimerStatus);
      }
      if (onFriendPoke) {
        socket.off('friend_poke', onFriendPoke);
      }
      if (onFriendPokeResult) {
        socket.off('friend_poke_result', onFriendPokeResult);
      }
    };
  }, [socket, onFriendTimerStatus, onFriendPoke, onFriendPokeResult]);

  const emitFriendPoke = useCallback(
    (targetUserId) => {
      if (!socket) return;
      socket.emit('friend_poke', { targetUserId });
    },
    [socket],
  );

  const emitTimerStatus = useCallback((status, payload = {}) => {
    if (!socket || !socket.connected) {
      console.warn('[useSocketEvents] 소켓 미연결 상태에서 emitTimerStatus 시도');
      setTimeout(() => {
        if (socket?.connected) {
          emitTimerStatus(status, payload);
        }
      }, 2000);
      return;
    }
    if (status === 'studying') {
      socket.emit('friend_timer_status', {
        status,
        dayKey: payload.dayKey,
        subjectId: payload.subjectId,
        subjectName: payload.subjectName,
        startSeconds: payload.startSeconds,
      });
    } else if (status === 'heartbeat') {
      socket.emit('friend_timer_status', { status: 'heartbeat' });
    } else {
      socket.emit('friend_timer_status', { status });
    }
  }, [socket]);

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


import {
  sendFriendPoke,
  broadcastTimerStatus,
  addNotifyOnStop,
  upsertStudySessionStart,
  closeStudySession,
} from './socketService.js';

/**
 * 친구 관련 실시간 이벤트를 한 곳에서 등록하는 헬퍼
 * - friend_poke: 친구 찌르기
 * - friend_timer_status: 공부 시작/종료 상태 브로드캐스트
 *
 * @param {import('socket.io').Socket} socket
 */
export function registerFriendEvents(socket) {
  const userId = socket.userId;

  // 친구 찌르기
  socket.on('friend_poke', async ({ targetUserId }) => {
    try {
      if (!targetUserId || Number.isNaN(Number(targetUserId))) {
        return;
      }
      const target = Number(targetUserId);
      if (target === userId) return;

      const { throttled } = await sendFriendPoke({
        fromUserId: userId,
        targetUserId: target,
      });

      socket.emit('friend_poke_result', {
        ok: !throttled,
        throttled,
      });
    } catch (err) {
      console.error('[Socket] friend_poke 처리 오류:', err);
      socket.emit('friend_poke_result', {
        ok: false,
        throttled: false,
        error: 'internal_error',
      });
    }
  });

  // 공부 시작/종료 상태: DB 저장 + 친구들에게 소켓 브로드캐스트
  socket.on('friend_timer_status', async ({ status, dayKey, subjectId, subjectName, startSeconds }) => {
    try {
      console.log('[FriendSocket] friend_timer_status 수신', {
        socketUserId: userId,
        status,
        dayKey,
        subjectId,
        subjectName,
      });
      if (!status) return;

      if (status === 'studying') {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const serverDayKey = `${y}-${m}-${d}`;
        const day = dayKey || serverDayKey;
        const secs = startSeconds != null ? Number(startSeconds) : (today.getHours() * 3600 + today.getMinutes() * 60 + today.getSeconds());
        await upsertStudySessionStart({
          userId,
          dayKey: day,
          subjectId: subjectId != null ? subjectId : null,
          subjectName: subjectName != null ? subjectName : null,
          startSeconds: secs,
        });
      } else if (status === 'heartbeat') {
        return;
      } else if (status === 'idle') {
        await closeStudySession({ userId });
      }

      await broadcastTimerStatus({ userId, status });
    } catch (err) {
      console.error('[Socket] friend_timer_status 처리 오류:', err);
    }
  });

  // 공부 끝나면 알려줘 등록
  socket.on('friend_notify_on_stop', async ({ targetUserId }) => {
    try {
      console.log('[FriendSocket] friend_notify_on_stop 수신', {
        socketUserId: userId,
        targetUserId,
      });
      if (!targetUserId || Number.isNaN(Number(targetUserId))) return;
      const target = Number(targetUserId);
      if (target === userId) return;
      addNotifyOnStop({ watcherUserId: userId, targetUserId: target });
    } catch (err) {
      console.error('[Socket] friend_notify_on_stop 처리 오류:', err);
    }
  });
}


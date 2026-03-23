import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

// 공부 종료 알림(친구/나) 모두 받고 싶은 화면에서 사용할 수 있는 훅
export function useFriendStudyEvents({
  onFriendStudyFinished,
  onMyStudyFinishedSummary,
  onPoke,
} = {}) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const pokeHandler = (payload) => {
      onPoke?.(payload);
    };

    const summaryHandler = (payload) => {
      const watchers = payload?.watchers || [];
      if (watchers.length === 0) {
        onMyStudyFinishedSummary?.(payload);
        return;
      }
      const firstName = watchers[0]?.name;
      const body = firstName
        ? watchers.length > 1
          ? `${firstName}님 외 ${watchers.length - 1}명이 기다렸어요`
          : `${firstName}님이 기다렸어요`
        : '공부를 마쳤어요';

      onMyStudyFinishedSummary?.({ ...payload, toastText: `공부 완료 🎉 ${body}` });
      // api.post는 하지 않음 — 백엔드 socketService에서 enqueueNotification으로 이미 저장됨
    };

    const finishedHandler = (payload) => {
      onFriendStudyFinished?.(payload);
    };

    socket.on('friend_poke', pokeHandler);
    socket.on('friend_study_finished', finishedHandler);
    socket.on('friend_study_finished_summary', summaryHandler);

    return () => {
      socket.off('friend_poke', pokeHandler);
      socket.off('friend_study_finished', finishedHandler);
      socket.off('friend_study_finished_summary', summaryHandler);
    };
  }, [socket, onFriendStudyFinished, onMyStudyFinishedSummary, onPoke]);
}

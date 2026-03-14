import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

// 공부 종료 알림(친구/나) 모두 받고 싶은 화면에서 사용할 수 있는 훅
export function useFriendStudyEvents({
  onFriendStudyFinished,
  onMyStudyFinishedSummary,
} = {}) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const finishedHandler = (payload) => {
      console.log('[FriendSocket] friend_study_finished 이벤트 수신', payload);
      onFriendStudyFinished?.(payload);
    };

    const summaryHandler = (payload) => {
      console.log('[FriendSocket] friend_study_finished_summary 이벤트 수신', payload);
      onMyStudyFinishedSummary?.(payload);
    };

    socket.on('friend_study_finished', finishedHandler);
    socket.on('friend_study_finished_summary', summaryHandler);

    return () => {
      if (!socket) return;
      socket.off('friend_study_finished', finishedHandler);
      socket.off('friend_study_finished_summary', summaryHandler);
    };
  }, [socket, onFriendStudyFinished, onMyStudyFinishedSummary]);
}


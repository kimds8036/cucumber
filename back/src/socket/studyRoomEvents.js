import { STUDY_ROOM_SOCKET_ROOM } from './socketService.js';

/**
 * 스터디룸 구독 — 화면 진입 시에만 join 해 전체 studying 이벤트를 받는다.
 * @param {import('socket.io').Socket} socket
 */
export function registerStudyRoomEvents(socket) {
  socket.on('study_room:join', () => {
    socket.join(STUDY_ROOM_SOCKET_ROOM);
  });

  socket.on('study_room:leave', () => {
    socket.leave(STUDY_ROOM_SOCKET_ROOM);
  });
}

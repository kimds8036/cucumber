import {
  STUDY_ROOM_LOBBY,
  getStudyRoomSnapshotForUser,
  studyRoomSocketName,
} from '../services/studyRoom.service.js';

/**
 * 스터디룸 구독 — 본인 방(study_room:{roomId}) 만 join
 * @param {import('socket.io').Socket} socket
 */
export function registerStudyRoomEvents(socket) {
  const userId = socket.userId;

  const leaveAllStudyRooms = () => {
    socket.leave(STUDY_ROOM_LOBBY);
    for (const room of socket.rooms) {
      if (typeof room === 'string' && room.startsWith('study_room:')) {
        socket.leave(room);
      }
    }
  };

  socket.on('study_room:join', async () => {
    try {
      leaveAllStudyRooms();
      socket.join(STUDY_ROOM_LOBBY);

      const snap = await getStudyRoomSnapshotForUser(userId);
      if (snap.roomId) {
        socket.join(studyRoomSocketName(snap.roomId));
      }
      socket.emit('study_room:joined', {
        roomId: snap.roomId,
        members: snap.members,
        capacity: snap.capacity,
        relocated: snap.relocated,
      });
    } catch (err) {
      console.error('[StudyRoom] join 오류:', err);
      socket.emit('study_room:joined', {
        roomId: null,
        members: [],
        error: 'join_failed',
      });
    }
  });

  socket.on('study_room:leave', () => {
    leaveAllStudyRooms();
  });
}

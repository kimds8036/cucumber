import {
  assignUserToStudyRoom,
  getStudyRoomSnapshotForUser,
  getUserStudyRoomId,
  studyRoomSocketName,
} from '../services/studyRoom.service.js';
import pool from '../config/database.js';
import { getTimerDayKey } from '../utils/timerDayKey.js';

/**
 * 스터디룸 구독 — 본인 방(study_room:{roomId}) 만 join
 * @param {import('socket.io').Socket} socket
 */
export function registerStudyRoomEvents(socket) {
  const userId = socket.userId;

  const leaveAllStudyRooms = () => {
    for (const room of socket.rooms) {
      if (typeof room === 'string' && room.startsWith('study_room:')) {
        socket.leave(room);
      }
    }
  };

  socket.on('study_room:join', async () => {
    try {
      leaveAllStudyRooms();

      const todayTimerDayKey = getTimerDayKey();
      const [openRows] = await pool.execute(
        `SELECT id FROM study_sessions
         WHERE user_id = ? AND ended_at IS NULL AND day_key = ?
         LIMIT 1`,
        [userId, todayTimerDayKey],
      );

      let roomId = null;
      if (openRows.length > 0) {
        const assigned = await assignUserToStudyRoom(userId);
        roomId = assigned.roomId;
      } else {
        roomId = await getUserStudyRoomId(userId);
      }

      if (!roomId) {
        socket.emit('study_room:joined', {
          roomId: null,
          members: [],
        });
        return;
      }

      socket.join(studyRoomSocketName(roomId));
      const snap = await getStudyRoomSnapshotForUser(userId);
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

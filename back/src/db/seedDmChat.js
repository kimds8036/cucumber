import mysql from 'mysql2/promise';
import { getDbConnectionOptions, getActiveTarget } from '../config/dbEnv.js';

const START_TIME = new Date('2026-03-30T00:00:00');

async function main() {
  const connection = await mysql.createConnection(getDbConnectionOptions(getActiveTarget()));

  try {
    console.log('🚀 DM 채팅 시드 생성 시작');

    // 1️⃣ DM 방 확인 (user1=1, user2=2)
    const [rooms] = await connection.execute(
      `SELECT id FROM dm_rooms 
       WHERE (user1_id = 1 AND user2_id = 2)
          OR (user1_id = 2 AND user2_id = 1)`
    );

    let roomId;

    if (rooms.length > 0) {
      roomId = rooms[0].id;
      console.log('✅ 기존 DM 방 사용:', roomId);
    } else {
      const [result] = await connection.execute(
        `INSERT INTO dm_rooms 
         (user1_id, user2_id, created_at)
         VALUES (?, ?, ?)`,
        [1, 2, START_TIME]
      );
      roomId = result.insertId;
      console.log('✅ DM 방 생성:', roomId);
    }

    // 2️⃣ 메시지 생성
    let currentTime = new Date(START_TIME);

    for (let i = 1; i <= 300; i++) {
      const senderId = i % 2 === 1 ? 1 : 2;

      await connection.execute(
        `INSERT INTO dm_messages 
        (room_id, sender_id, content, is_read, created_at)
        VALUES (?, ?, ?, ?, ?)`,
        [
          roomId,
          senderId,
          String(i),
          true,
          currentTime,
        ]
      );

      // 30초 증가
      currentTime = new Date(currentTime.getTime() + 30 * 1000);
    }

    // 3️⃣ last_message 업데이트
    await connection.execute(
      `UPDATE dm_rooms 
       SET last_message = ?, last_message_at = ?
       WHERE id = ?`,
      ['300', currentTime, roomId]
    );

    console.log('✅ DM 메시지 300개 생성 완료');
    console.log('🎉 전체 완료');
  } catch (err) {
    console.error('❌ 오류:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
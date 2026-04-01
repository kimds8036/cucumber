import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const START_TIME = new Date('2026-03-30T00:00:00');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || 'cucumber',
    password: process.env.DB_PASSWORD || 'cucumber0425',
    database: process.env.DB_NAME || 'cucumber',
  });

  try {
    console.log('🚀 채팅 시드 생성 시작');

    // 1️⃣ 기존 message_room (익명게시판 기반) 가져오기
    const [existingRooms] = await connection.execute(
      `SELECT id FROM message_rooms 
       WHERE post_id = 1 AND user1_id = 1 AND user2_id = 2`
    );

    let roomId;

    if (existingRooms.length > 0) {
      roomId = existingRooms[0].id;
      console.log('✅ 기존 message_room 사용:', roomId);
    } else {
      const [result] = await connection.execute(
        `INSERT INTO message_rooms 
         (post_id, user1_id, user2_id, created_at)
         VALUES (?, ?, ?, ?)`,
        [1, 1, 2, START_TIME]
      );
      roomId = result.insertId;
      console.log('✅ message_room 생성:', roomId);
    }

    // 2️⃣ 메시지 생성 (1 ~ 300)
    let currentTime = new Date(START_TIME);

    for (let i = 1; i <= 300; i++) {
      const senderId = i % 2 === 1 ? 1 : 2;

      await connection.execute(
        `INSERT INTO messages 
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
      `UPDATE message_rooms 
       SET last_message = ?, last_message_at = ?
       WHERE id = ?`,
      ['300', currentTime, roomId]
    );

    console.log('✅ 메시지 300개 생성 완료 (기존 방)');

    console.log('🎉 전체 시드 완료');
  } catch (err) {
    console.error('❌ 오류:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
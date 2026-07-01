import mysql from 'mysql2/promise';
import { faker } from '@faker-js/faker/locale/ko';
import bcrypt from 'bcrypt';
import { getDbConnectionOptions, getActiveTarget } from '../config/dbEnv.js';
import {
  packUserPii,
  userPiiInsertValues,
  USER_PII_INSERT_COLUMNS,
} from '../services/userPii.service.js';

async function seed() {
  const connection = await mysql.createConnection(getDbConnectionOptions(getActiveTarget()));

  try {
    await connection.beginTransaction();

    // ──────────────────────────────────────────
    // 1. schools (이미 시드된 실제 schools에서 일부 사용)
    // ──────────────────────────────────────────
    const [schoolRows] = await connection.execute(
      `SELECT school_id FROM schools ORDER BY school_id LIMIT 20`
    );
    const schoolIds = schoolRows.map((r) => r.school_id).filter(Boolean);
    if (schoolIds.length === 0) {
      throw new Error(
        'schools 테이블이 비어있습니다. 먼저 npm run seed:schools 를 실행하세요.'
      );
    }
    console.log(`✅ schools 준비 완료 (사용 가능: ${schoolIds.length}개)`);

    // ──────────────────────────────────────────
    // 2. users (admin 계정 포함)
    // ──────────────────────────────────────────
    const adminPassword = await bcrypt.hash('admin', 10);
    const adminPii = packUserPii({
      name: '관리자',
      phone: '010-0000-0000',
      birthDate: '2000-01-01',
    });
    const [adminResult] = await connection.execute(
      `INSERT INTO users
        (username, password, ${USER_PII_INSERT_COLUMNS}, school_id, grade, class_number, graduation_year, is_graduated, color_id, phone_verified, student_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'admin',
        adminPassword,
        ...userPiiInsertValues(adminPii),
        schoolIds[0],
        1,
        1,
        2027,
        false,
        1,
        true,
        true,
      ]
    );
    const userIds = [adminResult.insertId];

    for (let i = 0; i < 9; i++) {
      const password = await bcrypt.hash('password123', 10);
      const pii = packUserPii({
        name: faker.person.fullName(),
        phone: `010-${faker.number.int({ min: 1000, max: 9999 })}-${faker.number.int({ min: 1000, max: 9999 })}`,
        birthDate: faker.date.birthdate({ min: 15, max: 19, mode: 'age' }).toISOString().split('T')[0],
      });
      const [result] = await connection.execute(
        `INSERT INTO users
          (username, password, ${USER_PII_INSERT_COLUMNS}, school_id, grade, class_number, graduation_year, is_graduated, color_id, phone_verified, student_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          faker.internet.username().slice(0, 20),
          password,
          ...userPiiInsertValues(pii),
          faker.helpers.arrayElement(schoolIds),
          faker.number.int({ min: 1, max: 3 }),
          faker.number.int({ min: 1, max: 10 }),
          faker.helpers.arrayElement([2025, 2026, 2027]),
          false,
          faker.number.int({ min: 1, max: 4 }),
          true,
          faker.datatype.boolean(),
        ]
      );
      userIds.push(result.insertId);
    }
    console.log('✅ users 완료 (admin 포함)');

    // ──────────────────────────────────────────
    // 3. posts
    // ──────────────────────────────────────────
    const postIds = [];
    const boardTypes = ['national', 'school'];

    for (let i = 0; i < 10; i++) {
      const boardType = faker.helpers.arrayElement(boardTypes);
      const [result] = await connection.execute(
        `INSERT INTO posts (user_id, board_type, school_id, content, like_count, comment_count)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          faker.helpers.arrayElement(userIds),
          boardType,
          boardType === 'school' ? faker.helpers.arrayElement(schoolIds) : null,
          faker.lorem.paragraph(),
          faker.number.int({ min: 0, max: 100 }),
          faker.number.int({ min: 0, max: 30 }),
        ]
      );
      postIds.push(result.insertId);
    }
    console.log('✅ posts 완료');

    // ──────────────────────────────────────────
    // 4. comments
    // ──────────────────────────────────────────
    const commentIds = [];

    for (let i = 0; i < 10; i++) {
      const [result] = await connection.execute(
        `INSERT INTO comments (post_id, user_id, parent_comment_id, content, anonymous_index, like_count)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          faker.helpers.arrayElement(postIds),
          faker.helpers.arrayElement(userIds),
          null,
          faker.lorem.sentence(),
          faker.number.int({ min: 1, max: 10 }),
          faker.number.int({ min: 0, max: 50 }),
        ]
      );
      commentIds.push(result.insertId);
    }
    console.log('✅ comments 완료');

    // ──────────────────────────────────────────
    // 5. message_rooms + messages
    // ──────────────────────────────────────────
    const roomIds = [];

    for (let i = 0; i < 5; i++) {
      const [u1, u2] = faker.helpers.arrayElements(userIds, 2);
      const postId = faker.helpers.arrayElement(postIds);
      try {
        const [result] = await connection.execute(
          `INSERT INTO message_rooms (post_id, user1_id, user2_id, last_message, last_message_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [postId, u1, u2, faker.lorem.sentence()]
        );
        roomIds.push(result.insertId);
      } catch (e) {
        // unique 제약 충돌 무시
      }
    }

    for (const roomId of roomIds) {
      for (let i = 0; i < 3; i++) {
        await connection.execute(
          `INSERT INTO messages (room_id, sender_id, content, is_read)
           VALUES (?, ?, ?, ?)`,
          [roomId, faker.helpers.arrayElement(userIds), faker.lorem.sentence(), faker.datatype.boolean()]
        );
      }
    }
    console.log('✅ message_rooms + messages 완료');

    // ──────────────────────────────────────────
    // 6. personal_mails
    // ──────────────────────────────────────────
    for (let i = 0; i < 8; i++) {
      const [sender, recipient] = faker.helpers.arrayElements(userIds, 2);
      await connection.execute(
        `INSERT INTO personal_mails (sender_id, recipient_id, content, status, sent_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [
          sender,
          recipient,
          faker.lorem.paragraph(),
          faker.datatype.boolean() ? 'read' : 'sent',
        ]
      );
    }
    console.log('✅ personal_mails 완료');

    // ──────────────────────────────────────────
    // 7. post_likes
    // ──────────────────────────────────────────
    const likedPairs = new Set();
    for (let i = 0; i < 10; i++) {
      const userId = faker.helpers.arrayElement(userIds);
      const postId = faker.helpers.arrayElement(postIds);
      const key = `${userId}-${postId}`;
      if (!likedPairs.has(key)) {
        likedPairs.add(key);
        await connection.execute(
          `INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)`,
          [userId, postId]
        );
      }
    }
    console.log('✅ post_likes 완료');

    // ──────────────────────────────────────────
    // 8. user_settings (모든 유저)
    // ──────────────────────────────────────────
    for (const userId of userIds) {
      await connection.execute(
        `INSERT IGNORE INTO user_settings (user_id) VALUES (?)`,
        [userId]
      );
    }
    console.log('✅ user_settings 완료');

    // ──────────────────────────────────────────
    // 9. notifications
    // ──────────────────────────────────────────
    const notifTypes = ['like', 'comment', 'mail', 'system'];
    const notifCategories = ['post', 'mail', 'system'];

    for (let i = 0; i < 10; i++) {
      await connection.execute(
        `INSERT INTO notifications (user_id, type, category, title, body, is_read)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          faker.helpers.arrayElement(userIds),
          faker.helpers.arrayElement(notifTypes),
          faker.helpers.arrayElement(notifCategories),
          faker.lorem.sentence(4),
          faker.lorem.sentence(),
          faker.datatype.boolean(),
        ]
      );
    }
    console.log('✅ notifications 완료');

    await connection.commit();
    console.log('\n🎉 모든 더미데이터 삽입 완료!');
    console.log('👤 admin 계정: 아이디 admin / 비밀번호 admin');
  } catch (err) {
    await connection.rollback();
    console.error('❌ 오류 발생, 롤백:', err);
  } finally {
    await connection.end();
  }
}

seed();
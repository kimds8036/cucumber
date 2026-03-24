/**
 * 실제 학교 ID 기준 관리자/테스트 계정 생성 (비밀번호는 스크립트에서 bcrypt 해시)
 *
 * - admin  : B000012508, 3학년 11반, 비밀번호 admin
 * - admin1 : B000011984, 3학년 4반,  비밀번호 admin1
 * - 나머지 8명: 위 두 학교 + 기타 학교, 랜덤 이름/전화번호
 *
 * 사용법: cd back && npm run seed:admin-users
 * (먼저 npm run seed:schools 로 학교 데이터 넣어둔 상태에서 실행)
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const USERS = [
  { username: '1',  password: '1',  name: '김동석',   school_id: 'B000012508', grade: 3, class_number: 11 },
  { username: '2', password: '2', name: '김은채', school_id: 'B000011984', grade: 3, class_number: 4 },
  { username: 'user1',  password: 'pass1', name: '테스트1', school_id: 'B000012508', grade: 3, class_number: 10 },
  { username: 'user2',  password: 'pass2', name: '테스트2', school_id: 'B000012508', grade: 2, class_number: 5 },
  { username: 'user3',  password: 'pass3', name: '테스트3', school_id: 'B000011984', grade: 3, class_number: 3 },
  { username: 'user4',  password: 'pass4', name: '테스트4', school_id: 'B000011984', grade: 1, class_number: 7 },
  { username: 'user5',  password: 'pass5', name: '테스트5', school_id: 'B000012508', grade: 3, class_number: 11 },
  { username: 'user6',  password: 'pass6', name: '테스트6', school_id: 'B000011984', grade: 2, class_number: 4 },
  { username: 'user7',  password: 'pass7', name: '테스트7', school_id: 'B000012508', grade: 1, class_number: 1 },
  { username: 'user8',  password: 'pass8', name: '테스트8', school_id: 'B000011984', grade: 3, class_number: 6 },
];

const GRADUATION_YEAR = 2026;
const PHONE_PREFIX = '010-';

function makePhone(i) {
  const a = String(1000 + (i % 9000)).slice(-4);
  const b = String(1000 + (i * 7 % 9000)).slice(-4);
  return `${PHONE_PREFIX}${a}-${b}`;
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || 'cucumber',
    password: process.env.DB_PASSWORD || 'cucumber0425',
    database: process.env.DB_NAME || 'cucumber',
  });

  try {
    for (let i = 0; i < USERS.length; i++) {
      const u = USERS[i];
      const hashed = await bcrypt.hash(u.password, 10);
      const phone = makePhone(i);
      const birthDate = '2005-03-15';

      await connection.execute(
        `INSERT INTO users (
          username, name, password, phone, birth_date, school_id, grade, class_number,
          graduation_year, is_graduated, color_id, phone_verified, student_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          password = VALUES(password),
          phone = VALUES(phone),
          birth_date = VALUES(birth_date),
          school_id = VALUES(school_id),
          grade = VALUES(grade),
          class_number = VALUES(class_number),
          graduation_year = VALUES(graduation_year)`,
        [
          u.username,
          u.name,
          hashed,
          phone,
          birthDate,
          u.school_id,
          u.grade,
          u.class_number,
          GRADUATION_YEAR,
          false,
          (i % 4) + 1,
          true,
          true,
        ]
      );
    }
    console.log('✅ 관리자/테스트 계정 생성 완료:', USERS.length, '명');
    console.log('   1  / 1   (B000012508, 3-11)');
    console.log('   2 / 2  (B000011984, 3-4)');
    console.log('   user1~8 / pass1~8');
  } catch (err) {
    console.error('❌ 오류:', err.message);
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      console.error('   → 학교 데이터가 없을 수 있습니다. 먼저 npm run seed:schools 를 실행하세요.');
    }
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();

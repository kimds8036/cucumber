/**
 * 관리자/테스트 계정 일괄 생성 스크립트
 *
 * 생성 대상:
 *  - 관리자 2명 (관리자 1, 관리자 2)
 *  - 테스터 30명 (user1~user30 / pass1~pass30 / 이름 "테스터 1"~"테스터 30")
 *
 * 학년(1~3), 반(1~3), 학교는 SCHOOL_IDS 풀에서 무작위 배정.
 *
 * 사용법:
 *   cd back && npm run seed:admin-users
 *   (먼저 npm run seed:schools 로 학교 데이터를 넣은 상태에서 실행)
 *
 * 멱등 보장: ON DUPLICATE KEY UPDATE 로 username 중복 시 갱신.
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

// ────────────────────────────── 데이터 정의 ──────────────────────────────

const ADMIN_ACCOUNTS = [
  { username: 'goyang2', password: 'qhanf6589!!', name: '관리자 1' },
  { username: 'gangaz2', password: 'kimds300272!', name: '관리자 2' },
];

const TESTER_COUNT = 30;

const SCHOOL_IDS = [
  'B000012093',
  'B000011671',
  'B000010039',
  'B000011700',
  'B000008914',
  'B000009396',
  'A_7150283',
  'B000011171',
  'B000010193',
  'B000012551',
  'B000010624',
  'B000011652',
  'B000010728',
  'B000011101',
  'A_7150676',
  'B000025726',
  'B000010961',
  'B000008788',
  'B000012366',
  'A_8862030',
  'B000012425',
  'B000011886',
  'B000008233',
  'B000010376',
  'B000010765',
  'B000009268',
  'A_7240199',
  'B000012431',
  'B000011513',
  'B000010815',
  'B000010564',
  'B000009074',
];

const GRADUATION_YEAR = 2026;
const PHONE_PREFIX = '010-';

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomGrade() {
  return 1 + Math.floor(Math.random() * 3); // 1~3
}

function randomClassNumber() {
  return 1 + Math.floor(Math.random() * 1); // 1~3
}

function makePhone(i) {
  // 시드 인덱스(i) 기반으로 항상 동일한 번호 생성 → phone UNIQUE 충돌 방지(멱등)
  const a = String(1000 + (i % 9000)).slice(-4);
  const b = String(1000 + ((i * 7) % 9000)).slice(-4);
  return `${PHONE_PREFIX}${a}-${b}`;
}

function buildUsers() {
  const admins = ADMIN_ACCOUNTS.map((a) => ({
    ...a,
    school_id: randomFrom(SCHOOL_IDS),
    grade: randomGrade(),
    class_number: randomClassNumber(),
  }));

  const testers = Array.from({ length: TESTER_COUNT }, (_, idx) => {
    const n = idx + 1;
    return {
      username: `user${n}`,
      password: `pass${n}`,
      name: `테스터 ${n}`,
      school_id: randomFrom(SCHOOL_IDS),
      grade: randomGrade(),
      class_number: randomClassNumber(),
    };
  });

  return [...admins, ...testers];
}

// ────────────────────────────── 실행 ──────────────────────────────

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || 'cucumber',
    password: process.env.DB_PASSWORD || 'cucumber0425',
    database: process.env.DB_NAME || 'cucumber',
  });

  const USERS = buildUsers();

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

    const adminCount = ADMIN_ACCOUNTS.length;
    console.log(`✅ 계정 생성 완료: 총 ${USERS.length}명 (관리자 ${adminCount}, 테스터 ${TESTER_COUNT})`);
    console.log('   ── 관리자 ──');
    ADMIN_ACCOUNTS.forEach((a, i) => {
      const u = USERS[i];
      console.log(`   ${a.name}  : ${a.username} / ${a.password}  (${u.school_id}, ${u.grade}-${u.class_number})`);
    });
    console.log('   ── 테스터 ──');
    console.log('   user1 ~ user30 / pass1 ~ pass30');
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

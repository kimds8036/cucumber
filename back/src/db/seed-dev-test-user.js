/**
 * develop(또는 --target=) DB에 앱 로그인용 중1 테스트 계정 1명 upsert.
 *
 * 사용법:
 *   cd back && npm run seed:dev-test-user
 *   cd back && npm run seed:dev-test-user -- --target=develop
 *
 * 주의: users 테이블 전용. admin_users 와 무관.
 */

import bcrypt from 'bcrypt';
import { createDbConnection, parseMigrateCliArgs } from '../config/dbEnv.js';

/** develop 전용 — 레포에 평문 저장 (테스트 계정) */
export const DEV_TEST_MIDDLE1 = Object.freeze({
  username: 'yp_dev_mid1_8k3x',
  password: 'Mx7#Kq9!vL2pNw5@',
  name: '테스트중1',
  phone: '010-5829-0147',
  birthDate: '2014-03-15',
  grade: 1,
  classNumber: 3,
  graduationYear: 2029,
});

async function pickSchoolId(connection) {
  const [rows] = await connection.execute(
    `SELECT school_id FROM schools ORDER BY school_id LIMIT 1`,
  );
  if (!rows.length) {
    throw new Error('schools 테이블이 비어 있습니다. seed:schools 먼저 실행하세요.');
  }
  return rows[0].school_id;
}

async function upsertDevTestUser(connection, schoolId) {
  const hashed = await bcrypt.hash(DEV_TEST_MIDDLE1.password, 10);

  const [existing] = await connection.execute(
    `SELECT id FROM users WHERE username = ? LIMIT 1`,
    [DEV_TEST_MIDDLE1.username],
  );

  if (existing.length > 0) {
    const userId = existing[0].id;
    await connection.execute(
      `UPDATE users SET
         password = ?,
         name = ?,
         phone = ?,
         birth_date = ?,
         school_id = ?,
         grade = ?,
         class_number = ?,
         graduation_year = ?,
         is_graduated = FALSE,
         is_deleted = FALSE,
         is_banned = FALSE,
         is_suspended = FALSE,
         suspended_until = NULL,
         color_id = 1,
         phone_verified = TRUE,
         student_verified = TRUE,
         reverification_status = 'none',
         reverification_deadline = NULL
       WHERE id = ?`,
      [
        hashed,
        DEV_TEST_MIDDLE1.name,
        DEV_TEST_MIDDLE1.phone,
        DEV_TEST_MIDDLE1.birthDate,
        schoolId,
        DEV_TEST_MIDDLE1.grade,
        DEV_TEST_MIDDLE1.classNumber,
        DEV_TEST_MIDDLE1.graduationYear,
        userId,
      ],
    );
    return { userId, created: false };
  }

  const [result] = await connection.execute(
    `INSERT INTO users
       (username, password, name, phone, birth_date, school_id, grade, class_number,
        graduation_year, is_graduated, color_id, phone_verified, student_verified,
        reverification_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, 1, TRUE, TRUE, 'none')`,
    [
      DEV_TEST_MIDDLE1.username,
      hashed,
      DEV_TEST_MIDDLE1.name,
      DEV_TEST_MIDDLE1.phone,
      DEV_TEST_MIDDLE1.birthDate,
      schoolId,
      DEV_TEST_MIDDLE1.grade,
      DEV_TEST_MIDDLE1.classNumber,
      DEV_TEST_MIDDLE1.graduationYear,
    ],
  );
  return { userId: result.insertId, created: true };
}

async function main() {
  const { targets } = parseMigrateCliArgs();
  const target = targets[0];

  const connection = await createDbConnection(target);
  try {
    await connection.beginTransaction();
    const schoolId = await pickSchoolId(connection);
    const { userId, created } = await upsertDevTestUser(connection, schoolId);
    await connection.commit();

    console.log(`✅ [${target}] 앱 테스트 계정 ${created ? '생성' : '갱신'} 완료 (user_id=${userId})`);
    console.log(`   학교: ${schoolId} | 학년: 중${DEV_TEST_MIDDLE1.grade} ${DEV_TEST_MIDDLE1.classNumber}반`);
    console.log(`   아이디: ${DEV_TEST_MIDDLE1.username}`);
    console.log(`   비밀번호: ${DEV_TEST_MIDDLE1.password}`);
    console.log('   student_verified=TRUE (앱 바로 이용 가능)');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('❌ seed-dev-test-user 실패:', error?.message || error);
  process.exit(1);
});

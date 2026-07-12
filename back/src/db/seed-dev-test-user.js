/**
 * develop(또는 --target=) DB에 앱 로그인용 테스트 계정 upsert.
 *
 * 사용법:
 *   cd back && npm run seed:dev-test-user
 *   cd back && npm run seed:dev-test-user -- --target=develop
 *
 * seed:reset-admins 실행 후에도 동일 계정이 다시 생성됩니다.
 */

import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { createDbConnection, parseMigrateCliArgs } from '../config/dbEnv.js';
import {
  packUserPii,
  userPiiInsertValues,
  USER_PII_INSERT_COLUMNS,
} from '../services/userPii.service.js';

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

export const DEV_TEST_MIDDLE2 = Object.freeze({
  username: 'yp_dev_mid2_7n2q',
  password: 'Kp8#Rq2!wM3pTx6@',
  name: '테스트중2',
  phone: '010-5829-0148',
  birthDate: '2013-05-20',
  grade: 2,
  classNumber: 5,
  graduationYear: 2028,
});

export const DEV_TEST_ACCOUNTS = Object.freeze([
  DEV_TEST_MIDDLE1,
  DEV_TEST_MIDDLE2,
]);

export async function pickFirstSchoolId(connection) {
  const [rows] = await connection.execute(
    `SELECT school_id FROM schools ORDER BY school_id LIMIT 1`,
  );
  if (!rows.length) {
    throw new Error('schools 테이블이 비어 있습니다. seed:schools 먼저 실행하세요.');
  }
  return rows[0].school_id;
}

async function upsertOneDevTestUser(connection, schoolId, account) {
  const hashed = await bcrypt.hash(account.password, 10);
  const pii = packUserPii({
    name: account.name,
    phone: account.phone,
    birthDate: account.birthDate,
  });

  const [existing] = await connection.execute(
    `SELECT id FROM users WHERE username = ? LIMIT 1`,
    [account.username],
  );

  if (existing.length > 0) {
    const userId = existing[0].id;
    await connection.execute(
      `UPDATE users SET
         password = ?,
         name_enc = ?,
         name_lookup = ?,
         phone_enc = ?,
         phone_lookup = ?,
         birth_date_enc = ?,
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
        ...userPiiInsertValues(pii).slice(0, 5),
        schoolId,
        account.grade,
        account.classNumber,
        account.graduationYear,
        userId,
      ],
    );
    return { userId, username: account.username, created: false };
  }

  const [result] = await connection.execute(
    `INSERT INTO users
       (username, password, ${USER_PII_INSERT_COLUMNS}, school_id, grade, class_number,
        graduation_year, is_graduated, color_id, phone_verified, student_verified,
        reverification_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, 1, TRUE, TRUE, 'none')`,
    [
      account.username,
      hashed,
      ...userPiiInsertValues(pii),
      schoolId,
      account.grade,
      account.classNumber,
      account.graduationYear,
    ],
  );
  return {
    userId: result.insertId,
    username: account.username,
    created: true,
  };
}

/** @returns {Promise<Array<{ userId: number, username: string, created: boolean }>>} */
export async function upsertDevTestUsers(connection, schoolId) {
  const results = [];
  for (const account of DEV_TEST_ACCOUNTS) {
    results.push(await upsertOneDevTestUser(connection, schoolId, account));
  }
  return results;
}

function logAccountResult(target, account, { userId, created }) {
  console.log(
    `   ${created ? '생성' : '갱신'}: ${account.username} (user_id=${userId}) | 중${account.grade} ${account.classNumber}반`,
  );
  console.log(`            비밀번호: ${account.password}`);
}

async function main() {
  const { targets } = parseMigrateCliArgs();
  const target = targets[0];

  const connection = await createDbConnection(target);
  try {
    await connection.beginTransaction();
    const schoolId = await pickFirstSchoolId(connection);
    const results = await upsertDevTestUsers(connection, schoolId);
    await connection.commit();

    console.log(`✅ [${target}] 앱 테스트 계정 ${results.length}명 처리 완료`);
    console.log(`   학교: ${schoolId}`);
    DEV_TEST_ACCOUNTS.forEach((account, i) => {
      logAccountResult(target, account, results[i]);
    });
    console.log('   student_verified=TRUE (앱 바로 이용 가능)');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  main().catch((error) => {
    console.error('❌ seed-dev-test-user 실패:', error?.message || error);
    process.exit(1);
  });
}

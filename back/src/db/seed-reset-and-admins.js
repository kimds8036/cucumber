/**
 * schools + admin_users 테이블만 유지하고 나머지 데이터를 비운 뒤
 * colors + 앱 테스트 계정(users) 2명만 시드.
 *
 * 사용법:
 *   cd back && CONFIRM_DB_RESET=1 npm run seed:reset-admins
 *   cd back && CONFIRM_DB_RESET=1 npm run seed:reset-admins -- --target=develop
 *
 * 유지: schools, admin_users, admin_totp_secrets, legal_documents
 * 삭제: users·게시글·쪽지·가입 제출 등 위 세 테이블 외 모든 데이터
 * 재생성: colors, 앱 테스트 계정 2명
 *
 * 주의: CONFIRM_DB_RESET=1 없으면 실행되지 않습니다.
 */

import mysql from 'mysql2/promise';
import {
  getDbConnectionOptions,
  parseMigrateCliArgs,
} from '../config/dbEnv.js';
import { getAdminLoginPath } from '../config/adminPath.js';
import {
  DEV_TEST_ACCOUNTS,
  pickFirstSchoolId,
  upsertDevTestUsers,
} from './seed-dev-test-user.js';

const PRESERVED_TABLES = new Set([
  'schools',
  'admin_users',
  'admin_totp_secrets',
  'legal_documents',
]);

const COLOR_ROWS = [
  [1, '#FFF3F3', 1],
  [2, '#FFFCD7', 2],
  [3, '#F7FFF3', 3],
  [4, '#E4EFFF', 4],
];

function getDbConfig(target) {
  return {
    ...getDbConnectionOptions(target),
    multipleStatements: true,
  };
}

async function listTables(connection, dbName) {
  const [rows] = await connection.execute(
    `SELECT TABLE_NAME AS tableName
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME`,
    [dbName],
  );
  return rows.map((row) => row.tableName);
}

async function wipeExceptPreserved(connection, dbName) {
  const tables = await listTables(connection, dbName);
  const targets = tables.filter((name) => !PRESERVED_TABLES.has(name));

  if (targets.length === 0) {
    console.log('⚠️  비울 테이블이 없습니다.');
    return;
  }

  const preserved = [...PRESERVED_TABLES].sort().join(', ');
  console.log(`🗑  유지(${preserved}) 제외 ${targets.length}개 테이블 TRUNCATE`);
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of targets) {
    await connection.query(`TRUNCATE TABLE \`${table}\``);
    console.log(`   - ${table}`);
  }
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function seedColors(connection) {
  for (const row of COLOR_ROWS) {
    await connection.execute(
      `INSERT INTO colors (id, hex_code, color_number) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE hex_code = VALUES(hex_code), color_number = VALUES(color_number)`,
      row,
    );
  }
}

async function main() {
  if (process.env.CONFIRM_DB_RESET !== '1') {
    console.error('❌ 안전장치: CONFIRM_DB_RESET=1 환경변수 없이는 실행할 수 없습니다.');
    console.error('   예: CONFIRM_DB_RESET=1 npm run seed:reset-admins');
    process.exit(1);
  }

  const { targets } = parseMigrateCliArgs();
  const target = targets[0];
  const dbName = getDbConnectionOptions(target).database;
  const connection = await mysql.createConnection(getDbConfig(target));

  try {
    const [schoolCountRows] = await connection.execute(
      'SELECT COUNT(*) AS cnt FROM schools',
    );
    const schoolCount = Number(schoolCountRows[0]?.cnt ?? 0);
    if (schoolCount === 0) {
      console.warn('⚠️  schools 테이블이 비어 있습니다. npm run seed:schools 를 먼저 실행하세요.');
    }

    const [adminsBefore] = await connection.execute(
      `SELECT id, username, name FROM admin_users WHERE is_deleted = FALSE ORDER BY id`,
    );
    if (adminsBefore.length === 0) {
      console.warn(
        '⚠️  admin_users 가 비어 있습니다. 관리자 계정을 먼저 만들거나 ADMIN_SEED_* 로 시드하세요.',
      );
    }

    console.log('==============================');
    console.log(`📂 대상 DB: ${dbName} (${target})`);
    console.log('⚠️  schools + admin_users + admin_totp_secrets + legal_documents 만 유지하고 나머지를 삭제합니다.');
    console.log('==============================');

    await wipeExceptPreserved(connection, dbName);
    await seedColors(connection);

    const schoolId = await pickFirstSchoolId(connection);
    const testUsers = await upsertDevTestUsers(connection, schoolId);

    const [admins] = await connection.execute(
      `SELECT id, username, name FROM admin_users WHERE is_deleted = FALSE ORDER BY id`,
    );

    console.log('\n✅ 초기화 및 테스트 계정 시드 완료');
    console.log(`   schools 유지: ${schoolCount}건`);
    console.log(`   admin_users 유지: ${admins.length}명`);
    console.log(`   앱 테스트 계정 생성: ${testUsers.length}명 (student_verified=TRUE)`);
    console.log(`   ── 관리자 유지 (${getAdminLoginPath()}) ──`);
    for (const admin of admins) {
      console.log(`   #${admin.id} ${admin.name}: ${admin.username}`);
    }
    console.log('   ── 앱 테스트 계정 (신규) ──');
    DEV_TEST_ACCOUNTS.forEach((account, i) => {
      const row = testUsers[i];
      console.log(
        `   #${row.userId} ${account.name}: ${account.username} / ${account.password}`,
      );
    });
    console.log(`   (학교 school_id=${schoolId})`);
    console.log('\n   참고: admin_totp_secrets(OTP)도 유지됩니다. OTP 재등록은 필요 없습니다.');
  } catch (err) {
    console.error('❌ 오류:', err.message);
    if (err.code === 'ER_NO_SUCH_TABLE' && String(err.message).includes('admin_users')) {
      console.error('   → npm run migrate 로 045_admin_users_table.sql 을 먼저 적용하세요.');
    }
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('❌ seed-reset-and-admins 실패:', err?.message || err);
  process.exit(1);
});

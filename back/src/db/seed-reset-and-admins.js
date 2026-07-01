/**
 * schools 테이블만 유지하고 나머지 데이터를 비운 뒤 admin_users 에 관리자만 시드.
 *
 * 사용법:
 *   cd back && CONFIRM_DB_RESET=1 npm run seed:reset-admins
 *
 * 주의: users·게시글·쪽지 등 모든 사용자 데이터가 삭제됩니다. schools 는 유지됩니다.
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { getDbConnectionOptions, getActiveTarget, parseMigrateCliArgs } from '../config/dbEnv.js';
import { loadAdminSeedAccounts } from '../config/adminSeedEnv.js';
import { getAdminLoginPath } from '../config/adminPath.js';

const PRESERVED_TABLES = new Set(['schools']);

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

async function wipeExceptSchools(connection, dbName) {
  const tables = await listTables(connection, dbName);
  const targets = tables.filter((name) => !PRESERVED_TABLES.has(name));

  if (targets.length === 0) {
    console.log('⚠️  비울 테이블이 없습니다.');
    return;
  }

  console.log(`🗑  schools 제외 ${targets.length}개 테이블 TRUNCATE`);
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

async function seedAdmins(connection, ADMIN_ACCOUNTS) {
  for (const admin of ADMIN_ACCOUNTS) {
    const hashed = await bcrypt.hash(admin.password, 10);
    await connection.execute(
      `INSERT INTO admin_users (username, password, name, is_deleted)
       VALUES (?, ?, ?, FALSE)
       ON DUPLICATE KEY UPDATE
         password = VALUES(password),
         name = VALUES(name),
         is_deleted = FALSE`,
      [admin.username, hashed, admin.name],
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
  const ADMIN_ACCOUNTS = loadAdminSeedAccounts();
  const connection = await mysql.createConnection(getDbConfig(target));

  try {
    const [schoolCountRows] = await connection.execute(
      'SELECT COUNT(*) AS cnt FROM schools',
    );
    const schoolCount = Number(schoolCountRows[0]?.cnt ?? 0);
    if (schoolCount === 0) {
      console.warn('⚠️  schools 테이블이 비어 있습니다. npm run seed:schools 를 먼저 실행하세요.');
    }

    console.log('==============================');
    console.log(`📂 대상 DB: ${dbName} (${target})`);
    console.log('⚠️  schools 만 유지하고 모든 데이터를 삭제합니다.');
    console.log('==============================');

    await wipeExceptSchools(connection, dbName);
    await seedColors(connection);
    await seedAdmins(connection, ADMIN_ACCOUNTS);

    const [admins] = await connection.execute(
      `SELECT id, username, name FROM admin_users ORDER BY id`,
    );

    console.log('\n✅ 초기화 및 관리자 시드 완료');
    console.log(`   schools 유지: ${schoolCount}건`);
    console.log(`   admin_users: ${admins.length}명`);
    console.log(`   ── 관리자 (웹 ${getAdminLoginPath()}) ──`);
    for (const admin of admins) {
      console.log(`   #${admin.id} ${admin.name}: ${admin.username}`);
    }
    console.log('\n   OTP는 최초 로그인 시 다시 등록해야 합니다.');
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

main();

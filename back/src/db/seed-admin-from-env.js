/**
 * Railway / .env 의 ADMIN_SEED_* 로 admin_users 업서트.
 *
 * 사용법:
 *   npm run seed:admins -- --target=production
 *
 * 필요 변수 (1·2번 예시):
 *   ADMIN_SEED_1_USERNAME / ADMIN_SEED_1_PASSWORD / ADMIN_SEED_1_NAME
 *   ADMIN_SEED_2_USERNAME / ADMIN_SEED_2_PASSWORD / ADMIN_SEED_2_NAME
 */

import mysql from 'mysql2/promise';
import {
  getDbConnectionOptions,
  parseMigrateCliArgs,
} from '../config/dbEnv.js';
import { loadAdminSeedAccounts } from '../config/adminSeedEnv.js';
import { hashPassword } from '../utils/auth.js';
import { getAdminLoginPath } from '../config/adminPath.js';

function getDbConfig(target) {
  return {
    ...getDbConnectionOptions(target),
    multipleStatements: true,
  };
}

export async function upsertAdminSeedAccounts(connection, accounts) {
  const results = [];
  for (const account of accounts) {
    const hashed = await hashPassword(account.password);
    const [existing] = await connection.execute(
      `SELECT id FROM admin_users WHERE username = ? LIMIT 1`,
      [account.username],
    );
    if (existing.length > 0) {
      await connection.execute(
        `UPDATE admin_users
         SET password = ?, name = ?, role = COALESCE(role, 'super'), is_deleted = FALSE
         WHERE id = ?`,
        [hashed, account.name, existing[0].id],
      );
      results.push({ id: existing[0].id, username: account.username, name: account.name, action: 'updated' });
    } else {
      const [ins] = await connection.execute(
        `INSERT INTO admin_users (username, password, name, role, is_deleted)
         VALUES (?, ?, ?, 'super', FALSE)`,
        [account.username, hashed, account.name],
      );
      results.push({
        id: ins.insertId,
        username: account.username,
        name: account.name,
        action: 'created',
      });
    }
  }
  return results;
}

async function main() {
  const accounts = loadAdminSeedAccounts();
  const { targets } = parseMigrateCliArgs();
  const target = targets[0];
  const dbName = getDbConnectionOptions(target).database;
  const connection = await mysql.createConnection(getDbConfig(target));

  try {
    console.log('==============================');
    console.log(`📂 대상 DB: ${dbName} (${target})`);
    console.log(`👤 ADMIN_SEED 계정 ${accounts.length}명 업서트`);
    console.log('==============================');

    const results = await upsertAdminSeedAccounts(connection, accounts);
    console.log(`\n✅ 관리자 시드 완료 — 로그인: ${getAdminLoginPath()}`);
    for (const row of results) {
      console.log(`   #${row.id} ${row.name}: ${row.username} (${row.action})`);
    }
  } catch (err) {
    console.error('❌ 오류:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('seed-admin-from-env.js') ||
    process.argv[1].includes('seed-admin-from-env'));

if (isDirectRun) {
  main().catch((err) => {
    console.error('❌ seed:admins 실패:', err?.message || err);
    process.exit(1);
  });
}

/**
 * schools 테이블만 남기고 나머지 테이블 전부 DROP → migrate(001_init 등) 재실행.
 *
 * 사용법 (Railway production Shell 권장):
 *   CONFIRM_KEEP_SCHOOLS_RESET=1 npm run db:reset-keep-schools -- --target=production
 *
 * 유지: schools (행 데이터 포함)
 * 삭제: schema_migrations 포함 그 외 모든 테이블
 * 이후: migrate로 001_init + 002 + 003 적용
 *
 * 주의:
 * - admin_users / OTP / legal / users 등도 삭제됩니다.
 * - 관리자는 ADMIN_SEED_* 로 다시 넣거나 수동 생성 필요합니다.
 * - CONFIRM_KEEP_SCHOOLS_RESET=1 없으면 실행되지 않습니다.
 */

import mysql from 'mysql2/promise';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getDbConnectionOptions,
  parseMigrateCliArgs,
} from '../config/dbEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRESERVE = new Set(['schools']);

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

function runMigrate(target) {
  const migrateJs = path.join(__dirname, 'migrate.js');
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [migrateJs, `--target=${target}`],
      { stdio: 'inherit', env: process.env },
    );
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`migrate 종료 코드 ${code}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  if (process.env.CONFIRM_KEEP_SCHOOLS_RESET !== '1') {
    console.error(
      '❌ 안전장치: CONFIRM_KEEP_SCHOOLS_RESET=1 없이는 실행할 수 없습니다.',
    );
    console.error(
      '   예: CONFIRM_KEEP_SCHOOLS_RESET=1 npm run db:reset-keep-schools -- --target=production',
    );
    process.exit(1);
  }

  const { targets } = parseMigrateCliArgs();
  const target = targets[0];
  const opts = getDbConnectionOptions(target);
  const dbName = opts.database;
  const connection = await mysql.createConnection(getDbConfig(target));

  try {
    const [schoolCountRows] = await connection.execute(
      'SELECT COUNT(*) AS cnt FROM schools',
    ).catch(() => [[{ cnt: 0 }]]);
    const schoolCount = Number(schoolCountRows[0]?.cnt ?? 0);

    const tables = await listTables(connection, dbName);
    const toDrop = tables.filter((name) => !PRESERVE.has(name));

    console.log('==============================');
    console.log(`📂 대상 DB: ${dbName} (${target})`);
    console.log(`🏫 schools 유지: ${schoolCount}건`);
    console.log(`🗑  DROP 대상: ${toDrop.length}개 테이블 (schools 제외)`);
    console.log('==============================');

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of toDrop) {
      await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
      console.log(`   - DROP ${table}`);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    const [afterCount] = await connection.execute(
      'SELECT COUNT(*) AS cnt FROM schools',
    );
    console.log(
      `\n✅ DROP 완료. schools 잔여: ${Number(afterCount[0]?.cnt ?? 0)}건`,
    );
  } finally {
    await connection.end();
  }

  console.log('\n▶️  migrate 실행 (001_init …)\n');
  await runMigrate(target);
  console.log('\n✅ schools 보존 리셋 + migrate 완료');
  console.log(
    '   다음: CONFIRM_DB_RESET=1 npm run seed:reset-admins -- --target=production',
  );
  console.log(
    '   (또는 ADMIN_SEED_* 로 관리자 생성 후 seed:reset-admins)',
  );
}

main().catch((err) => {
  console.error('❌ db:reset-keep-schools 실패:', err?.message || err);
  process.exit(1);
});

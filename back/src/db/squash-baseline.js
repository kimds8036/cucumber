/**
 * 기존 DB(로컬·develop·production)에 마이그레이션 스쿼시 베이스라인 동기화.
 *
 * - schema_migrations 테이블 생성
 * - 001_init.sql 및 이전 65개 파일을 "이미 적용됨"으로 기록 (DDL 실행 없음)
 * - 기존 데이터·스키마는 그대로 유지
 *
 * 사용 (각 환경당 1회):
 *   npm run db:squash-baseline -- --target=develop
 *   npm run db:squash-baseline -- --target=production
 *   npm run db:squash-baseline -- --all
 */
import { createDbConnection, parseMigrateCliArgs } from '../config/dbEnv.js';
import {
  BASELINE_INIT_FILE,
  PRE_SQUASH_MIGRATION_FILES,
  ensureSchemaMigrationsTable,
  getAppliedMigrations,
  recordMigration,
} from './schemaMigrations.js';

async function baselineTarget(target) {
  const connection = await createDbConnection(target);
  console.log(`\n📌 squash baseline: ${target}`);

  try {
    await ensureSchemaMigrationsTable(connection);
    const applied = await getAppliedMigrations(connection);

    const toRecord = [
      ...PRE_SQUASH_MIGRATION_FILES.filter((f) => !applied.has(f)),
      ...(applied.has(BASELINE_INIT_FILE) ? [] : [BASELINE_INIT_FILE]),
    ];

    if (toRecord.length === 0) {
      console.log('  ⏭️  이미 베이스라인 동기화됨');
      return;
    }

    for (const filename of toRecord) {
      const source = filename === BASELINE_INIT_FILE ? 'squash' : 'baseline';
      await recordMigration(connection, filename, { source });
      console.log(`  ✅ 기록: ${filename} (${source})`);
    }

    console.log(`  🎉 ${toRecord.length}건 이력 동기화 (DDL 미실행)`);
  } finally {
    await connection.end();
  }
}

async function main() {
  const { targets } = parseMigrateCliArgs();
  for (const target of targets) {
    await baselineTarget(target);
  }
}

main().catch((err) => {
  console.error('❌ squash-baseline 실패:', err.message);
  process.exit(1);
});

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createDbConnection,
  getDbConnectionOptions,
  parseMigrateCliArgs,
} from '../config/dbEnv.js';
import { backfillPersonalMailRecipientNames } from './piiBackfill.js';
import { seedLegalDocuments } from './seedLegalDocuments.js';
import { stripLegalDocumentsInDb } from './stripLegalDocumentsInDb.js';
import {
  BASELINE_INIT_FILE,
  PRE_SQUASH_MIGRATION_FILES,
  SCHEMA_MIGRATIONS_TABLE,
  ensureSchemaMigrationsTable,
  getAppliedMigrations,
  recordMigration,
} from './schemaMigrations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEGAL_SEED_MIGRATION_FILES = new Set([
  BASELINE_INIT_FILE,
  '002_extend_legal_documents.sql',
  '058_add_legal_documents.sql',
]);

async function runPostMigrationHooks(connection, file) {
  if (file === BASELINE_INIT_FILE) {
    try {
      const updated = await backfillPersonalMailRecipientNames(connection);
      if (updated > 0) {
        console.log(`  🔐 personal_mails recipient_name 백필: ${updated}건`);
      }
    } catch (backfillErr) {
      if (String(backfillErr?.message || '').includes('PII_ENCRYPTION_KEY')) {
        console.warn(
          '  ⚠️  PII 키 없음 — personal_mails 백필 스킵 (npm run migrate:pii-encrypt)',
        );
      } else {
        throw backfillErr;
      }
    }
  }

  if (LEGAL_SEED_MIGRATION_FILES.has(file)) {
    const inserted = await seedLegalDocuments(connection);
    if (inserted > 0) {
      console.log(`  📄 legal_documents 초기 시드: ${inserted}건`);
    }
    if (file === BASELINE_INIT_FILE) return;
  }

  if (file === '003_strip_legal_document_preamble.sql') {
    const updated = await stripLegalDocumentsInDb(connection);
    if (updated > 0) {
      console.log(`  📄 legal_documents 본문 메타 제거: ${updated}건`);
    }
  }

  // 레거시: 스쿼시 전 DB에 남아 있을 수 있는 파일명 (베이스라인 전 배포 1회)
  if (file === '056_personal_mails_recipient_name_pii.sql') {
    try {
      const updated = await backfillPersonalMailRecipientNames(connection);
      if (updated > 0) {
        console.log(`  🔐 personal_mails recipient_name 백필: ${updated}건`);
      }
    } catch (backfillErr) {
      if (String(backfillErr?.message || '').includes('PII_ENCRYPTION_KEY')) {
        console.warn(
          '  ⚠️  PII 키 없음 — personal_mails 백필 스킵 (npm run migrate:pii-encrypt)',
        );
      } else {
        throw backfillErr;
      }
    }
  }
}

async function tableExists(connection, tableName) {
  // SHOW/LIKE 는 prepared statement(?) 미지원 → 식별자만 안전하게 허용
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    throw new Error(`잘못된 테이블명: ${tableName}`);
  }
  const [rows] = await connection.query(`SHOW TABLES LIKE '${tableName}'`);
  return Array.isArray(rows) && rows.length > 0;
}

/**
 * users만 있고 스키마가 비어 있는데 squash 이력이 찍힌 경우
 * (불완전 production 등) → 001~후속 이력을 지워 실제 DDL을 다시 돌린다.
 */
async function repairIncompleteBaselineIfNeeded(connection, target) {
  const applied = await getAppliedMigrations(connection);
  if (!applied.has(BASELINE_INIT_FILE)) return;

  const hasCanary = await tableExists(connection, 'admin_stats_snapshots');
  if (hasCanary) return;

  console.warn(
    `⚠️  [${target}] 001_init 이력은 있으나 admin_stats_snapshots 없음 — 불완전 squash로 판단`,
  );
  console.warn(
    `   schema_migrations에서 활성 마이그레이션 이력을 지우고 001_init부터 재적용합니다.`,
  );

  await connection.execute(
    `DELETE FROM ${SCHEMA_MIGRATIONS_TABLE}
     WHERE filename IN (?, ?, ?)
        OR source IN ('squash', 'baseline')`,
    [
      BASELINE_INIT_FILE,
      '002_extend_legal_documents.sql',
      '003_strip_legal_document_preamble.sql',
    ],
  );
}

async function autoSquashBaselineIfNeeded(connection, target) {
  await ensureSchemaMigrationsTable(connection);
  const applied = await getAppliedMigrations(connection);

  if (applied.has(BASELINE_INIT_FILE)) {
    return;
  }

  // 레거시(이미 풀 스키마) DB만 DDL 없이 이력 동기화.
  // users만 있는 불완전/빈 DB는 squash 하지 않고 001_init 실행.
  const hasUsers = await tableExists(connection, 'users');
  const hasCanary = await tableExists(connection, 'admin_stats_snapshots');
  if (!hasUsers || !hasCanary) {
    return;
  }

  console.log(
    `📌 [${target}] 기존 풀스키마 DB 감지 — squash 베이스라인 자동 동기화 (DDL 없음)`,
  );

  const toRecord = [
    ...PRE_SQUASH_MIGRATION_FILES.filter((f) => !applied.has(f)),
    BASELINE_INIT_FILE,
  ];

  for (const filename of toRecord) {
    const source = filename === BASELINE_INIT_FILE ? 'squash' : 'baseline';
    await recordMigration(connection, filename, { source });
  }

  console.log(`  ✅ ${toRecord.length}건 이력 기록 완료\n`);
}

async function runMigrationsForTarget(target) {
  const opts = getDbConnectionOptions(target);
  console.log('\n==============================');
  console.log(`📂 migrate target: ${target}`);
  console.log(`   host=${opts.host}:${opts.port} db=${opts.database}`);
  console.log('==============================\n');

  const connection = await createDbConnection(target);
  const migrationsDir = path.join(__dirname, 'migrations');

  try {
    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️ migrations 디렉토리가 없습니다.');
      return;
    }

    await ensureSchemaMigrationsTable(connection);
    await repairIncompleteBaselineIfNeeded(connection, target);
    await autoSquashBaselineIfNeeded(connection, target);
    const applied = await getAppliedMigrations(connection);

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('⚠️  실행할 마이그레이션 파일이 없습니다.');
      return;
    }

    const pending = files.filter((f) => !applied.has(f));
    console.log(
      `📦 마이그레이션 ${files.length}개 (미적용 ${pending.length}개)\n`,
    );

    if (pending.length === 0) {
      console.log(`✅ [${target}] 모든 마이그레이션이 이미 적용됨`);
      return;
    }

    for (const file of pending) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');

      console.log(`⏳ [${target}] 실행 중: ${file}`);

      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .filter((s) => {
          const lines = s.split('\n').map((line) => line.trim()).filter(Boolean);
          return lines.some((line) => !line.startsWith('--'));
        });

      for (const statement of statements) {
        try {
          await connection.execute(statement);
        } catch (err) {
          if (err.errno === 1050) console.warn('  ⏭️  테이블 이미 존재, 스킵');
          else if (err.errno === 1060) console.warn('  ⏭️  컬럼 이미 존재, 스킵');
          else if (err.errno === 1061) console.warn('  ⏭️  인덱스 이미 존재, 스킵');
          else if (err.errno === 1062) console.warn('  ⏭️  중복 데이터/키, 스킵');
          else if (err.errno === 1091) console.warn('  ⏭️  대상(인덱스/컬럼) 없음, 스킵');
          else if (err.errno === 1826) console.warn('  ⏭️  Foreign Key 이름 이미 존재, 스킵');
          else if (err.errno === 1146) console.warn('  ⏭️  테이블 없음, 스킵');
          else if (err.errno === 1054) console.warn('  ⏭️  필드 없음, 스킵');
          else throw err;
        }
      }

      await recordMigration(connection, file, { checksum, source: 'migrate' });
      console.log(`✅ [${target}] 완료: ${file}\n`);

      await runPostMigrationHooks(connection, file);
    }

    console.log(`🎉 [${target}] 마이그레이션 완료`);
  } finally {
    await connection.end();
  }
}

async function runMigrations() {
  const { targets } = parseMigrateCliArgs();

  for (const target of targets) {
    await runMigrationsForTarget(target);
  }

  if (targets.length > 1) {
    console.log('\n✅ 모든 대상 DB 마이그레이션 완료:', targets.join(', '));
  }
}

runMigrations().catch((error) => {
  console.error('❌ 마이그레이션 오류:', error.message);
  process.exit(1);
});

/**
 * archive/pre-squash/*.sql 을 임시 MySQL에 순서대로 적용한 뒤 001_init.sql 생성.
 * (로컬 Docker 필요 — Railway 터널 없이도 동작)
 *
 * 사용: npm run db:build-init
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { backfillPersonalMailRecipientNames } from './piiBackfill.js';
import { seedLegalDocuments } from './seedLegalDocuments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVE_DIR = path.join(__dirname, 'migrations', 'archive', 'pre-squash');
const OUT_PATH = path.join(__dirname, 'migrations', '001_init.sql');

const DB = {
  host: process.env.SQUASH_MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.SQUASH_MYSQL_PORT || 3310),
  user: process.env.SQUASH_MYSQL_USER || 'root',
  password: process.env.SQUASH_MYSQL_PASSWORD || 'squash',
  database: process.env.SQUASH_MYSQL_DATABASE || 'cucumber_squash',
  multipleStatements: true,
};

const SEED_BLOCK = `
-- ── 초기 시드 (신규 DB 전용) ─────────────────────────────────────────────

INSERT IGNORE INTO colors (id, hex_code, color_number) VALUES
(1, '#FFF3F3', 1),
(2, '#FFFCD7', 2),
(3, '#F7FFF3', 3),
(4, '#E4EFFF', 4);

INSERT IGNORE INTO schools (
  school_id, name, school_type, operation_status
) VALUES (
  'CERT_PENDING', '학생증 인증 대기', 'special', 'active'
);

INSERT INTO system_flags (flag_key, flag_value, note) VALUES
  ('signup_disabled', 'false', '초기값'),
  ('post_write_disabled', 'false', '초기값'),
  ('comment_write_disabled', 'false', '초기값'),
  ('report_submission_disabled', 'false', '초기값'),
  ('global_readonly', 'false', '초기값'),
  ('rate_limit_strict_mode', 'false', '초기값'),
  ('locked_school_ids', '[]', '초기값'),
  ('maintenance_message', '""', '초기값')
ON DUPLICATE KEY UPDATE flag_key = flag_key;
`;

const SKIP_TABLES = new Set(['schema_migrations']);

async function execFile(connection, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      await connection.execute(statement);
    } catch (err) {
      if ([1050, 1060, 1061, 1062, 1091, 1826, 1146, 1054].includes(err.errno)) {
        continue;
      }
      throw err;
    }
  }
}

async function applyArchiveMigrations(connection) {
  const files = fs
    .readdirSync(ARCHIVE_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    process.stdout.write(`  apply ${file}\n`);
    await execFile(connection, path.join(ARCHIVE_DIR, file));

    if (file === '056_personal_mails_recipient_name_pii.sql') {
      try {
        await backfillPersonalMailRecipientNames(connection);
      } catch (e) {
        if (!String(e?.message || '').includes('PII_ENCRYPTION_KEY')) throw e;
      }
    }
    if (file === '058_add_legal_documents.sql') {
      await seedLegalDocuments(connection);
    }
  }
}

async function dumpSchema(connection) {
  const [tableRows] = await connection.execute('SHOW TABLES');
  const dbKey = Object.keys(tableRows[0] || {})[0];
  const tables = tableRows.map((r) => r[dbKey]).filter((t) => !SKIP_TABLES.has(t)).sort();

  const parts = [
    '-- Cucumber DB 초기 스키마 (마이그레이션 스쿼시)',
    `-- Generated: ${new Date().toISOString()}`,
    '-- 신규 DB: migrate.js가 이 파일만 실행합니다.',
    '-- 기존 DB: squash-baseline.js로 이력만 동기화 (DDL 미실행).',
    '',
  ];

  for (const table of tables) {
    const [rows] = await connection.execute(`SHOW CREATE TABLE \`${table}\``);
    let ddl = rows[0]['Create Table'];
    if (!ddl.includes('CREATE TABLE IF NOT EXISTS')) {
      ddl = ddl.replace(/^CREATE TABLE/, 'CREATE TABLE IF NOT EXISTS');
    }
    parts.push(`-- ── ${table} ──`);
    parts.push(`${ddl};`);
    parts.push('');
  }

  parts.push(SEED_BLOCK.trim());
  parts.push('');
  return parts.join('\n');
}

async function main() {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    throw new Error(`archive 없음: ${ARCHIVE_DIR}`);
  }

  const root = await mysql.createConnection({
    host: DB.host,
    port: DB.port,
    user: DB.user,
    password: DB.password,
  });

  await root.query(`CREATE DATABASE IF NOT EXISTS \`${DB.database}\``);
  await root.end();

  const connection = await mysql.createConnection({ ...DB });
  await connection.query("SET SESSION time_zone = '+00:00'");

  try {
    console.log(`📦 archive 마이그레이션 적용 (${DB.host}:${DB.port})...`);
    await applyArchiveMigrations(connection);

    console.log('📝 스키마 덤프...');
    const sql = await dumpSchema(connection);
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    fs.writeFileSync(OUT_PATH, sql, 'utf8');
    console.log(`✅ ${OUT_PATH}`);
    console.log(`   tables: ${sql.match(/^CREATE TABLE/gm)?.length ?? 0}`);
    console.log(`   sha256: ${checksum}`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('❌ build-init 실패:', err.message);
  process.exit(1);
});

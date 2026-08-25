/**
 * 현재 DB 스키마를 덤프해 migrations/001_init.sql 생성.
 *
 * 사용:
 *   npm run db:generate-init              # RAILWAY_TARGET / Railway 런타임 기준
 *   npm run db:generate-init -- --target=develop
 *   railway run -- npm run db:generate-init   # Railway 내부 네트워크 (권장)
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDbConnection, parseMigrateCliArgs } from '../config/dbEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, 'migrations', '001_init.sql');

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

/** FK 의존 순서: users 등 참조 테이블을 먼저 */
const TABLE_ORDER = [
  'schools',
  'colors',
  'admin_users',
  'users',
  'timer_subjects',
  'tags',
  'posts',
  'comments',
  'message_rooms',
  'messages',
  'personal_mail_rooms',
  'personal_mails',
  'school_mails',
  'school_mail_likes',
  'school_mail_comments',
  'school_mail_comment_likes',
  'dm_rooms',
  'dm_messages',
  'phone_verifications',
  'user_devices',
  'post_likes',
  'comment_likes',
  'post_tags',
  'reports',
  'ocr_verifications',
  'user_friendships',
  'user_blocks',
  'notifications',
  'user_settings',
  'study_days',
  'study_sessions',
  'post_images',
  'message_images',
  'comment_images',
  'dm_message_images',
  'post_scraps',
  'timer_tasks',
  'report_appeals',
  'admin_audit_logs',
  'fcm_tokens',
  'inquiries',
  'inquiry_images',
  'signup_certificate_submissions',
  'signup_verification_tokens',
  'user_signup_consents',
  'account_recovery_tokens',
  'signup_student_id_submissions',
  'admin_totp_secrets',
  'attendances',
  'guardian_verifications',
  'system_flags',
  'admin_stats_snapshots',
  'attendance_suspicion_flags',
  'user_sanctions',
  'reports_archive',
  'analytics_daily_snapshots',
  'identity_verifications',
  'legal_documents',
  'legal_document_revisions',
  'install_landing_daily_stats',
  'install_landing_hourly_stats',
  'school_terms',
  'school_closures',
  'user_badges',
  'user_invites',
  'user_timetable_overrides',
  'user_period_time_settings',
  'batch_job_runs',
  'batch_job_cursors',
];

const SKIP_TABLES = new Set(['schema_migrations']);

function sortTables(tables) {
  const orderIndex = new Map(TABLE_ORDER.map((t, i) => [t, i]));
  return [...tables].sort((a, b) => {
    const ai = orderIndex.has(a) ? orderIndex.get(a) : 999;
    const bi = orderIndex.has(b) ? orderIndex.get(b) : 999;
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b);
  });
}

async function dumpSchema(connection) {
  const [tableRows] = await connection.execute('SHOW TABLES');
  const dbKey = Object.keys(tableRows[0] || {})[0] || 'Tables_in_railway';
  const tables = tableRows
    .map((r) => r[dbKey])
    .filter((t) => !SKIP_TABLES.has(t));

  const sorted = sortTables(tables);
  const parts = [
    '-- Cucumber DB 초기 스키마 (마이그레이션 스쿼시)',
    `-- Generated: ${new Date().toISOString()}`,
    '-- 신규 DB: migrate.js가 이 파일만 실행합니다.',
    '-- 기존 DB: 001_init 이력이 있으면 DDL을 다시 돌리지 않음. 빠진 테이블·컬럼은 migrate.js가 보정.',
    '',
  ];

  for (const table of sorted) {
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
  const { targets } = parseMigrateCliArgs();
  const target = targets[0];
  const connection = await createDbConnection(target);

  try {
    const sql = await dumpSchema(connection);
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    fs.writeFileSync(OUT_PATH, sql, 'utf8');
    console.log(`✅ ${OUT_PATH}`);
    console.log(`   tables: ${sql.match(/^CREATE TABLE/gm)?.length ?? 0}`);
    console.log(`   sha256: ${checksum}`);
    console.log('\n다음: archive 이동 후 squash-baseline.js를 각 DB에 1회 실행하세요.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('❌ generate 실패:', err.message);
  process.exit(1);
});

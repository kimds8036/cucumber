export const SCHEMA_MIGRATIONS_TABLE = 'schema_migrations';

export const BASELINE_INIT_FILE = '001_init.sql';

/** 스쿼시 이전 마이그레이션 파일명 (이력 동기화·감사용) */
export const PRE_SQUASH_MIGRATION_FILES = [
  '001_initial_schema.sql',
  '002_add_post_images.sql',
  '002_school_mail_social.sql',
  '002_soft_delete_posts_comments.sql',
  '002_study_sessions_subject_and_index.sql',
  '003_schools_json_columns.sql',
  '003_soft_delete_messages.sql',
  '004_chat_delete_recovery.sql',
  '004_personal_mails_status.sql',
  '005_personal_mail_threads.sql',
  '006_personal_mail_thread_indexes.sql',
  '006_soft_delete_post_images.sql',
  '007_add_message_images.sql',
  '008_add_comment_images.sql',
  '009_add_parent_message_id_to_messages.sql',
  '010_add_dm_rooms.sql',
  '011_dm_message_images.sql',
  '012_add_parent_message_id_to_dm_messages.sql',
  '013_drop_timetables_table.sql',
  '014_user_settings_friend_mail.sql',
  '015_post_geo_coordinates.sql',
  '016_mail_rooms.sql',
  '017_rename_mail_rooms_to_personal_mail_rooms.sql',
  '018_fix_personal_mail_rooms_fk.sql',
  '019_drop_legacy_mail_rooms.sql',
  '020_soft_delete_dm_personal_rooms.sql',
  '021_school_stats_snapshots.sql',
  '022_add_users_fcm_token.sql',
  '023_add_notifications_watchers_json.sql',
  '024_timer_normalization.sql',
  '025_add_study_sessions_subject_color.sql',
  '026_add_report_moderation_foundation.sql',
  '027_add_user_report_penalty_counters.sql',
  '028_add_admin_moderation_tables.sql',
  '029_add_fcm_tokens_table.sql',
  '030_add_shadow_block_columns.sql',
  '031_add_study_days_school_id.sql',
  '032_study_sessions_started_ended_timestamps.sql',
  '033_add_inquiries.sql',
  '034_inquiries_drop_title_phone.sql',
  '035_inquiries_drop_category.sql',
  '036_fcm_tokens_multidevice_normalize.sql',
  '037_add_signup_certificate_submissions.sql',
  '038_reports_user_link_and_unique.sql',
  '039_add_signup_integrity_tables.sql',
  '040_add_account_recovery_tokens.sql',
  '041_add_signup_student_id_manual_review.sql',
  '042_add_admin_totp_secrets.sql',
  '043_sprint8_qa_backend.sql',
  '044_student_id_submission_purpose.sql',
  '045_admin_users_table.sql',
  '046_admin_ops_foundation.sql',
  '047_user_pii_encryption.sql',
  '048_analytics_daily_snapshots.sql',
  '049_analytics_screen_stats.sql',
  '050_identity_verifications.sql',
  '051_inicis_app_return_url.sql',
  '052_pinned_comments_identity_link.sql',
  '053_phone_verifications_nullable_phone.sql',
  '054_drop_deprecated_pii_plaintext_columns.sql',
  '055_guardian_phone_pii_encryption.sql',
  '056_personal_mails_recipient_name_pii.sql',
  '057_drop_personal_mails_recipient_name_plaintext.sql',
  '058_add_legal_documents.sql',
  '059_add_legal_document_revisions.sql',
];

export async function ensureSchemaMigrationsTable(connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      checksum VARCHAR(64) NULL COMMENT 'SHA-256 hex (optional)',
      source VARCHAR(32) NOT NULL DEFAULT 'migrate' COMMENT 'migrate|baseline|squash'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='적용된 SQL 마이그레이션 이력'
  `);
}

export async function getAppliedMigrations(connection) {
  await ensureSchemaMigrationsTable(connection);
  const [rows] = await connection.execute(
    `SELECT filename FROM ${SCHEMA_MIGRATIONS_TABLE} ORDER BY filename`,
  );
  return new Set(rows.map((r) => r.filename));
}

export async function recordMigration(connection, filename, { checksum = null, source = 'migrate' } = {}) {
  await connection.execute(
    `INSERT INTO ${SCHEMA_MIGRATIONS_TABLE} (filename, checksum, source)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE applied_at = applied_at`,
    [filename, checksum, source],
  );
}

export async function isMigrationApplied(connection, filename) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM ${SCHEMA_MIGRATIONS_TABLE} WHERE filename = ? LIMIT 1`,
    [filename],
  );
  return rows.length > 0;
}

import pool from '../config/database.js';

let ensurePromise = null;

async function columnExists(tableName, columnName) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName],
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}

async function addColumn(tableName, columnName, definitionSql) {
  if (await columnExists(tableName, columnName)) return;
  await pool.execute(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`,
  );
}

/**
 * personal_mails 스키마 보강 (마이그레이션 SQL과 동일 목적, 서버 기동 시 멱등)
 */
export async function ensurePersonalMailSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const [tables] = await pool.execute(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'personal_mails'`,
      );
      if (Number(tables[0]?.cnt ?? 0) === 0) {
        await pool.execute(`
          CREATE TABLE personal_mails (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_id INT NOT NULL,
            recipient_id INT NULL,
            content TEXT NOT NULL,
            status ENUM('sent','read','returned') NOT NULL DEFAULT 'sent',
            is_match_failed BOOLEAN NOT NULL DEFAULT FALSE,
            recipient_school_id VARCHAR(50) NULL,
            recipient_grade TINYINT NULL,
            recipient_class_num TINYINT NULL,
            recipient_name VARCHAR(50) NULL,
            recipient_user_id VARCHAR(50) NULL,
            sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            returned_at TIMESTAMP NULL,
            parent_mail_id INT NULL,
            root_mail_id INT NULL,
            room_id INT NULL,
            is_deleted BOOLEAN DEFAULT FALSE,
            is_shadow_blocked BOOLEAN DEFAULT FALSE,
            shadow_blocked_for_user_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_sender (sender_id),
            INDEX idx_recipient (recipient_id),
            INDEX idx_status_sent_at (status, sent_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        return;
      }

      await addColumn(
        'personal_mails',
        'status',
        "ENUM('sent','read','returned') NOT NULL DEFAULT 'sent'",
      );
      await addColumn('personal_mails', 'is_match_failed', 'BOOLEAN NOT NULL DEFAULT FALSE');
      await addColumn('personal_mails', 'recipient_school_id', 'VARCHAR(50) NULL');
      await addColumn('personal_mails', 'recipient_grade', 'TINYINT NULL');
      await addColumn('personal_mails', 'recipient_class_num', 'TINYINT NULL');
      await addColumn('personal_mails', 'recipient_name', 'VARCHAR(50) NULL');
      await addColumn('personal_mails', 'recipient_user_id', 'VARCHAR(50) NULL');
      await addColumn(
        'personal_mails',
        'sent_at',
        'TIMESTAMP NULL DEFAULT NULL',
      );
      await addColumn('personal_mails', 'returned_at', 'TIMESTAMP NULL');

      if (await columnExists('personal_mails', 'is_read')) {
        await pool.execute(
          `UPDATE personal_mails SET status = 'read' WHERE is_read = TRUE AND status = 'sent'`,
        );
        await pool.execute(
          `UPDATE personal_mails SET sent_at = created_at WHERE sent_at IS NULL`,
        );
        await pool.execute(`ALTER TABLE personal_mails DROP COLUMN is_read`);
      } else {
        await pool.execute(
          `UPDATE personal_mails SET sent_at = created_at WHERE sent_at IS NULL`,
        );
      }

      await pool.execute(
        `ALTER TABLE personal_mails MODIFY COLUMN recipient_id INT NULL`,
      );
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}

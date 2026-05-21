-- personal_mails: status 통합, 수신인 스냅샷, 매칭 실패·반송 (멱등 — migrate.js 재실행 가능)

CREATE TABLE IF NOT EXISTS personal_mails (
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
  INDEX idx_pm_sender (sender_id),
  INDEX idx_pm_recipient (recipient_id),
  INDEX idx_pm_status_sent (status, sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE personal_mails ADD COLUMN status ENUM('sent','read','returned') NOT NULL DEFAULT 'sent';

ALTER TABLE personal_mails ADD COLUMN is_match_failed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE personal_mails ADD COLUMN recipient_school_id VARCHAR(50) NULL;

ALTER TABLE personal_mails ADD COLUMN recipient_grade TINYINT NULL;

ALTER TABLE personal_mails ADD COLUMN recipient_class_num TINYINT NULL;

ALTER TABLE personal_mails ADD COLUMN recipient_name VARCHAR(50) NULL;

ALTER TABLE personal_mails ADD COLUMN recipient_user_id VARCHAR(50) NULL;

ALTER TABLE personal_mails ADD COLUMN sent_at TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE personal_mails ADD COLUMN returned_at TIMESTAMP NULL;

UPDATE personal_mails SET status = 'read' WHERE is_read = TRUE AND (status IS NULL OR status = 'sent');

UPDATE personal_mails SET sent_at = COALESCE(sent_at, created_at) WHERE sent_at IS NULL;

ALTER TABLE personal_mails DROP COLUMN is_read;

ALTER TABLE personal_mails MODIFY COLUMN recipient_id INT NULL;

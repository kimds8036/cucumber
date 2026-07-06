-- 관리자 운영·보안·DB 수명 기반 스키마

ALTER TABLE admin_users
  ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'moderator' COMMENT 'super|moderator|support|verifier' AFTER name,
  ADD COLUMN last_login_at TIMESTAMP NULL COMMENT '마지막 로그인' AFTER is_deleted;

UPDATE admin_users SET role = 'super' WHERE role = 'moderator';

ALTER TABLE users
  ADD COLUMN is_shadow_muted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '관리자 섀도우 뮤트(작성물 상대에게 비표시)' AFTER is_whitelisted;

CREATE TABLE IF NOT EXISTS system_flags (
  flag_key VARCHAR(64) NOT NULL PRIMARY KEY COMMENT '플래그 키',
  flag_value JSON NOT NULL COMMENT '값 (boolean/string/array)',
  note TEXT NULL COMMENT '변경 사유',
  updated_by_admin_id INT NULL COMMENT '변경 관리자',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_system_flags_admin FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='비상 스위치·운영 플래그';

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

CREATE TABLE IF NOT EXISTS admin_stats_snapshots (
  stat_key VARCHAR(64) NOT NULL COMMENT '통계 키',
  stat_date DATE NOT NULL COMMENT 'KST 기준 일자',
  stat_value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (stat_key, stat_date),
  INDEX idx_admin_stats_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='관리자 대시보드 통계 스냅샷';

CREATE TABLE IF NOT EXISTS attendance_suspicion_flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  period_days INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  attendance_days INT NOT NULL DEFAULT 0,
  school_days INT NOT NULL DEFAULT 0,
  attendance_rate DECIMAL(6,2) NOT NULL DEFAULT 0,
  reason VARCHAR(255) NOT NULL,
  computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_att_suspicion_user_period (user_id, period_start, period_end),
  INDEX idx_att_suspicion_computed (computed_at),
  CONSTRAINT fk_att_suspicion_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='미등교 의심 사용자 배치 결과';

CREATE TABLE IF NOT EXISTS user_sanctions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  sanction_type VARCHAR(32) NOT NULL COMMENT 'suspend|ban|whitelist|unwhitelist|shadow_mute|shadow_unmute|unsuspend',
  reason TEXT NULL,
  admin_user_id INT NOT NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_sanctions_user (user_id, created_at),
  CONSTRAINT fk_user_sanctions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_sanctions_admin FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 제재 이력';

CREATE TABLE IF NOT EXISTS reports_archive (
  id INT NOT NULL PRIMARY KEY COMMENT '원본 reports.id',
  reporter_id INT NOT NULL,
  target_type VARCHAR(20) NOT NULL,
  target_id INT NOT NULL,
  reason VARCHAR(255) NULL,
  description TEXT NULL,
  status VARCHAR(20) NOT NULL,
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  review_note TEXT NULL,
  is_malicious BOOLEAN NOT NULL DEFAULT FALSE,
  penalty_applied BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reports_archive_status_created (status, created_at),
  INDEX idx_reports_archive_archived (archived_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='처리 완료 신고 아카이브';

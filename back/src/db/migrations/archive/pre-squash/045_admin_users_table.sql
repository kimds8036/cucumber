-- 관리자 계정을 users 와 분리 (재인증·성인 크론 등 학생 users 로직 대상 제외)

CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '관리자 ID',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '관리자 로그인 ID',
  password VARCHAR(255) NOT NULL COMMENT '암호화된 비밀번호',
  name VARCHAR(100) NOT NULL COMMENT '관리자 표시명',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '비활성(삭제) 여부',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admin_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='관리자 전용 계정 (앱 users 와 분리)';

ALTER TABLE admin_audit_logs DROP FOREIGN KEY admin_audit_logs_ibfk_1;

ALTER TABLE admin_totp_secrets DROP FOREIGN KEY admin_totp_secrets_ibfk_1;

ALTER TABLE admin_totp_secrets
  CHANGE COLUMN user_id admin_user_id INT NOT NULL COMMENT 'admin_users.id';

ALTER TABLE admin_totp_secrets
  ADD CONSTRAINT fk_admin_totp_admin_user
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE;

ALTER TABLE admin_audit_logs
  ADD CONSTRAINT fk_admin_audit_admin_user
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE RESTRICT;

-- 인앱 마지막 접속 + 설치 후 미가입 퍼널
ALTER TABLE users
  ADD COLUMN last_seen_at TIMESTAMP NULL DEFAULT NULL
    COMMENT '인앱 마지막 접속(메인 게시판 등)'
    AFTER created_at;

CREATE TABLE IF NOT EXISTS app_installs (
  id INT NOT NULL AUTO_INCREMENT,
  install_id VARCHAR(64) NOT NULL COMMENT '앱 로컬 설치 식별자',
  device_id VARCHAR(128) NULL,
  platform VARCHAR(16) NULL COMMENT 'ios|android|other',
  app_version VARCHAR(32) NULL,
  first_open_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_open_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  converted_user_id INT NULL COMMENT '가입·로그인 전환된 users.id',
  converted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_app_installs_install_id (install_id),
  KEY idx_app_installs_device_id (device_id),
  KEY idx_app_installs_converted (converted_user_id, converted_at),
  KEY idx_app_installs_first_open (first_open_at),
  KEY idx_app_installs_unconverted (converted_user_id, first_open_at),
  CONSTRAINT fk_app_installs_user
    FOREIGN KEY (converted_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='설치·실행 후 미가입 퍼널 (로그인 전)';

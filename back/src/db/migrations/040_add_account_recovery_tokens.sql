-- 비밀번호 찾기: 전화 인증 후 1회용 재설정 토큰

CREATE TABLE IF NOT EXISTS account_recovery_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  jti VARCHAR(36) NOT NULL COMMENT 'JWT jti (1회용)',
  user_id INT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  username VARCHAR(50) NOT NULL,
  used_at TIMESTAMP NULL DEFAULT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_jti (jti),
  INDEX idx_expires_at (expires_at),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='비밀번호 찾기 1회용 재설정 토큰';

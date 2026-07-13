-- 회원가입 무결성: OCR 검증 토큰 + 약관 동의 기록

CREATE TABLE IF NOT EXISTS signup_verification_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  jti VARCHAR(36) NOT NULL COMMENT 'JWT jti (1회용)',
  token_type ENUM('ocr') NOT NULL DEFAULT 'ocr',
  name VARCHAR(50) NOT NULL,
  birth_date DATE NOT NULL,
  school_id VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NULL COMMENT '선택: OCR 요청 시 전화번호(레이트리밋 키)',
  used_at TIMESTAMP NULL DEFAULT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_jti (jti),
  INDEX idx_expires_at (expires_at),
  INDEX idx_phone_created (phone, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='가입 전 OCR 등 1회용 검증 토큰';

CREATE TABLE IF NOT EXISTS user_signup_consents (
  user_id INT NOT NULL PRIMARY KEY,
  terms_of_service BOOLEAN NOT NULL DEFAULT FALSE,
  data_collection BOOLEAN NOT NULL DEFAULT FALSE,
  student_ocr BOOLEAN NOT NULL DEFAULT FALSE,
  location BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  consented_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='회원가입 시점 약관 동의 스냅샷';

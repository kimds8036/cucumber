-- 학생증 수동 검수 (OCR 대체): Cloudinary 업로드 + 관리자 승인

ALTER TABLE signup_verification_tokens
  MODIFY COLUMN token_type ENUM('ocr', 'student_id_manual') NOT NULL DEFAULT 'ocr',
  MODIFY COLUMN school_id VARCHAR(50) NULL COMMENT 'OCR 시 확정, 수동은 가입 시 확정';

ALTER TABLE signup_verification_tokens
  ADD COLUMN cloudinary_url VARCHAR(500) NULL COMMENT '학생증 Cloudinary URL' AFTER phone,
  ADD COLUMN cloudinary_public_id VARCHAR(200) NULL COMMENT 'Cloudinary public_id' AFTER cloudinary_url;

CREATE TABLE IF NOT EXISTS signup_student_id_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '제출 ID',
  user_id INT NOT NULL COMMENT '가입 사용자 ID',
  name VARCHAR(50) NOT NULL COMMENT '실명',
  phone VARCHAR(20) NOT NULL COMMENT '전화번호 (숫자만)',
  birth_date DATE NOT NULL COMMENT '생년월일',
  school_id VARCHAR(50) NOT NULL COMMENT '가입 시 사용자가 선택한 학교',
  cloudinary_url VARCHAR(500) NOT NULL COMMENT '학생증 이미지 URL',
  cloudinary_public_id VARCHAR(200) NULL COMMENT 'Cloudinary public_id',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected',
  review_note TEXT NULL COMMENT '관리자 검수 메모',
  reviewed_by INT NULL COMMENT '검수 관리자 users.id',
  reviewed_at TIMESTAMP NULL COMMENT '검수 시각',
  verification_jti VARCHAR(36) NULL COMMENT 'signup_verification_tokens.jti',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '제출 시각',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '갱신 시각',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_signup_sid_status_created (status, created_at),
  INDEX idx_signup_sid_user_id (user_id),
  INDEX idx_signup_sid_jti (verification_jti)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='회원가입 학생증 수동 검수';

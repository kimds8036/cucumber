-- 증명서 가입 시 임시 학교 (관리자 승인 시 실제 school_id 로 변경)
INSERT IGNORE INTO schools (school_id, name, school_type, region, school_level)
VALUES ('CERT_PENDING', '증명서 검수 대기', '기타', '', '기타');

-- 회원가입 증명서 제출·관리자 검수 (학생증 OCR 불가 학교)
CREATE TABLE IF NOT EXISTS signup_certificate_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '제출 ID',
  user_id INT NOT NULL COMMENT '가입 사용자 ID',
  name VARCHAR(50) NOT NULL COMMENT '실명',
  phone VARCHAR(20) NOT NULL COMMENT '전화번호 (숫자만)',
  birth_date DATE NOT NULL COMMENT '생년월일',
  certificate_view_url VARCHAR(500) NOT NULL COMMENT '열람용 주소',
  certificate_access_code VARCHAR(100) NOT NULL COMMENT '열람 번호',
  claimed_school_name VARCHAR(100) NULL COMMENT '사용자가 기재한 재학 학교명(검수 참고)',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected',
  review_note TEXT NULL COMMENT '관리자 검수 메모',
  reviewed_by INT NULL COMMENT '검수 관리자 users.id',
  reviewed_at TIMESTAMP NULL COMMENT '검수 시각',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '제출 시각',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '갱신 시각',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_signup_cert_status_created (status, created_at),
  INDEX idx_signup_cert_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='회원가입 증명서 검수';

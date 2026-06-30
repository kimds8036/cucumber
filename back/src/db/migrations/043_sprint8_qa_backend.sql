-- §8 스프린트: 세션·재인증·출석·학교우편 스냅샷·보호자 인증

ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0 COMMENT 'JWT 무효화 버전';

ALTER TABLE users ADD COLUMN reverification_status ENUM(
  'none', 'grace', 'required', 'restricted', 'graduated_blocked', 'adult_blocked'
) NOT NULL DEFAULT 'none' COMMENT '3/1 재인증·졸업·성인 차단 상태';

ALTER TABLE users ADD COLUMN reverification_deadline DATE NULL COMMENT '재인증 유예 종료일';

ALTER TABLE users ADD COLUMN previous_school_id VARCHAR(50) NULL COMMENT '중→고 전환 시 이전 중학교';

ALTER TABLE users ADD COLUMN grade_exception BOOLEAN NOT NULL DEFAULT FALSE COMMENT '생년월일 기대 학년 불일치 허용';

ALTER TABLE users ADD CONSTRAINT fk_users_previous_school
  FOREIGN KEY (previous_school_id) REFERENCES schools(school_id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS attendances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  school_id VARCHAR(50) NOT NULL,
  attendance_date DATE NOT NULL COMMENT 'KST 기준 일자',
  checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('present', 'rejected') NOT NULL DEFAULT 'present',
  reject_reason VARCHAR(100) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE,
  UNIQUE KEY uq_attendance_user_date (user_id, attendance_date),
  INDEX idx_attendance_school_date (school_id, attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='등교 출석부';

ALTER TABLE school_mails ADD COLUMN author_school_id VARCHAR(50) NULL COMMENT '작성 시점 작성자 학교';

UPDATE school_mails sm
INNER JOIN users u ON sm.user_id = u.id
SET sm.author_school_id = u.school_id
WHERE sm.author_school_id IS NULL;

ALTER TABLE school_mail_comments ADD COLUMN author_school_id VARCHAR(50) NULL COMMENT '작성 시점 작성자 학교';

UPDATE school_mail_comments smc
INNER JOIN users u ON smc.user_id = u.id
SET smc.author_school_id = u.school_id
WHERE smc.author_school_id IS NULL;

CREATE TABLE IF NOT EXISTS guardian_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_user_id INT NULL,
  guardian_phone VARCHAR(20) NOT NULL,
  status ENUM('pending', 'verified', 'failed') NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMP NULL,
  mock BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_guardian_phone (guardian_phone),
  INDEX idx_guardian_child (child_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='보호자 본인인증';

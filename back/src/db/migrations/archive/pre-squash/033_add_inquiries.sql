-- 문의하기(고객지원) 스키마
-- 1문의 1답변 인라인 구조 + 비로그인 문의 지원(로그인 오류/계정 정지)
-- 카테고리: login_error / account_suspension / bug / feedback
-- 신고(reports)와는 별개의 1:1 Q&A 채널

-- 1) 문의 본문 + 단일 답변 인라인 테이블
CREATE TABLE IF NOT EXISTS inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '문의 ID',
  category VARCHAR(30) NOT NULL COMMENT '문의 카테고리 (login_error/account_suspension/bug/feedback)',
  user_id INT NULL COMMENT '작성자 사용자 ID (비로그인 문의는 NULL)',
  contact_username VARCHAR(50) NULL COMMENT '비로그인 본인 식별용 username (입력값)',
  contact_phone VARCHAR(20) NULL COMMENT '비로그인 답변 수신/본인 식별용 전화번호',
  contact_email VARCHAR(255) NULL COMMENT '답변 수신용 이메일 (선택)',
  title VARCHAR(255) NOT NULL COMMENT '문의 제목',
  content TEXT NOT NULL COMMENT '문의 본문',
  app_version VARCHAR(30) NULL COMMENT '앱 버전 (버그 트리아지용)',
  device_info VARCHAR(255) NULL COMMENT 'OS/디바이스 정보',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '처리 상태 (pending/answered/closed)',
  answer_content TEXT NULL COMMENT '관리자 답변 본문 (1문의 1답변)',
  answered_by INT NULL COMMENT '답변 관리자 사용자 ID',
  answered_at TIMESTAMP NULL COMMENT '답변 시각',
  answer_note TEXT NULL COMMENT '운영 내부 메모 (사용자 비공개)',
  is_read_by_user BOOLEAN NOT NULL DEFAULT FALSE COMMENT '작성자가 답변을 확인했는지 여부',
  read_at TIMESTAMP NULL COMMENT '작성자가 답변을 확인한 시각',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '사용자 soft delete',
  deleted_at TIMESTAMP NULL COMMENT '삭제 시각',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록 시각',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '갱신 시각',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (answered_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_inquiries_user_status_created (user_id, status, created_at),
  INDEX idx_inquiries_status_created (status, created_at),
  INDEX idx_inquiries_category_created (category, created_at),
  INDEX idx_inquiries_answered_by (answered_by),
  INDEX idx_inquiries_contact_phone (contact_phone),
  INDEX idx_inquiries_contact_username (contact_username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='고객 문의(1문의 1답변) 테이블';

-- 2) 문의 첨부 이미지 (선택)
CREATE TABLE IF NOT EXISTS inquiry_images (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '이미지 ID',
  inquiry_id INT NOT NULL COMMENT '문의 ID',
  cloudinary_url VARCHAR(500) NOT NULL COMMENT 'Cloudinary 이미지 URL',
  cloudinary_public_id VARCHAR(255) NOT NULL COMMENT 'Cloudinary public_id',
  display_order TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '정렬 순서',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록 시각',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '삭제 시각 (soft delete)',
  FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE,
  INDEX idx_inquiry_images_inquiry_id (inquiry_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='문의 첨부 이미지';

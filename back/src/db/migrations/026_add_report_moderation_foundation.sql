-- 신고/운영 시스템 기반 스키마 확장

-- 1) 게시글 자동 숨김 상태 관리 컬럼
ALTER TABLE posts
  ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE COMMENT '신고 누적 등으로 숨김 처리 여부',
  ADD COLUMN hidden_reason VARCHAR(30) NULL COMMENT '숨김 사유 (REPORT_THRESHOLD/ADMIN)',
  ADD COLUMN hidden_at TIMESTAMP NULL COMMENT '숨김 처리 시각',
  ADD COLUMN hidden_by_report_count INT NOT NULL DEFAULT 0 COMMENT '숨김 시점 누적 신고 수';

-- 2) 신고 검토/허위신고 제재 처리 컬럼
ALTER TABLE reports
  ADD COLUMN reviewed_by INT NULL COMMENT '검토 관리자 사용자 ID',
  ADD COLUMN reviewed_at TIMESTAMP NULL COMMENT '검토 완료 시각',
  ADD COLUMN review_note TEXT NULL COMMENT '검토 메모',
  ADD COLUMN is_malicious BOOLEAN NOT NULL DEFAULT FALSE COMMENT '허위/악의 신고 여부',
  ADD COLUMN penalty_applied BOOLEAN NOT NULL DEFAULT FALSE COMMENT '신고자 패널티 반영 여부';

ALTER TABLE reports
  ADD CONSTRAINT fk_reports_reviewed_by_users
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- 3) 이의신청(소명) 테이블
CREATE TABLE IF NOT EXISTS report_appeals (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '이의신청 ID',
  post_id INT NOT NULL COMMENT '이의신청 대상 게시글 ID',
  appellant_id INT NOT NULL COMMENT '이의신청자(게시글 작성자) 사용자 ID',
  content TEXT NOT NULL COMMENT '소명 내용',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '처리 상태 (pending/accepted/rejected)',
  review_note TEXT NULL COMMENT '검토 메모',
  reviewed_by INT NULL COMMENT '검토 관리자 사용자 ID',
  reviewed_at TIMESTAMP NULL COMMENT '검토 완료 시각',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시각',
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (appellant_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_report_appeals_post_id (post_id),
  INDEX idx_report_appeals_appellant_status (appellant_id, status),
  INDEX idx_report_appeals_status_created_at (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='숨김 게시글 이의신청 테이블';

-- 4) 신고 운영 인덱스
ALTER TABLE posts
  ADD INDEX idx_posts_is_hidden_created_at (is_hidden, created_at);

ALTER TABLE reports
  ADD INDEX idx_reports_target_status_created_at (target_type, target_id, status, created_at),
  ADD INDEX idx_reports_status_created_at (status, created_at),
  ADD INDEX idx_reports_reviewed_by (reviewed_by);

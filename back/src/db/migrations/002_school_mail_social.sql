-- 기존 DB에 한 번 적용 (이미 컬럼/테이블이 있으면 오류 날 수 있음 — 수동 확인)
ALTER TABLE school_mails ADD COLUMN like_count INT NOT NULL DEFAULT 0 COMMENT '좋아요 수';

CREATE TABLE IF NOT EXISTS school_mail_likes (
  mail_id INT NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (mail_id, user_id),
  FOREIGN KEY (mail_id) REFERENCES school_mails(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학교 우편 좋아요';

CREATE TABLE IF NOT EXISTS school_mail_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mail_id INT NOT NULL,
  user_id INT NOT NULL,
  parent_id INT DEFAULT NULL,
  content TEXT NOT NULL,
  like_count INT NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mail_id) REFERENCES school_mails(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES school_mail_comments(id) ON DELETE CASCADE,
  INDEX idx_mail_id (mail_id),
  INDEX idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학교 우편 댓글';

CREATE TABLE IF NOT EXISTS school_mail_comment_likes (
  comment_id INT NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (comment_id, user_id),
  FOREIGN KEY (comment_id) REFERENCES school_mail_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학교 우편 댓글 좋아요';

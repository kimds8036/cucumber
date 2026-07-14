-- 작성자 고정 댓글, 이니시스 인증 가입 연결
ALTER TABLE school_mail_comments
  ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT FALSE COMMENT '우편 작성자 고정 댓글',
  ADD COLUMN pinned_at DATETIME NULL COMMENT '고정 시각',
  ADD INDEX idx_school_mail_comments_pinned (mail_id, is_pinned, created_at);

ALTER TABLE comments
  ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT FALSE COMMENT '게시글 작성자 고정 댓글',
  ADD COLUMN pinned_at DATETIME NULL COMMENT '고정 시각',
  ADD INDEX idx_comments_pinned (post_id, is_pinned, created_at);

ALTER TABLE identity_verifications
  ADD COLUMN linked_user_id INT UNSIGNED NULL COMMENT '가입 시 연결된 users.id',
  ADD KEY idx_identity_linked_user (linked_user_id);

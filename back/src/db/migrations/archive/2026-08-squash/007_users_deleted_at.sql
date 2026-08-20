-- 회원 탈퇴 시각 (soft delete). 게시물 CASCADE 방지 위해 users 행은 유지.
ALTER TABLE users
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '탈퇴 처리 시각' AFTER is_deleted;

CREATE INDEX idx_users_is_deleted_deleted_at ON users (is_deleted, deleted_at);

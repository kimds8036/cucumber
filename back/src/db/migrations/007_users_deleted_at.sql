-- 회원 탈퇴 시각 (soft delete). 게시물 CASCADE 방지 위해 users 행은 유지.
-- 이미 컬럼이 있으면 환경에서는 스킵(멱등).

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'deleted_at'
);

SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT ''탈퇴 처리 시각'' AFTER is_deleted',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'idx_users_is_deleted_deleted_at'
);

SET @idx_ddl := IF(
  @idx_exists = 0,
  'CREATE INDEX idx_users_is_deleted_deleted_at ON users (is_deleted, deleted_at)',
  'SELECT 1'
);
PREPARE idx_stmt FROM @idx_ddl;
EXECUTE idx_stmt;
DEALLOCATE PREPARE idx_stmt;

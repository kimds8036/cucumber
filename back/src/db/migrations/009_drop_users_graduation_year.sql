-- users.graduation_year 제거 (가입·관리자 유추/저장 중단)

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'graduation_year'
);
SET @sql := IF(
  @col_exists > 0,
  'ALTER TABLE `users` DROP COLUMN `graduation_year`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

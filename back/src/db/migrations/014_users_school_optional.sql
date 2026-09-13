-- 가입 시 학교·학적 미선택 허용 (학생증 인앱 인증 때 설정)
-- school_id NULL 가능, FK는 SET NULL

SET @fk := (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'school_id'
    AND REFERENCED_TABLE_NAME = 'schools'
  LIMIT 1
);

SET @sql := IF(
  @fk IS NOT NULL,
  CONCAT('ALTER TABLE users DROP FOREIGN KEY `', @fk, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE users
  MODIFY COLUMN `school_id` varchar(50) COLLATE utf8mb4_unicode_ci NULL
    COMMENT '학교 ID (가입 시 미선택 가능 · 학생 인증 시 설정)';

ALTER TABLE users
  ADD CONSTRAINT `users_ibfk_1`
  FOREIGN KEY (`school_id`) REFERENCES `schools` (`school_id`)
  ON DELETE SET NULL;

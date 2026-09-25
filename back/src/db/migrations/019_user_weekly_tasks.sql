-- 019: 타이머 위클리 요일별 체크리스트
CREATE TABLE IF NOT EXISTS `user_weekly_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `week_start` char(10) NOT NULL COMMENT 'KST 월요일 YYYY-MM-DD',
  `weekday` tinyint NOT NULL COMMENT '0=월 … 6=일',
  `title` varchar(200) NOT NULL,
  `is_done` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_weekly_week` (`user_id`, `week_start`, `weekday`, `sort_order`),
  CONSTRAINT `user_weekly_tasks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='타이머 위클리 체크리스트';

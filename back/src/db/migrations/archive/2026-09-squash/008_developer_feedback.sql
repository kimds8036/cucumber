-- 회초리(개발자 피드백) 제출
CREATE TABLE IF NOT EXISTS `developer_feedback` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL COMMENT '제출 사용자 (탈퇴 시 NULL)',
  `category` enum('bug','feature','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `app_version` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_info` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dev_feedback_created` (`created_at`),
  KEY `idx_dev_feedback_user` (`user_id`),
  CONSTRAINT `fk_dev_feedback_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='회초리 피드백';

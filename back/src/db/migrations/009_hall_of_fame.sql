-- 명예의 전당 (회초리 반영 건)
CREATE TABLE IF NOT EXISTS `hall_of_fame_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `summary` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '반영 내용 요약',
  `sort_order` int NOT NULL DEFAULT '0',
  `is_published` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hof_entries_published_sort` (`is_published`,`sort_order`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='명예의 전당 카드';

CREATE TABLE IF NOT EXISTS `hall_of_fame_honorees` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entry_id` bigint unsigned NOT NULL,
  `user_id` int DEFAULT NULL COMMENT '연동 사용자',
  `display_name` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '표시 이름(마스킹)',
  `school_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '—',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_hof_honorees_entry` (`entry_id`,`sort_order`),
  CONSTRAINT `fk_hof_honorees_entry` FOREIGN KEY (`entry_id`) REFERENCES `hall_of_fame_entries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hof_honorees_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='명예의 전당 등재자';

CREATE TABLE IF NOT EXISTS `hall_of_fame_entry_feedback` (
  `entry_id` bigint unsigned NOT NULL,
  `feedback_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`entry_id`,`feedback_id`),
  KEY `idx_hof_feedback_id` (`feedback_id`),
  CONSTRAINT `fk_hof_ef_entry` FOREIGN KEY (`entry_id`) REFERENCES `hall_of_fame_entries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hof_ef_feedback` FOREIGN KEY (`feedback_id`) REFERENCES `developer_feedback` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='명예의 전당-회초리 제보 연결';

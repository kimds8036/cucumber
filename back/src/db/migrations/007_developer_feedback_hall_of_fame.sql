-- 회초리 + 명예의 전당 (008~011 통합) · 제보 묶음(groups)
-- 기존 DB: CREATE IF NOT EXISTS / ALTER 스킵 후 groups 백필·admin 컬럼 제거

CREATE TABLE IF NOT EXISTS `developer_feedback_groups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `category` enum('bug','feature','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `content` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '대표 제보 내용(최초 제보)',
  `admin_response` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '관리자 답변',
  `admin_response_status` enum('none','fixed','planned','declined') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none' COMMENT '답변 상태',
  `admin_responded_at` timestamp NULL DEFAULT NULL COMMENT '답변 시각',
  `source_feedback_id` bigint unsigned DEFAULT NULL COMMENT '마이그레이션용(백필 후 제거)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dfg_created` (`created_at`),
  KEY `idx_dfg_source_feedback` (`source_feedback_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='회초리 제보 묶음';

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

ALTER TABLE `developer_feedback`
  ADD COLUMN `honoree_name` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '명예의 전당 희망 표시 이름' AFTER `content`,
  ADD COLUMN `school_public` tinyint(1) NOT NULL DEFAULT '0' COMMENT '학교 공개 동의' AFTER `honoree_name`;

ALTER TABLE `developer_feedback`
  ADD COLUMN `admin_response` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '관리자 답변(레거시)' AFTER `school_public`,
  ADD COLUMN `admin_response_status` enum('none','fixed','planned','declined') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none' COMMENT '답변 상태(레거시)' AFTER `admin_response`,
  ADD COLUMN `admin_responded_at` timestamp NULL DEFAULT NULL COMMENT '답변 시각(레거시)' AFTER `admin_response_status`;

ALTER TABLE `developer_feedback`
  ADD COLUMN `group_id` bigint unsigned DEFAULT NULL COMMENT '제보 묶음' AFTER `id`,
  ADD KEY `idx_dev_feedback_group` (`group_id`);

INSERT INTO `developer_feedback_groups`
  (`category`, `content`, `admin_response`, `admin_response_status`, `admin_responded_at`, `created_at`, `source_feedback_id`)
SELECT
  df.`category`,
  LEFT(df.`content`, 500),
  df.`admin_response`,
  COALESCE(df.`admin_response_status`, 'none'),
  df.`admin_responded_at`,
  df.`created_at`,
  df.`id`
FROM `developer_feedback` df
WHERE df.`group_id` IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM `developer_feedback_groups` g WHERE g.`source_feedback_id` = df.`id`
  );

UPDATE `developer_feedback` df
INNER JOIN `developer_feedback_groups` g ON g.`source_feedback_id` = df.`id`
SET df.`group_id` = g.`id`
WHERE df.`group_id` IS NULL;

ALTER TABLE `developer_feedback` DROP COLUMN `admin_response`;
ALTER TABLE `developer_feedback` DROP COLUMN `admin_response_status`;
ALTER TABLE `developer_feedback` DROP COLUMN `admin_responded_at`;

ALTER TABLE `developer_feedback_groups` DROP COLUMN `source_feedback_id`;

ALTER TABLE `developer_feedback`
  MODIFY COLUMN `group_id` bigint unsigned NOT NULL COMMENT '제보 묶음';

ALTER TABLE `developer_feedback`
  ADD CONSTRAINT `fk_dev_feedback_group` FOREIGN KEY (`group_id`) REFERENCES `developer_feedback_groups` (`id`) ON DELETE CASCADE;

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

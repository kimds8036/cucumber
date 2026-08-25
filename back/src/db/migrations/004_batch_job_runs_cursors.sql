-- 크론 실행 이력 · 증분 커서 (근무표)
-- 배포 시 migrate 자동 적용. 배지 백필과는 무관.

CREATE TABLE IF NOT EXISTS `batch_job_runs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'success|skipped|failed',
  `started_at` datetime(3) NOT NULL,
  `finished_at` datetime(3) NOT NULL,
  `elapsed_ms` int unsigned NOT NULL DEFAULT '0',
  `summary_json` json DEFAULT NULL COMMENT '처리 구간·건수 요약',
  `error_message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_batch_job_runs_job_finished` (`job_name`, `finished_at`),
  KEY `idx_batch_job_runs_finished` (`finished_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='크론 실행 이력';

CREATE TABLE IF NOT EXISTS `batch_job_cursors` (
  `job_name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cursor_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_id` bigint DEFAULT NULL COMMENT '마지막으로 처리한 id (증분)',
  `last_at` datetime(3) DEFAULT NULL COMMENT '마지막 전체/구간 시각',
  `mode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'incremental|full',
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`job_name`, `cursor_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='크론 증분 커서';

-- 크론 작업 예약 (이벤트/기한 기반). 대표 cron-manager 가 claim 후 워커에 배정.

CREATE TABLE IF NOT EXISTS `cron_reservations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '워커 job_name (school-stats 등)',
  `scope_key` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'school:ID | user:ID | mail:ID | global | sweep | global:full',
  `not_before` datetime(3) NOT NULL COMMENT '이 시각 이후 실행 가능',
  `priority` smallint NOT NULL DEFAULT 0 COMMENT '높을수록 우선',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT 'pending|leased|done|cancelled|failed',
  `payload_json` json DEFAULT NULL COMMENT '선택적 부가 정보',
  `attempts` int unsigned NOT NULL DEFAULT 0,
  `lease_owner` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `leased_at` datetime(3) DEFAULT NULL,
  `last_error` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cron_reservations_job_scope` (`job_key`, `scope_key`),
  KEY `idx_cron_reservations_claim` (`status`, `not_before`, `priority`),
  KEY `idx_cron_reservations_job_status` (`job_key`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='크론 작업 예약 큐';

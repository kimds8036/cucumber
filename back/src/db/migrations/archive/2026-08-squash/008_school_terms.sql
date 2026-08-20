-- 학교별 학기 경계(개학~방학식) + 학교 휴업일. 전일 그리드가 아님.
CREATE TABLE IF NOT EXISTS `school_terms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'schools.school_id',
  `academic_year` smallint NOT NULL COMMENT '학년도(3월 시작 연도)',
  `semester` tinyint NOT NULL COMMENT '1 또는 2',
  `open_ymd` date NOT NULL COMMENT '개학일(포함)',
  `close_ymd` date DEFAULT NULL COMMENT '방학식·종업식(포함, 마지막 등교일)',
  `source` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'neis_schedule',
  `confidence` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'high' COMMENT 'high|medium|low',
  `fetched_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_school_terms_school_year_sem` (`school_id`, `academic_year`, `semester`),
  KEY `idx_school_terms_school_open` (`school_id`, `open_ymd`, `close_ymd`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학교 학기 개학·방학 경계';

CREATE TABLE IF NOT EXISTS `school_closures` (
  `school_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ymd` date NOT NULL COMMENT '휴업·휴교일',
  `reason` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'neis_schedule',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`school_id`, `ymd`),
  KEY `idx_school_closures_ymd` (`ymd`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학교별 휴업일(재량휴업 등)';

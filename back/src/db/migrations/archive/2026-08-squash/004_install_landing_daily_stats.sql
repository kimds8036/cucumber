-- /get · /install 스토어 분기 랜딩 일별 방문 집계
CREATE TABLE IF NOT EXISTS install_landing_daily_stats (
  stat_date DATE NOT NULL COMMENT 'KST 기준 일자',
  platform ENUM('ios', 'android', 'other') NOT NULL COMMENT 'UA 기반 플랫폼',
  hit_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '페이지 조회 수 (크롤러 제외)',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (stat_date, platform),
  KEY idx_install_landing_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='설치 랜딩(/get) 일별 방문 집계';

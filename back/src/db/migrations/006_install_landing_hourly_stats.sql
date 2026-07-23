-- /get 방문 시간대(KST 0–23) 일별 집계
CREATE TABLE IF NOT EXISTS install_landing_hourly_stats (
  stat_date DATE NOT NULL COMMENT 'KST 기준 일자',
  hour_kst TINYINT UNSIGNED NOT NULL COMMENT '0–23 (KST)',
  hit_count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (stat_date, hour_kst),
  KEY idx_install_landing_hourly_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='설치 랜딩(/get) 시간대별 방문 집계';

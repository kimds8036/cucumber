-- 제품 분석 일별 스냅샷 (익명 집계만 저장, 원시 이벤트 없음)

CREATE TABLE IF NOT EXISTS analytics_daily_snapshots (
  stat_date DATE NOT NULL COMMENT 'KST 기준 일자',
  dau_count BIGINT NOT NULL DEFAULT 0 COMMENT '일별 활성 사용자 (HyperLogLog 정산)',
  mau_rolling_30d_count BIGINT NOT NULL DEFAULT 0 COMMENT '롤링 30일 MAU (HyperLogLog PFMERGE)',
  heatmap_json JSON NOT NULL COMMENT '요일×시간 히트맵 (168 slots, dow*24+hour)',
  reconciled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '마지막 정산 시각',
  PRIMARY KEY (stat_date),
  INDEX idx_analytics_reconciled (reconciled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제품 분석 일별 스냅샷';

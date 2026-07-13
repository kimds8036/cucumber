-- 화면별 익명 집계 스냅샷 컬럼

ALTER TABLE analytics_daily_snapshots
  ADD COLUMN screen_stats_json JSON NULL
    COMMENT '화면별 조회수·시간대(24h) 집계'
    AFTER heatmap_json;

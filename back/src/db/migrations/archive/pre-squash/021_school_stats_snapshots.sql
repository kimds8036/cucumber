-- 학교별 집계 스냅샷 (배치 잡이 갱신). CSV 시드는 이 컬럼들을 건드리지 않음.
ALTER TABLE schools
  ADD COLUMN total_school_mails INT NOT NULL DEFAULT 0 COMMENT '학교 우편 수(집계)' AFTER total_posts,
  ADD COLUMN stats_updated_at DATETIME NULL DEFAULT NULL COMMENT '학교 통계 마지막 집계 시각' AFTER total_school_mails;

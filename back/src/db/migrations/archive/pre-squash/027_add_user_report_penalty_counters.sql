-- 사용자 제재 카운터 컬럼 추가
ALTER TABLE users
  ADD COLUMN violation_warning_count INT NOT NULL DEFAULT 0 COMMENT '신고 확정으로 인한 경고 누적',
  ADD COLUMN false_report_warning_count INT NOT NULL DEFAULT 0 COMMENT '허위 신고 경고 누적';

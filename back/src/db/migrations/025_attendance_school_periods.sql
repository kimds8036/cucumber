ALTER TABLE attendances
  ADD COLUMN school_periods_json JSON NULL COMMENT '등교 체크 시점의 교시 시각 스냅샷' AFTER status;

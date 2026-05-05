-- study_days: 집계 시 소속 학교 스냅샷 (전학 후에도 과거 일자는 기록 당시 학교 유지)
ALTER TABLE study_days
  ADD COLUMN school_id VARCHAR(50) NULL COMMENT '저장 시점 사용자 소속 학교 스냅샷' AFTER user_id,
  ADD INDEX idx_study_days_school_day (school_id, day_key),
  ADD CONSTRAINT fk_study_days_school
    FOREIGN KEY (school_id) REFERENCES schools (school_id) ON DELETE RESTRICT;

UPDATE study_days sd
INNER JOIN users u ON u.id = sd.user_id
SET sd.school_id = u.school_id
WHERE sd.school_id IS NULL;

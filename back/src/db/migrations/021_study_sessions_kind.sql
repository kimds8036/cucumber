-- 뽀모도로 휴식 구간은 공부 합계에서 빼고, 타임테이블에서만 구분한다.
ALTER TABLE study_sessions
  ADD COLUMN session_kind VARCHAR(10) NOT NULL DEFAULT 'study'
    COMMENT 'study | break'
    AFTER subject_color;

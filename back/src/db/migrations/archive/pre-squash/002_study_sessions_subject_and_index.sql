-- 공부 세션에 과목 ID 추가 (과목별 통계용)
-- (마이그레이션 재실행 시 1060 스킵)
ALTER TABLE study_sessions
  ADD COLUMN subject_id INT NULL COMMENT '과목 ID (프론트 로컬 ID)' AFTER subject_name;

-- 진행 중 세션 조회용 인덱스 (친구 공부중 상태 REST 조회)
-- (재실행 시 1061 스킵)
CREATE INDEX idx_study_sessions_open
  ON study_sessions (user_id, day_key, end_seconds);

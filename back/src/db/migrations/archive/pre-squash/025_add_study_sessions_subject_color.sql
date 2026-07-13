-- 세션 스냅샷 색상/과목명 보강: 과목 메타 유실 시에도 세션 색칠 복구 가능

ALTER TABLE study_sessions
  ADD COLUMN subject_color VARCHAR(20) NULL COMMENT '세션 시작 시점 과목 색상 스냅샷' AFTER subject_name;

CREATE INDEX idx_study_sessions_subject_color ON study_sessions (subject_color);


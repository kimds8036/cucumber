-- 타이머 정규화 1차: 과목/할일 테이블 추가 + study_sessions.subject_id 정리

CREATE TABLE IF NOT EXISTS timer_subjects (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '과목 PK',
  user_id INT NOT NULL COMMENT '사용자 ID',
  day_key DATE NOT NULL COMMENT '타이머 day key',
  name VARCHAR(100) NOT NULL COMMENT '과목명',
  color VARCHAR(20) NOT NULL COMMENT '과목 색상(hex)',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '소프트 삭제',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_timer_subjects_user_day (user_id, day_key),
  INDEX idx_timer_subjects_user_day_deleted (user_id, day_key, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='타이머 과목 정규화 테이블';

CREATE TABLE IF NOT EXISTS timer_tasks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '할일 PK',
  user_id INT NOT NULL COMMENT '사용자 ID',
  day_key DATE NOT NULL COMMENT '타이머 day key',
  subject_id BIGINT NULL COMMENT '연결 과목 ID',
  content VARCHAR(500) NOT NULL COMMENT '할일 내용',
  status ENUM('pending', 'done') NOT NULL DEFAULT 'pending' COMMENT '할일 상태',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '소프트 삭제',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_timer_tasks_user_day (user_id, day_key),
  INDEX idx_timer_tasks_subject_id (subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='타이머 할일 정규화 테이블';

-- 기존 로컬 subject_id 흔적은 FK 검증 실패를 만들 수 있어 일괄 NULL 후 타입 승격
UPDATE study_sessions
SET subject_id = NULL
WHERE subject_id IS NOT NULL;

ALTER TABLE study_sessions
  MODIFY COLUMN subject_id BIGINT NULL COMMENT '과목 ID (서버 발급 ID)';

CREATE INDEX idx_study_sessions_subject_id ON study_sessions (subject_id);

ALTER TABLE timer_tasks
  ADD CONSTRAINT fk_timer_tasks_subject
  FOREIGN KEY (subject_id) REFERENCES timer_subjects(id) ON DELETE SET NULL;

ALTER TABLE study_sessions
  ADD CONSTRAINT fk_study_sessions_subject
  FOREIGN KEY (subject_id) REFERENCES timer_subjects(id) ON DELETE SET NULL;


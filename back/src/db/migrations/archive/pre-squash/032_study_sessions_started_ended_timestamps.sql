-- study_sessions: SSOT를 KST 표기 시작/종료 시각 DATETIME 으로 전환하고 start/end_seconds 제거
-- 적용 전: 서버 시간대와 무관하게 session time_zone 에서 해석되는 DATETIME 로 백필합니다.
SET NAMES utf8mb4;
SET @OLD_TZ := @@SESSION.time_zone;
SET SESSION time_zone = '+09:00';

ALTER TABLE study_sessions
  ADD COLUMN started_at DATETIME(3) NULL COMMENT '시작 시각(KST 표기)' AFTER subject_id,
  ADD COLUMN ended_at DATETIME(3) NULL COMMENT '종료 시각(KST 표기, NULL 진행중)' AFTER started_at;

-- start_seconds/end_seconds 컬럼이 있을 때만 동작.
-- 컬럼이 이미 DROP된 상태에서 재실행되면 ER_BAD_FIELD_ERROR(1054)가 발생하지만,
-- migrate.js에서 1054를 스킵 처리하므로 멱등 보장됨.
UPDATE study_sessions SET
  started_at = TIMESTAMPADD(
    SECOND,
    start_seconds,
    STR_TO_DATE(CONCAT(day_key, ' 06:00:00'), '%Y-%m-%d %H:%i:%s')
  ),
  ended_at = CASE
    WHEN end_seconds IS NULL THEN NULL
    ELSE TIMESTAMPADD(
      SECOND,
      end_seconds,
      STR_TO_DATE(CONCAT(day_key, ' 06:00:00'), '%Y-%m-%d %H:%i:%s')
    )
  END;

ALTER TABLE study_sessions
  MODIFY started_at DATETIME(3) NOT NULL COMMENT '시작 시각(KST 표기)';

DROP INDEX idx_study_sessions_open ON study_sessions;
DROP INDEX idx_start_seconds ON study_sessions;

ALTER TABLE study_sessions
  DROP COLUMN start_seconds,
  DROP COLUMN end_seconds;

CREATE INDEX idx_study_sessions_open
  ON study_sessions (user_id, day_key, ended_at);

SET SESSION time_zone = @OLD_TZ;

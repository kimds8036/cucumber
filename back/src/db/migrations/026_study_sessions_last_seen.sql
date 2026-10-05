-- 타이머가 살아 있는 동안 클라이언트가 확인한 시각. 오래 끊긴 세션은 명단에서 뺀다.
ALTER TABLE study_sessions
  ADD COLUMN last_seen_at DATETIME(3) NULL
    COMMENT '타이머 클라이언트가 마지막으로 확인한 시각(KST)'
    AFTER ended_at;

UPDATE study_sessions
SET last_seen_at = CONVERT_TZ(UTC_TIMESTAMP(3), '+00:00', '+09:00')
WHERE ended_at IS NULL
  AND last_seen_at IS NULL;

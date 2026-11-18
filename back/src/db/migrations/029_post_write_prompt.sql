-- 가입 직후 첫 글 안내. 기존 계정은 NULL이라 안내를 보지 않는다.
ALTER TABLE user_settings
  ADD COLUMN post_write_prompt_status VARCHAR(16) NULL
    COMMENT 'pending|skipped|done'
    AFTER mail_outgoing,
  ADD COLUMN post_write_prompt_skipped_at TIMESTAMP NULL
    COMMENT '나중에 하기를 누른 시각'
    AFTER post_write_prompt_status;

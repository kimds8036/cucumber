-- 첫 글 안내 건너뜀 횟수·시각, 완료 시각, 카드 닫기.
-- 완료(done)는 한 번 기록되면 글을 지워도 되돌리지 않는다.
ALTER TABLE user_settings
  ADD COLUMN post_write_prompt_skip_count INT NOT NULL DEFAULT 0
    COMMENT '나중에 하기를 누른 횟수'
    AFTER post_write_prompt_skipped_at,
  ADD COLUMN post_write_prompt_skip_log JSON NULL
    COMMENT '건너뛴 시각 목록'
    AFTER post_write_prompt_skip_count,
  ADD COLUMN post_write_prompt_done_at TIMESTAMP NULL
    COMMENT '첫 글을 써 안내가 끝난 시각'
    AFTER post_write_prompt_skip_log,
  ADD COLUMN post_write_prompt_banner_hidden TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '건너뜀은 유지하고 게시판 카드만 숨김'
    AFTER post_write_prompt_done_at;

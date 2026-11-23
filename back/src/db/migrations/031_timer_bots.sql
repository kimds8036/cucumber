-- 타이머 친구 줄용 봇. 로그인·학교 소속·학생 게시판에는 쓰지 않는다.
ALTER TABLE users
  ADD COLUMN is_bot TINYINT(1) NOT NULL DEFAULT 0 COMMENT '타이머 표시용 봇' AFTER student_verified,
  ADD KEY idx_users_is_bot (is_bot);

-- 게시글 투표. 글당 하나, 항목 2~10개, 사용자별 선택.
CREATE TABLE IF NOT EXISTS post_polls (
  post_id INT NOT NULL COMMENT '게시글 ID',
  allow_multiple TINYINT(1) NOT NULL DEFAULT 0 COMMENT '복수 선택',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  PRIMARY KEY (post_id),
  CONSTRAINT post_polls_ibfk_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 투표';

CREATE TABLE IF NOT EXISTS post_poll_options (
  id INT NOT NULL AUTO_INCREMENT COMMENT '항목 ID',
  post_id INT NOT NULL COMMENT '게시글 ID',
  label VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '항목 문구',
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  PRIMARY KEY (id),
  KEY idx_post_poll_options_post (post_id, display_order),
  CONSTRAINT post_poll_options_ibfk_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 투표 항목';

CREATE TABLE IF NOT EXISTS post_poll_votes (
  id INT NOT NULL AUTO_INCREMENT COMMENT '투표 ID',
  option_id INT NOT NULL COMMENT '항목 ID',
  user_id INT NOT NULL COMMENT '사용자 ID',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '투표 일시',
  PRIMARY KEY (id),
  UNIQUE KEY uq_post_poll_vote_user_option (user_id, option_id),
  KEY idx_post_poll_votes_option (option_id),
  CONSTRAINT post_poll_votes_ibfk_option FOREIGN KEY (option_id) REFERENCES post_poll_options (id) ON DELETE CASCADE,
  CONSTRAINT post_poll_votes_ibfk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 투표 선택';

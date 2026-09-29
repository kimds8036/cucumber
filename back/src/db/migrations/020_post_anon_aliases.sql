-- 020: 게시글별 익명 번호 고정 발급 (작성자 제외, 재사용 없음)
ALTER TABLE posts
  ADD COLUMN anon_seq INT NOT NULL DEFAULT 0 COMMENT '익명 번호 발급 카운터 (작성자 제외)' AFTER comment_count;

CREATE TABLE IF NOT EXISTS post_anon_aliases (
  post_id INT NOT NULL COMMENT '게시글 ID',
  user_id INT NOT NULL COMMENT '유저 ID',
  anon_no INT NOT NULL COMMENT '익명 번호 (게시글 내 고정)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '최초 발급 시각',
  PRIMARY KEY (post_id, user_id),
  UNIQUE KEY uq_post_anon_no (post_id, anon_no),
  CONSTRAINT post_anon_aliases_ibfk_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT post_anon_aliases_ibfk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 익명 별칭';

-- 기존 댓글: 작성자 제외, 유저별 첫 댓글 시각 순으로 번호 부여
INSERT INTO post_anon_aliases (post_id, user_id, anon_no)
SELECT post_id, user_id,
       ROW_NUMBER() OVER (PARTITION BY post_id ORDER BY first_at, user_id) AS anon_no
FROM (
  SELECT c.post_id, c.user_id, MIN(c.created_at) AS first_at
  FROM comments c
  INNER JOIN posts p ON p.id = c.post_id
  WHERE c.user_id <> p.user_id
  GROUP BY c.post_id, c.user_id
) t;

UPDATE posts p
SET anon_seq = (
  SELECT COALESCE(MAX(a.anon_no), 0)
  FROM post_anon_aliases a
  WHERE a.post_id = p.id
);

-- 댓글에 저장된 anonymous_index도 별칭 기준으로 맞춤 (작성자=0)
UPDATE comments c
INNER JOIN posts p ON p.id = c.post_id
LEFT JOIN post_anon_aliases a
  ON a.post_id = c.post_id AND a.user_id = c.user_id
SET c.anonymous_index = CASE
  WHEN c.user_id = p.user_id THEN 0
  ELSE COALESCE(a.anon_no, c.anonymous_index)
END;

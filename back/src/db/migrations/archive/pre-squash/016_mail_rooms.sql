CREATE TABLE IF NOT EXISTS personal_mail_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '개인 우편 룸 ID',
  root_mail_id INT NOT NULL COMMENT '루트 우편 ID',
  root_author_id INT NOT NULL COMMENT '루트 작성자 ID',
  user1_id INT NOT NULL COMMENT '참여자 1 (작은 ID)',
  user2_id INT NOT NULL COMMENT '참여자 2 (큰 ID)',
  last_mail_id INT NULL COMMENT '마지막 우편 ID',
  last_mail_at TIMESTAMP NULL COMMENT '마지막 우편 시각',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '룸 생성 일시',
  UNIQUE KEY uniq_mail_room_root (root_mail_id),
  INDEX idx_mail_rooms_user1 (user1_id),
  INDEX idx_mail_rooms_user2 (user2_id),
  INDEX idx_mail_rooms_root_author (root_author_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='개인 우편 룸 테이블';

ALTER TABLE personal_mails
  ADD COLUMN room_id INT NULL DEFAULT NULL;

ALTER TABLE personal_mails
  ADD INDEX idx_personal_mails_room_id (room_id);

ALTER TABLE personal_mails
  ADD CONSTRAINT fk_personal_mails_room_id
  FOREIGN KEY (room_id) REFERENCES personal_mail_rooms(id) ON DELETE SET NULL;

INSERT INTO personal_mail_rooms (
  root_mail_id,
  root_author_id,
  user1_id,
  user2_id,
  last_mail_id,
  last_mail_at
)
SELECT
  t.thread_key AS root_mail_id,
  root_pm.sender_id AS root_author_id,
  LEAST(root_pm.sender_id, root_pm.recipient_id) AS user1_id,
  GREATEST(root_pm.sender_id, root_pm.recipient_id) AS user2_id,
  (
    SELECT pm2.id
    FROM personal_mails pm2
    WHERE COALESCE(pm2.root_mail_id, pm2.id) = t.thread_key
      AND pm2.is_deleted = FALSE
    ORDER BY pm2.created_at DESC, pm2.id DESC
    LIMIT 1
  ) AS last_mail_id,
  (
    SELECT pm3.created_at
    FROM personal_mails pm3
    WHERE COALESCE(pm3.root_mail_id, pm3.id) = t.thread_key
      AND pm3.is_deleted = FALSE
    ORDER BY pm3.created_at DESC, pm3.id DESC
    LIMIT 1
  ) AS last_mail_at
FROM (
  SELECT DISTINCT COALESCE(root_mail_id, id) AS thread_key
  FROM personal_mails
  WHERE is_deleted = FALSE
) t
JOIN personal_mails root_pm ON root_pm.id = t.thread_key
WHERE root_pm.is_deleted = FALSE;

UPDATE personal_mails pm
JOIN personal_mail_rooms mr ON mr.root_mail_id = COALESCE(pm.root_mail_id, pm.id)
SET pm.room_id = mr.id
WHERE pm.room_id IS NULL;

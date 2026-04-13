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

INSERT IGNORE INTO personal_mail_rooms (
  id,
  root_mail_id,
  root_author_id,
  user1_id,
  user2_id,
  last_mail_id,
  last_mail_at,
  created_at
)
SELECT
  id,
  root_mail_id,
  root_author_id,
  user1_id,
  user2_id,
  last_mail_id,
  last_mail_at,
  created_at
FROM mail_rooms;

ALTER TABLE personal_mails
  DROP FOREIGN KEY fk_personal_mails_room_id;

ALTER TABLE personal_mails
  ADD CONSTRAINT fk_personal_mails_room_id
  FOREIGN KEY (room_id) REFERENCES personal_mail_rooms(id) ON DELETE SET NULL;

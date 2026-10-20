-- 하루 알림: 한국 날짜당 한 번. 관리자가 보내기 전에 디코 리마인드만 기록할 수 있다.
CREATE TABLE IF NOT EXISTS daily_admin_pushes (
  day_key CHAR(10) NOT NULL COMMENT 'Asia/Seoul YYYY-MM-DD',
  sent_at TIMESTAMP NULL DEFAULT NULL,
  discord_reminded_at TIMESTAMP NULL DEFAULT NULL,
  kind VARCHAR(20) NULL COMMENT 'post | announcement | study_room',
  board_type VARCHAR(20) NULL COMMENT 'national | school',
  post_id INT NULL,
  announcement_id INT NULL,
  phrase_kind VARCHAR(20) NULL COMMENT 'popular | topic | notice | study',
  topic_label VARCHAR(30) NULL,
  title VARCHAR(120) NULL,
  body VARCHAR(200) NULL,
  admin_user_id INT NULL,
  recipient_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (day_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='관리자가 고른 하루 한 번 푸시';

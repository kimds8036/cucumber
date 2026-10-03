-- 위클리 체크리스트. 주(일~토)는 day_key 로 모으고, 계정에 남긴다.
CREATE TABLE IF NOT EXISTS timer_weekly_items (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '위클리 항목 ID',
  user_id INT NOT NULL COMMENT '사용자 ID',
  day_key DATE NOT NULL COMMENT '항목 날짜 (YYYY-MM-DD)',
  content VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '할 일 (최대 15자)',
  done TINYINT(1) NOT NULL DEFAULT 0 COMMENT '완료 여부',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (id),
  KEY idx_timer_weekly_user_day (user_id, day_key),
  CONSTRAINT timer_weekly_items_ibfk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='타이머 위클리 체크리스트';

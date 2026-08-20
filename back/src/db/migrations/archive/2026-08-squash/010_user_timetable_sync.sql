-- 사용자 시간표 override · 교시 시간 (기기 간 동기화)
CREATE TABLE IF NOT EXISTS `user_timetable_overrides` (
  `user_id` int NOT NULL COMMENT '사용자 ID',
  `timetable_json` json NOT NULL COMMENT '편집된 시간표 {월-1: 과목, ...}',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '마지막 저장 시각',
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_timetable_overrides_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 시간표 편집본';

CREATE TABLE IF NOT EXISTS `user_period_time_settings` (
  `user_id` int NOT NULL COMMENT '사용자 ID',
  `periods_json` json NOT NULL COMMENT '교시별 시작·종료 [{periodNumber,startTime,endTime},...]',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '마지막 저장 시각',
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_period_time_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 교시 시간 설정';

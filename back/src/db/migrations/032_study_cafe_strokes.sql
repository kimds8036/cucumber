-- 스터디 카페(snowmap) 방명록 그림 획.
-- 방(room_id)과 게시판 메시(board_id)마다 획을 쌓는다. 채팅은 저장하지 않는다(서버 메모리 최근 몇 줄만).
-- 번호는 develop의 031 다음으로 둔다 (029~031은 develop에서 이미 쓰임).
CREATE TABLE IF NOT EXISTS `study_cafe_strokes` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '획 ID (reports.target_id 와 맞추려고 int)',
  `room_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '카페 방 id (room-1 …)',
  `board_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '맵 안 게시판 메시 id',
  `user_id` int NOT NULL COMMENT '그린 사람 users.id',
  `color` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '#rrggbb',
  `width` smallint NOT NULL COMMENT '펜 굵기 (캔버스 논리 좌표)',
  `points` json NOT NULL COMMENT '[x0,y0,x1,y1,…] 캔버스 논리 좌표',
  `is_hidden` tinyint(1) NOT NULL DEFAULT '0' COMMENT '신고 누적·관리자 확정으로 숨김',
  `hidden_at` timestamp NULL DEFAULT NULL COMMENT '숨긴 시각',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '작성자가 지움',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '지운 시각',
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '그린 시각',
  PRIMARY KEY (`id`),
  KEY `idx_cafe_strokes_board` (`room_id`, `board_id`, `is_deleted`, `is_hidden`, `id`),
  KEY `idx_cafe_strokes_user_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_cafe_strokes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='스터디 카페 방명록 그림 획';

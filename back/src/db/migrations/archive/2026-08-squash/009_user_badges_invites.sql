-- 친구 초대 코드·초대 성사 + 대표 배지 장착/보유
ALTER TABLE users
  ADD COLUMN invite_code VARCHAR(12) NULL COMMENT '친구 초대 코드' AFTER color_id,
  ADD COLUMN equipped_badge_key VARCHAR(32) NULL COMMENT '장착 중인 배지 키' AFTER invite_code;

CREATE UNIQUE INDEX uq_users_invite_code ON users (invite_code);

CREATE TABLE IF NOT EXISTS `user_badges` (
  `user_id` int NOT NULL,
  `badge_key` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unlocked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `badge_key`),
  KEY `idx_user_badges_key` (`badge_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='유저 보유 배지';

CREATE TABLE IF NOT EXISTS `user_invites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inviter_id` int NOT NULL COMMENT '초대한 유저',
  `invitee_id` int NOT NULL COMMENT '가입한 유저',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_invites_invitee` (`invitee_id`),
  KEY `idx_user_invites_inviter` (`inviter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='친구 초대 성사';

-- 회초리: 관리자 답변
ALTER TABLE `developer_feedback`
  ADD COLUMN `admin_response` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '관리자 답변' AFTER `school_public`,
  ADD COLUMN `admin_response_status` enum('none','fixed','planned','declined') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none' COMMENT '답변 상태' AFTER `admin_response`,
  ADD COLUMN `admin_responded_at` timestamp NULL DEFAULT NULL COMMENT '답변 시각' AFTER `admin_response_status`;

-- 회초리: 명예의 전당 희망 표시명·학교 공개 동의
ALTER TABLE `developer_feedback`
  ADD COLUMN `honoree_name` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '명예의 전당 희망 표시 이름' AFTER `content`,
  ADD COLUMN `school_public` tinyint(1) NOT NULL DEFAULT '0' COMMENT '학교 공개 동의' AFTER `honoree_name`;

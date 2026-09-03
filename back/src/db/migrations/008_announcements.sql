-- 고객지원 공지사항 (관리자 작성 → 앱 목록·상세)

CREATE TABLE IF NOT EXISTS `announcements` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '제목',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '본문 (마크다운 가능)',
  `status` enum('draft','published') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft' COMMENT '초안|게시',
  `published_at` datetime DEFAULT NULL COMMENT '앱에 표시되는 게시 시각',
  `created_by_admin_id` int DEFAULT NULL COMMENT '작성 관리자 admin_users.id',
  `updated_by_admin_id` int DEFAULT NULL COMMENT '최종 수정 관리자 admin_users.id',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_announcements_status_published` (`status`, `published_at`),
  KEY `idx_announcements_created` (`created_at`),
  CONSTRAINT `fk_announcements_created_by_admin`
    FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_announcements_updated_by_admin`
    FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='고객지원 공지사항';

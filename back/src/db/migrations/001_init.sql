-- Cucumber DB 초기 스키마 (마이그레이션 스쿼시)
-- Generated: 2026-07-13T14:16:44.790Z
-- 신규 DB: migrate.js가 이 파일만 실행합니다.
-- 기존 DB: squash-baseline.js로 이력만 동기화 (DDL 미실행).

-- ── schools ──
CREATE TABLE IF NOT EXISTS `schools` (
  `school_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '학교ID (JSON 제공값)',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '학교명',
  `address` text COLLATE utf8mb4_unicode_ci COMMENT '학교 주소',
  `school_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '학교 유형 (일반고/특목고 등)',
  `region` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '지역 (시/도)',
  `total_students` int DEFAULT '0' COMMENT '총 학생 수',
  `total_posts` int DEFAULT '0' COMMENT '총 게시글 수',
  `total_school_mails` int NOT NULL DEFAULT '0' COMMENT '학교 우편 수(집계)',
  `stats_updated_at` datetime DEFAULT NULL COMMENT '학교 통계 마지막 집계 시각',
  `edu_office_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '시도교육청코드',
  `edu_office_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '시도교육청명',
  `admin_standard_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '행정표준코드',
  `jurisdiction_org_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '관할조직명',
  `road_address` text COLLATE utf8mb4_unicode_ci COMMENT '도로명주소',
  `road_address_detail` text COLLATE utf8mb4_unicode_ci COMMENT '도로명상세주소',
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '전화번호',
  `homepage_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '홈페이지주소',
  `coed_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '남녀공학구분명',
  `hs_general_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '고등학교일반전문구분명',
  `anniversary_date` date DEFAULT NULL COMMENT '개교기념일',
  `modified_date` date DEFAULT NULL COMMENT '수정일자',
  `school_level` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '학교급구분',
  `founded_date` date DEFAULT NULL COMMENT '설립일자',
  `foundation_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '설립형태',
  `main_branch` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '본교분교구분',
  `operation_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '운영상태',
  `address_lot` text COLLATE utf8mb4_unicode_ci COMMENT '소재지지번주소',
  `latitude` decimal(10,7) DEFAULT NULL COMMENT '위도',
  `longitude` decimal(10,7) DEFAULT NULL COMMENT '경도',
  PRIMARY KEY (`school_id`),
  KEY `idx_name` (`name`),
  KEY `idx_region` (`region`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학교 정보 테이블';

-- ── colors ──
CREATE TABLE IF NOT EXISTS `colors` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '컬러 ID',
  `hex_code` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'HEX 색상 코드',
  `color_number` int NOT NULL COMMENT '컬러 번호',
  PRIMARY KEY (`id`),
  UNIQUE KEY `hex_code` (`hex_code`),
  UNIQUE KEY `color_number` (`color_number`),
  KEY `idx_color_number` (`color_number`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로필 컬러 테이블';

-- ── admin_users ──
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '관리자 ID',
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '관리자 로그인 ID',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '암호화된 비밀번호',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '관리자 표시명',
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'moderator' COMMENT 'super|moderator|support|verifier',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '비활성(삭제) 여부',
  `last_login_at` timestamp NULL DEFAULT NULL COMMENT '마지막 로그인',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_admin_users_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='관리자 전용 계정 (앱 users 와 분리)';

-- ── users ──
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '사용자 ID',
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '사용자명 (로그인 ID)',
  `name_enc` text COLLATE utf8mb4_unicode_ci COMMENT 'AES-256-GCM 실명',
  `name_lookup` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'HMAC 실명 lookup',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '암호화된 비밀번호',
  `phone_enc` text COLLATE utf8mb4_unicode_ci COMMENT 'AES-256-GCM 전화번호',
  `phone_lookup` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'HMAC 전화 lookup',
  `birth_date_enc` text COLLATE utf8mb4_unicode_ci COMMENT 'AES-256-GCM 생년월일 YYYY-MM-DD',
  `school_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '학교 ID',
  `grade` tinyint NOT NULL COMMENT '학년 (1-3)',
  `class_number` tinyint NOT NULL COMMENT '반 번호',
  `graduation_year` int NOT NULL COMMENT '졸업년도',
  `is_graduated` tinyint(1) DEFAULT '0' COMMENT '졸업 여부',
  `is_deleted` tinyint(1) DEFAULT '0' COMMENT '탈퇴 여부',
  `color_id` int NOT NULL COMMENT '프로필 컬러 ID',
  `phone_verified` tinyint(1) DEFAULT '0' COMMENT '전화번호 인증 여부',
  `student_verified` tinyint(1) DEFAULT '0' COMMENT '학생 인증 여부',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '가입 일시',
  `violation_warning_count` int NOT NULL DEFAULT '0' COMMENT '신고 확정으로 인한 경고 누적',
  `false_report_warning_count` int NOT NULL DEFAULT '0' COMMENT '허위 신고 경고 누적',
  `is_suspended` tinyint(1) NOT NULL DEFAULT '0' COMMENT '임시 정지 여부',
  `suspended_until` timestamp NULL DEFAULT NULL COMMENT '임시 정지 해제 시각',
  `is_banned` tinyint(1) NOT NULL DEFAULT '0' COMMENT '영구 정지 여부',
  `is_whitelisted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '화이트리스트 여부',
  `is_shadow_muted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '관리자 섀도우 뮤트(작성물 상대에게 비표시)',
  `token_version` int NOT NULL DEFAULT '0' COMMENT 'JWT 무효화 버전',
  `reverification_status` enum('none','grace','required','restricted','graduated_blocked','adult_blocked') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none' COMMENT '3/1 재인증·졸업·성인 차단 상태',
  `reverification_deadline` date DEFAULT NULL COMMENT '재인증 유예 종료일',
  `previous_school_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '중→고 전환 시 이전 중학교',
  `grade_exception` tinyint(1) NOT NULL DEFAULT '0' COMMENT '생년월일 기대 학년 불일치 허용',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `idx_users_phone_lookup` (`phone_lookup`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_color_id` (`color_id`),
  KEY `idx_username` (`username`),
  KEY `fk_users_previous_school` (`previous_school_id`),
  KEY `idx_users_name_lookup` (`name_lookup`),
  CONSTRAINT `fk_users_previous_school` FOREIGN KEY (`previous_school_id`) REFERENCES `schools` (`school_id`) ON DELETE SET NULL,
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`school_id`) ON DELETE RESTRICT,
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`color_id`) REFERENCES `colors` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 정보 테이블';

-- ── timer_subjects ──
CREATE TABLE IF NOT EXISTS `timer_subjects` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '과목 PK',
  `user_id` int NOT NULL COMMENT '사용자 ID',
  `day_key` date NOT NULL COMMENT '타이머 day key',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '과목명',
  `color` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '과목 색상(hex)',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '소프트 삭제',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (`id`),
  KEY `idx_timer_subjects_user_day` (`user_id`,`day_key`),
  KEY `idx_timer_subjects_user_day_deleted` (`user_id`,`day_key`,`is_deleted`),
  CONSTRAINT `timer_subjects_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='타이머 과목 정규화 테이블';

-- ── tags ──
CREATE TABLE IF NOT EXISTS `tags` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '태그 ID',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '해시태그 이름 (예: #중간고사)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '태그 생성 일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_tag_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 해시태그 테이블';

-- ── posts ──
CREATE TABLE IF NOT EXISTS `posts` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '게시글 ID',
  `user_id` int NOT NULL COMMENT '작성자 ID',
  `board_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '게시판 유형 (national/school)',
  `school_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '학교 ID (학교 게시판인 경우)',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '게시글 내용',
  `latitude` decimal(10,7) DEFAULT NULL COMMENT '작성 시점 위도',
  `longitude` decimal(10,7) DEFAULT NULL COMMENT '작성 시점 경도',
  `like_count` int DEFAULT '0' COMMENT '좋아요 수',
  `comment_count` int DEFAULT '0' COMMENT '댓글 수',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '작성 일시',
  `is_deleted` tinyint(1) DEFAULT '0' COMMENT '삭제 여부',
  `is_hidden` tinyint(1) NOT NULL DEFAULT '0' COMMENT '신고 누적 등으로 숨김 처리 여부',
  `hidden_reason` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '숨김 사유 (REPORT_THRESHOLD/ADMIN)',
  `hidden_at` timestamp NULL DEFAULT NULL COMMENT '숨김 처리 시각',
  `hidden_by_report_count` int NOT NULL DEFAULT '0' COMMENT '숨김 시점 누적 신고 수',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_board_type` (`board_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_posts_is_hidden_created_at` (`is_hidden`,`created_at`),
  CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `posts_ibfk_2` FOREIGN KEY (`school_id`) REFERENCES `schools` (`school_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 테이블';

-- ── comments ──
CREATE TABLE IF NOT EXISTS `comments` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '댓글 ID',
  `post_id` int NOT NULL COMMENT '게시글 ID',
  `user_id` int NOT NULL COMMENT '작성자 ID',
  `parent_comment_id` int DEFAULT NULL COMMENT '부모 댓글 ID (대댓글)',
  `content` text COLLATE utf8mb4_unicode_ci,
  `anonymous_index` tinyint NOT NULL COMMENT '익명 번호 (익명1, 익명2 등)',
  `like_count` int DEFAULT '0' COMMENT '좋아요 수',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '작성 일시',
  `is_deleted` tinyint(1) DEFAULT '0' COMMENT '삭제 여부',
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0' COMMENT '게시글 작성자 고정 댓글',
  `pinned_at` datetime DEFAULT NULL COMMENT '고정 시각',
  PRIMARY KEY (`id`),
  KEY `idx_post_id` (`post_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_parent_comment_id` (`parent_comment_id`),
  KEY `idx_comments_pinned` (`post_id`,`is_pinned`,`created_at`),
  CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comments_ibfk_3` FOREIGN KEY (`parent_comment_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='댓글 테이블';

-- ── message_rooms ──
CREATE TABLE IF NOT EXISTS `message_rooms` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '채팅방 ID',
  `post_id` int NOT NULL COMMENT '게시글 ID',
  `user1_id` int NOT NULL COMMENT '참여자 1',
  `user2_id` int NOT NULL COMMENT '참여자 2',
  `last_message` text COLLATE utf8mb4_unicode_ci COMMENT '마지막 메시지 내용',
  `last_message_at` timestamp NULL DEFAULT NULL COMMENT '마지막 메시지 시각',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '채팅방 생성 일시',
  `is_deleted_by_user1` tinyint(1) DEFAULT '0',
  `is_deleted_by_user2` tinyint(1) DEFAULT '0',
  `deleted_at_msg_id_user1` int DEFAULT NULL,
  `deleted_at_msg_id_user2` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_post_users` (`post_id`,`user1_id`,`user2_id`),
  KEY `idx_user1_id` (`user1_id`),
  KEY `idx_user2_id` (`user2_id`),
  KEY `idx_last_message_at` (`last_message_at`),
  CONSTRAINT `message_rooms_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `message_rooms_ibfk_2` FOREIGN KEY (`user1_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `message_rooms_ibfk_3` FOREIGN KEY (`user2_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='쪽지 채팅방 테이블';

-- ── messages ──
CREATE TABLE IF NOT EXISTS `messages` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '메시지 ID',
  `room_id` int NOT NULL COMMENT '채팅방 ID',
  `sender_id` int NOT NULL COMMENT '발신자 ID',
  `parent_message_id` int DEFAULT NULL COMMENT '답장 대상 메시지 ID',
  `content` text COLLATE utf8mb4_unicode_ci,
  `is_read` tinyint(1) DEFAULT '0' COMMENT '읽음 여부',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '발송 일시',
  `is_deleted` tinyint(1) DEFAULT '0',
  `is_shadow_blocked` tinyint(1) NOT NULL DEFAULT '0',
  `shadow_blocked_for_user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_room_id` (`room_id`),
  KEY `idx_sender_id` (`sender_id`),
  KEY `idx_parent_message_id` (`parent_message_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_messages_shadow_blocked_for_user` (`shadow_blocked_for_user_id`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `message_rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`parent_message_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='쪽지 메시지 테이블';

-- ── personal_mail_rooms ──
CREATE TABLE IF NOT EXISTS `personal_mail_rooms` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '개인 우편 룸 ID',
  `root_mail_id` int NOT NULL COMMENT '루트 우편 ID',
  `root_author_id` int NOT NULL COMMENT '루트 작성자 ID',
  `user1_id` int NOT NULL COMMENT '참여자 1 (작은 ID)',
  `user2_id` int NOT NULL COMMENT '참여자 2 (큰 ID)',
  `last_mail_id` int DEFAULT NULL COMMENT '마지막 우편 ID',
  `last_mail_at` timestamp NULL DEFAULT NULL COMMENT '마지막 우편 시각',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '룸 생성 일시',
  `is_deleted_by_user1` tinyint(1) DEFAULT '0',
  `is_deleted_by_user2` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_mail_room_root` (`root_mail_id`),
  KEY `idx_mail_rooms_user1` (`user1_id`),
  KEY `idx_mail_rooms_user2` (`user2_id`),
  KEY `idx_mail_rooms_root_author` (`root_author_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='개인 우편 룸 테이블';

-- ── personal_mails ──
CREATE TABLE IF NOT EXISTS `personal_mails` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '개인 우편 ID',
  `sender_id` int NOT NULL COMMENT '발신자 ID',
  `recipient_id` int DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '우편 내용',
  `is_deleted` tinyint(1) DEFAULT '0' COMMENT '삭제 여부',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '발송 일시',
  `parent_mail_id` int DEFAULT NULL,
  `root_mail_id` int DEFAULT NULL,
  `room_id` int DEFAULT NULL,
  `is_shadow_blocked` tinyint(1) NOT NULL DEFAULT '0',
  `shadow_blocked_for_user_id` int DEFAULT NULL,
  `status` enum('sent','read','returned') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sent',
  `is_match_failed` tinyint(1) NOT NULL DEFAULT '0',
  `recipient_school_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recipient_grade` tinyint DEFAULT NULL,
  `recipient_class_num` tinyint DEFAULT NULL,
  `recipient_name_enc` text COLLATE utf8mb4_unicode_ci COMMENT 'AES-256-GCM 수신자 실명 스냅샷',
  `recipient_name_lookup` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'HMAC 실명 lookup',
  `recipient_user_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `returned_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sender_id` (`sender_id`),
  KEY `idx_recipient_id` (`recipient_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_personal_mails_root_mail_id` (`root_mail_id`),
  KEY `idx_personal_mails_parent_mail_id` (`parent_mail_id`),
  KEY `idx_personal_mails_room_id` (`room_id`),
  KEY `idx_personal_mails_shadow_blocked_for_user` (`shadow_blocked_for_user_id`),
  KEY `idx_personal_mails_recipient_name_lookup` (`recipient_name_lookup`),
  CONSTRAINT `fk_personal_mails_room_id` FOREIGN KEY (`room_id`) REFERENCES `personal_mail_rooms` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `personal_mails_ibfk_10` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_100` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_101` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_102` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_103` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_104` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_105` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_106` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_107` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_108` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_109` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_11` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_110` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_111` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_112` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_113` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_114` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_115` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_116` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_117` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_118` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_119` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_12` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_120` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_121` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_122` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_123` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_124` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_125` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_126` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_127` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_128` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_129` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_13` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_130` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_131` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_132` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_133` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_134` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_135` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_136` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_137` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_138` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_139` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_14` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_140` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_141` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_142` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_143` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_144` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_145` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_146` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_147` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_148` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_149` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_15` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_150` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_151` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_152` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_153` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_154` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_155` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_156` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_157` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_158` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_159` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_16` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_160` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_161` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_162` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_163` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_164` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_165` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_166` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_167` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_168` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_169` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_17` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_170` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_171` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_172` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_173` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_174` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_175` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_176` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_177` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_178` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_179` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_18` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_180` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_19` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_2` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `personal_mails_ibfk_20` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_21` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_22` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_23` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_24` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_25` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_26` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_27` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_28` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_29` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_3` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_30` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_31` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_32` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_33` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_34` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_35` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_36` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_37` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_38` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_39` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_4` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_40` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_41` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_42` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_43` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_44` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_45` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_46` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_47` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_48` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_49` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_5` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_50` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_51` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_52` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_53` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_54` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_55` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_56` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_57` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_58` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_59` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_6` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_60` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_61` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_62` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_63` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_64` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_65` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_66` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_67` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_68` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_69` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_7` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_70` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_71` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_72` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_73` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_74` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_75` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_76` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_77` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_78` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_79` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_8` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_80` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_81` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_82` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_83` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_84` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_85` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_86` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_87` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_88` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_89` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_9` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_90` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_91` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_92` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_93` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_94` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_95` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_96` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_97` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_98` FOREIGN KEY (`root_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_mails_ibfk_99` FOREIGN KEY (`parent_mail_id`) REFERENCES `personal_mails` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='개인 우편 테이블';

-- ── school_mails ──
CREATE TABLE IF NOT EXISTS `school_mails` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '학교 우편 ID',
  `school_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '학교 ID',
  `user_id` int NOT NULL COMMENT '작성자 ID',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '우편 내용',
  `comment_count` int DEFAULT '0' COMMENT '댓글 수',
  `like_count` int NOT NULL DEFAULT '0' COMMENT '좋아요 수',
  `is_deleted` tinyint(1) DEFAULT '0' COMMENT '삭제 여부',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '발송 일시',
  `author_school_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '작성 시점 작성자 학교',
  PRIMARY KEY (`id`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `school_mails_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`school_id`) ON DELETE CASCADE,
  CONSTRAINT `school_mails_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학교 우편 테이블';

-- ── school_mail_likes ──
CREATE TABLE IF NOT EXISTS `school_mail_likes` (
  `mail_id` int NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`mail_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `school_mail_likes_ibfk_1` FOREIGN KEY (`mail_id`) REFERENCES `school_mails` (`id`) ON DELETE CASCADE,
  CONSTRAINT `school_mail_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학교 우편 좋아요';

-- ── school_mail_comments ──
CREATE TABLE IF NOT EXISTS `school_mail_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mail_id` int NOT NULL,
  `user_id` int NOT NULL,
  `parent_id` int DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `like_count` int NOT NULL DEFAULT '0',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `author_school_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '작성 시점 작성자 학교',
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0' COMMENT '우편 작성자 고정 댓글',
  `pinned_at` datetime DEFAULT NULL COMMENT '고정 시각',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_mail_id` (`mail_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_school_mail_comments_pinned` (`mail_id`,`is_pinned`,`created_at`),
  CONSTRAINT `school_mail_comments_ibfk_1` FOREIGN KEY (`mail_id`) REFERENCES `school_mails` (`id`) ON DELETE CASCADE,
  CONSTRAINT `school_mail_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `school_mail_comments_ibfk_3` FOREIGN KEY (`parent_id`) REFERENCES `school_mail_comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학교 우편 댓글';

-- ── school_mail_comment_likes ──
CREATE TABLE IF NOT EXISTS `school_mail_comment_likes` (
  `comment_id` int NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`comment_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `school_mail_comment_likes_ibfk_1` FOREIGN KEY (`comment_id`) REFERENCES `school_mail_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `school_mail_comment_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학교 우편 댓글 좋아요';

-- ── dm_rooms ──
CREATE TABLE IF NOT EXISTS `dm_rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user1_id` int NOT NULL,
  `user2_id` int NOT NULL,
  `last_message` text,
  `last_message_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted_by_user1` tinyint(1) DEFAULT '0',
  `is_deleted_by_user2` tinyint(1) DEFAULT '0',
  `deleted_at_msg_id_user1` int DEFAULT NULL,
  `deleted_at_msg_id_user2` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dm_pair` (`user1_id`,`user2_id`),
  KEY `user2_id` (`user2_id`),
  CONSTRAINT `dm_rooms_ibfk_1` FOREIGN KEY (`user1_id`) REFERENCES `users` (`id`),
  CONSTRAINT `dm_rooms_ibfk_2` FOREIGN KEY (`user2_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── dm_messages ──
CREATE TABLE IF NOT EXISTS `dm_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `content` text,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `parent_message_id` int DEFAULT NULL COMMENT '답장 대상 메시지 ID',
  `is_shadow_blocked` tinyint(1) NOT NULL DEFAULT '0',
  `shadow_blocked_for_user_id` int DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `room_id` (`room_id`),
  KEY `sender_id` (`sender_id`),
  KEY `parent_message_id` (`parent_message_id`),
  KEY `idx_dm_messages_shadow_blocked_for_user` (`shadow_blocked_for_user_id`),
  CONSTRAINT `dm_messages_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `dm_rooms` (`id`),
  CONSTRAINT `dm_messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`),
  CONSTRAINT `dm_messages_ibfk_3` FOREIGN KEY (`parent_message_id`) REFERENCES `dm_messages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── phone_verifications ──
CREATE TABLE IF NOT EXISTS `phone_verifications` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '인증 ID',
  `phone_enc` text COLLATE utf8mb4_unicode_ci COMMENT 'AES-256-GCM',
  `phone_lookup` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'HMAC lookup',
  `verification_code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '인증 코드',
  `is_verified` tinyint(1) DEFAULT '0' COMMENT '인증 완료 여부',
  `expires_at` timestamp NOT NULL COMMENT '만료 일시',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  PRIMARY KEY (`id`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_phone_verifications_lookup` (`phone_lookup`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='전화번호 인증 테이블';

-- ── user_devices ──
CREATE TABLE IF NOT EXISTS `user_devices` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '디바이스 ID',
  `user_id` int NOT NULL COMMENT '사용자 ID',
  `device_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '디바이스 고유 ID',
  `device_info` text COLLATE utf8mb4_unicode_ci COMMENT '디바이스 정보 (User-Agent 등)',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP 주소',
  `last_login_at` timestamp NULL DEFAULT NULL COMMENT '마지막 로그인 일시',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_device_id` (`device_id`),
  KEY `idx_user_device` (`user_id`,`device_id`),
  CONSTRAINT `user_devices_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 디바이스 정보 테이블';

-- ── post_likes ──
CREATE TABLE IF NOT EXISTS `post_likes` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '좋아요 ID',
  `user_id` int NOT NULL COMMENT '사용자 ID',
  `post_id` int NOT NULL COMMENT '게시글 ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '좋아요 일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_post` (`user_id`,`post_id`),
  KEY `idx_post_id` (`post_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `post_likes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_likes_ibfk_2` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 좋아요 테이블';

-- ── comment_likes ──
CREATE TABLE IF NOT EXISTS `comment_likes` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '좋아요 ID',
  `user_id` int NOT NULL COMMENT '사용자 ID',
  `comment_id` int NOT NULL COMMENT '댓글 ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '좋아요 일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_comment` (`user_id`,`comment_id`),
  KEY `idx_comment_id` (`comment_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `comment_likes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comment_likes_ibfk_2` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='댓글 좋아요 테이블';

-- ── post_tags ──
CREATE TABLE IF NOT EXISTS `post_tags` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '게시글-태그 매핑 ID',
  `post_id` int NOT NULL COMMENT '게시글 ID',
  `tag_id` int NOT NULL COMMENT '태그 ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '매핑 생성 일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_post_tag` (`post_id`,`tag_id`),
  KEY `idx_post_id` (`post_id`),
  KEY `idx_tag_id` (`tag_id`),
  CONSTRAINT `post_tags_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글-태그 매핑 테이블';

-- ── reports ──
CREATE TABLE IF NOT EXISTS `reports` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '신고 ID',
  `reporter_id` int NOT NULL COMMENT '신고자 ID',
  `target_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '신고 대상 타입 (post/comment)',
  `target_id` int NOT NULL COMMENT '신고 대상 ID',
  `reported_user_id` int DEFAULT NULL COMMENT '신고 대상 콘텐츠 작성자 users.id',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '신고 사유',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '신고 상세 내용',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '신고 상태 (pending/processing/resolved/rejected)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '신고 일시',
  `reviewed_by` int DEFAULT NULL COMMENT '검토 관리자 사용자 ID',
  `reviewed_at` timestamp NULL DEFAULT NULL COMMENT '검토 완료 시각',
  `review_note` text COLLATE utf8mb4_unicode_ci COMMENT '검토 메모',
  `is_malicious` tinyint(1) NOT NULL DEFAULT '0' COMMENT '허위/악의 신고 여부',
  `penalty_applied` tinyint(1) NOT NULL DEFAULT '0' COMMENT '신고자 패널티 반영 여부',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_reporter_target` (`reporter_id`,`target_type`,`target_id`),
  KEY `idx_reporter_id` (`reporter_id`),
  KEY `idx_target` (`target_type`,`target_id`),
  KEY `idx_status` (`status`),
  KEY `idx_reports_target_status_created_at` (`target_type`,`target_id`,`status`,`created_at`),
  KEY `idx_reports_status_created_at` (`status`,`created_at`),
  KEY `idx_reports_reviewed_by` (`reviewed_by`),
  KEY `fk_reports_reported_user` (`reported_user_id`),
  KEY `idx_reports_reporter_reported_user` (`reporter_id`,`reported_user_id`),
  CONSTRAINT `fk_reports_reported_user` FOREIGN KEY (`reported_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reports_reviewed_by_users` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='신고 테이블';

-- ── ocr_verifications ──
CREATE TABLE IF NOT EXISTS `ocr_verifications` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'OCR 인증 ID',
  `user_id` int NOT NULL COMMENT '사용자 ID',
  `image_url` text COLLATE utf8mb4_unicode_ci COMMENT '학생증 이미지 URL',
  `extracted_data` json DEFAULT NULL COMMENT 'OCR 추출 데이터',
  `is_verified` tinyint(1) DEFAULT '0' COMMENT '인증 완료 여부',
  `verified_by` int DEFAULT NULL COMMENT '인증 처리자 ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_verified` (`is_verified`),
  CONSTRAINT `ocr_verifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OCR 학생증 인증 테이블';

-- ── user_friendships ──
CREATE TABLE IF NOT EXISTS `user_friendships` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '친구 관계 ID',
  `requester_id` int NOT NULL COMMENT '친구 요청자 ID',
  `addressee_id` int NOT NULL COMMENT '친구 요청 대상자 ID',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '상태 (pending/accepted/rejected)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '요청 일시',
  `responded_at` timestamp NULL DEFAULT NULL COMMENT '응답 일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_friend_pair` (`requester_id`,`addressee_id`),
  KEY `idx_requester_id` (`requester_id`),
  KEY `idx_addressee_id` (`addressee_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `user_friendships_ibfk_1` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_friendships_ibfk_2` FOREIGN KEY (`addressee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 친구 관계 테이블';

-- ── user_blocks ──
CREATE TABLE IF NOT EXISTS `user_blocks` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '차단 ID',
  `user_id` int NOT NULL COMMENT '차단한 사용자 ID',
  `blocked_user_id` int NOT NULL COMMENT '차단된 사용자 ID',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '차단 사유',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '차단 일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_block_pair` (`user_id`,`blocked_user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_blocked_user_id` (`blocked_user_id`),
  CONSTRAINT `user_blocks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_blocks_ibfk_2` FOREIGN KEY (`blocked_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 차단 테이블';

-- ── notifications ──
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '알림 ID',
  `user_id` int NOT NULL COMMENT '알림을 받는 사용자 ID',
  `type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '알림 타입 (like/comment/mail/system 등)',
  `category` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '알림 카테고리 (post/mail/system 등)',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '알림 제목',
  `body` text COLLATE utf8mb4_unicode_ci COMMENT '알림 내용',
  `related_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '연관 리소스 타입 (post/comment/mail 등)',
  `related_id` int DEFAULT NULL COMMENT '연관 리소스 ID',
  `is_read` tinyint(1) DEFAULT '0' COMMENT '읽음 여부',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '알림 생성 일시',
  `read_at` timestamp NULL DEFAULT NULL COMMENT '읽은 시각',
  `watchers_json` json DEFAULT NULL COMMENT 'study summary 대기자 목록(JSON)',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_related` (`related_type`,`related_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='알림 테이블';

-- ── user_settings ──
CREATE TABLE IF NOT EXISTS `user_settings` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '설정 ID',
  `user_id` int NOT NULL COMMENT '사용자 ID',
  `push_enabled` tinyint(1) DEFAULT '1' COMMENT '푸시 알림 전체 사용 여부',
  `new_post` tinyint(1) DEFAULT '1' COMMENT '새 게시글 알림',
  `new_comment` tinyint(1) DEFAULT '1' COMMENT '댓글 알림',
  `new_like` tinyint(1) DEFAULT '0' COMMENT '좋아요 알림',
  `announcement` tinyint(1) DEFAULT '1' COMMENT '공지사항 알림',
  `board_distance_km` tinyint unsigned DEFAULT '10' COMMENT '게시판 거리 설정 (km, 1~100)',
  `last_username_change_at` timestamp NULL DEFAULT NULL COMMENT '마지막 아이디 변경 일시',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '설정 생성 일시',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '설정 수정 일시',
  `friend_request` tinyint(1) DEFAULT '1' COMMENT '친구 요청 알림',
  `mail_outgoing` tinyint(1) DEFAULT '1' COMMENT '우편 발신 알림',
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_board_distance` (`board_distance_km`),
  CONSTRAINT `user_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 환경 설정 테이블';

-- ── study_days ──
CREATE TABLE IF NOT EXISTS `study_days` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '공부 일별 집계 ID',
  `user_id` int NOT NULL COMMENT '사용자 ID',
  `school_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '저장 시점 사용자 소속 학교 스냅샷',
  `day_key` date NOT NULL COMMENT '날짜 (YYYY-MM-DD)',
  `total_elapsed_ms` bigint NOT NULL DEFAULT '0' COMMENT '해당 날짜 총 공부 시간(ms)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_day` (`user_id`,`day_key`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_day_key` (`day_key`),
  KEY `idx_study_days_school_day` (`school_id`,`day_key`),
  CONSTRAINT `fk_study_days_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`school_id`) ON DELETE RESTRICT,
  CONSTRAINT `study_days_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공부 타이머 일별 집계 테이블';

-- ── study_sessions ──
CREATE TABLE IF NOT EXISTS `study_sessions` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '공부 세션 ID',
  `user_id` int NOT NULL COMMENT '사용자 ID',
  `day_key` date NOT NULL COMMENT '날짜 (YYYY-MM-DD)',
  `subject_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '과목명 (NULL이면 전체 공부)',
  `subject_color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '세션 시작 시점 과목 색상 스냅샷',
  `subject_id` bigint DEFAULT NULL COMMENT '과목 ID (서버 발급 ID)',
  `started_at` datetime(3) NOT NULL COMMENT '시작 시각(KST 표기)',
  `ended_at` datetime(3) DEFAULT NULL COMMENT '종료 시각(KST 표기, NULL 진행중)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  PRIMARY KEY (`id`),
  KEY `idx_user_day` (`user_id`,`day_key`),
  KEY `idx_subject_name` (`subject_name`),
  KEY `idx_study_sessions_subject_id` (`subject_id`),
  KEY `idx_study_sessions_subject_color` (`subject_color`),
  KEY `idx_study_sessions_open` (`user_id`,`day_key`,`ended_at`),
  CONSTRAINT `fk_study_sessions_subject` FOREIGN KEY (`subject_id`) REFERENCES `timer_subjects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `study_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공부 타이머 세션 테이블';

-- ── post_images ──
CREATE TABLE IF NOT EXISTS `post_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `cloudinary_url` varchar(500) NOT NULL,
  `cloudinary_public_id` varchar(255) NOT NULL,
  `display_order` tinyint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_post_id` (`post_id`),
  CONSTRAINT `post_images_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── message_images ──
CREATE TABLE IF NOT EXISTS `message_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `cloudinary_url` varchar(500) NOT NULL,
  `cloudinary_public_id` varchar(255) NOT NULL,
  `display_order` tinyint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_message_id` (`message_id`),
  CONSTRAINT `message_images_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── comment_images ──
CREATE TABLE IF NOT EXISTS `comment_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comment_id` int NOT NULL,
  `cloudinary_url` varchar(500) NOT NULL,
  `cloudinary_public_id` varchar(255) NOT NULL,
  `display_order` tinyint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_comment_id` (`comment_id`),
  CONSTRAINT `comment_images_ibfk_1` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── dm_message_images ──
CREATE TABLE IF NOT EXISTS `dm_message_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dm_message_id` int NOT NULL,
  `cloudinary_url` varchar(500) NOT NULL,
  `cloudinary_public_id` varchar(255) NOT NULL,
  `display_order` tinyint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_dm_message_id` (`dm_message_id`),
  CONSTRAINT `dm_message_images_ibfk_1` FOREIGN KEY (`dm_message_id`) REFERENCES `dm_messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── post_scraps ──
CREATE TABLE IF NOT EXISTS `post_scraps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `post_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_scrap` (`user_id`,`post_id`),
  KEY `post_id` (`post_id`),
  CONSTRAINT `post_scraps_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_scraps_ibfk_2` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── timer_tasks ──
CREATE TABLE IF NOT EXISTS `timer_tasks` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '할일 PK',
  `user_id` int NOT NULL COMMENT '사용자 ID',
  `day_key` date NOT NULL COMMENT '타이머 day key',
  `subject_id` bigint DEFAULT NULL COMMENT '연결 과목 ID',
  `content` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '할일 내용',
  `status` enum('pending','done') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '할일 상태',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '소프트 삭제',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (`id`),
  KEY `idx_timer_tasks_user_day` (`user_id`,`day_key`),
  KEY `idx_timer_tasks_subject_id` (`subject_id`),
  CONSTRAINT `fk_timer_tasks_subject` FOREIGN KEY (`subject_id`) REFERENCES `timer_subjects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `timer_tasks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='타이머 할일 정규화 테이블';

-- ── report_appeals ──
CREATE TABLE IF NOT EXISTS `report_appeals` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '이의신청 ID',
  `post_id` int NOT NULL COMMENT '이의신청 대상 게시글 ID',
  `appellant_id` int NOT NULL COMMENT '이의신청자(게시글 작성자) 사용자 ID',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '소명 내용',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '처리 상태 (pending/accepted/rejected)',
  `review_note` text COLLATE utf8mb4_unicode_ci COMMENT '검토 메모',
  `reviewed_by` int DEFAULT NULL COMMENT '검토 관리자 사용자 ID',
  `reviewed_at` timestamp NULL DEFAULT NULL COMMENT '검토 완료 시각',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시각',
  PRIMARY KEY (`id`),
  KEY `reviewed_by` (`reviewed_by`),
  KEY `idx_report_appeals_post_id` (`post_id`),
  KEY `idx_report_appeals_appellant_status` (`appellant_id`,`status`),
  KEY `idx_report_appeals_status_created_at` (`status`,`created_at`),
  CONSTRAINT `report_appeals_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `report_appeals_ibfk_2` FOREIGN KEY (`appellant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `report_appeals_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='숨김 게시글 이의신청 테이블';

-- ── admin_audit_logs ──
CREATE TABLE IF NOT EXISTS `admin_audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '관리자 로그 ID',
  `admin_user_id` int NOT NULL COMMENT '관리자 사용자 ID',
  `action_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '액션 타입(report_confirm/report_reject/appeal_update/user_suspend/user_ban/user_whitelist)',
  `target_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '대상 타입(report/appeal/user)',
  `target_id` int NOT NULL COMMENT '대상 ID',
  `note` text COLLATE utf8mb4_unicode_ci COMMENT '관리자 메모',
  `extra` json DEFAULT NULL COMMENT '부가 데이터',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시각',
  PRIMARY KEY (`id`),
  KEY `idx_admin_audit_created_at` (`created_at`),
  KEY `idx_admin_audit_target` (`target_type`,`target_id`),
  KEY `idx_admin_audit_action_type` (`action_type`),
  KEY `fk_admin_audit_admin_user` (`admin_user_id`),
  CONSTRAINT `fk_admin_audit_admin_user` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='관리자 감사 로그';

-- ── fcm_tokens ──
CREATE TABLE IF NOT EXISTS `fcm_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(255) NOT NULL,
  `device_type` enum('ios','android') DEFAULT NULL,
  `app_version` varchar(30) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `device_id` varchar(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fcm_tokens_token` (`token`),
  UNIQUE KEY `uq_fcm_tokens_user_device` (`user_id`,`device_id`),
  KEY `idx_fcm_tokens_user_active` (`user_id`,`is_active`),
  CONSTRAINT `fk_fcm_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── inquiries ──
CREATE TABLE IF NOT EXISTS `inquiries` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '문의 ID',
  `user_id` int DEFAULT NULL COMMENT '작성자 사용자 ID (비로그인 문의는 NULL)',
  `contact_username` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '비로그인 본인 식별용 username (입력값)',
  `contact_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '답변 수신용 이메일 (선택)',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '문의 본문',
  `app_version` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '앱 버전 (버그 트리아지용)',
  `device_info` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'OS/디바이스 정보',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '처리 상태 (pending/answered/closed)',
  `answer_content` text COLLATE utf8mb4_unicode_ci COMMENT '관리자 답변 본문 (1문의 1답변)',
  `answered_by` int DEFAULT NULL COMMENT '답변 관리자 사용자 ID',
  `answered_at` timestamp NULL DEFAULT NULL COMMENT '답변 시각',
  `answer_note` text COLLATE utf8mb4_unicode_ci COMMENT '운영 내부 메모 (사용자 비공개)',
  `is_read_by_user` tinyint(1) NOT NULL DEFAULT '0' COMMENT '작성자가 답변을 확인했는지 여부',
  `read_at` timestamp NULL DEFAULT NULL COMMENT '작성자가 답변을 확인한 시각',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '사용자 soft delete',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '삭제 시각',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록 시각',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '갱신 시각',
  PRIMARY KEY (`id`),
  KEY `idx_inquiries_user_status_created` (`user_id`,`status`,`created_at`),
  KEY `idx_inquiries_status_created` (`status`,`created_at`),
  KEY `idx_inquiries_answered_by` (`answered_by`),
  KEY `idx_inquiries_contact_username` (`contact_username`),
  CONSTRAINT `inquiries_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `inquiries_ibfk_2` FOREIGN KEY (`answered_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='고객 문의(1문의 1답변) 테이블';

-- ── inquiry_images ──
CREATE TABLE IF NOT EXISTS `inquiry_images` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '이미지 ID',
  `inquiry_id` int NOT NULL COMMENT '문의 ID',
  `cloudinary_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Cloudinary 이미지 URL',
  `cloudinary_public_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Cloudinary public_id',
  `display_order` tinyint unsigned NOT NULL DEFAULT '0' COMMENT '정렬 순서',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록 시각',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '삭제 시각 (soft delete)',
  PRIMARY KEY (`id`),
  KEY `idx_inquiry_images_inquiry_id` (`inquiry_id`),
  CONSTRAINT `inquiry_images_ibfk_1` FOREIGN KEY (`inquiry_id`) REFERENCES `inquiries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='문의 첨부 이미지';

-- ── signup_certificate_submissions ──
CREATE TABLE IF NOT EXISTS `signup_certificate_submissions` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '제출 ID',
  `user_id` int NOT NULL COMMENT '가입 사용자 ID',
  `name_enc` text COLLATE utf8mb4_unicode_ci,
  `phone_enc` text COLLATE utf8mb4_unicode_ci,
  `phone_lookup` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birth_date_enc` text COLLATE utf8mb4_unicode_ci,
  `certificate_view_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '열람용 주소',
  `certificate_access_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '열람 번호',
  `claimed_school_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '사용자가 기재한 재학 학교명(검수 참고)',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected',
  `review_note` text COLLATE utf8mb4_unicode_ci COMMENT '관리자 검수 메모',
  `reviewed_by` int DEFAULT NULL COMMENT '검수 관리자 users.id',
  `reviewed_at` timestamp NULL DEFAULT NULL COMMENT '검수 시각',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '제출 시각',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '갱신 시각',
  PRIMARY KEY (`id`),
  KEY `reviewed_by` (`reviewed_by`),
  KEY `idx_signup_cert_status_created` (`status`,`created_at`),
  KEY `idx_signup_cert_user_id` (`user_id`),
  CONSTRAINT `signup_certificate_submissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `signup_certificate_submissions_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='회원가입 증명서 검수';

-- ── signup_verification_tokens ──
CREATE TABLE IF NOT EXISTS `signup_verification_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jti` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'JWT jti (1회용)',
  `token_type` enum('ocr','student_id_manual') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ocr',
  `name_enc` text COLLATE utf8mb4_unicode_ci,
  `birth_date_enc` text COLLATE utf8mb4_unicode_ci,
  `school_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'OCR 시 확정, 수동은 가입 시 확정',
  `phone_enc` text COLLATE utf8mb4_unicode_ci,
  `phone_lookup` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cloudinary_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '학생증 Cloudinary URL',
  `cloudinary_public_id` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Cloudinary public_id',
  `used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_jti` (`jti`),
  KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='가입 전 OCR 등 1회용 검증 토큰';

-- ── user_signup_consents ──
CREATE TABLE IF NOT EXISTS `user_signup_consents` (
  `user_id` int NOT NULL,
  `terms_of_service` tinyint(1) NOT NULL DEFAULT '0',
  `data_collection` tinyint(1) NOT NULL DEFAULT '0',
  `student_ocr` tinyint(1) NOT NULL DEFAULT '0',
  `location` tinyint(1) NOT NULL DEFAULT '0',
  `marketing_opt_in` tinyint(1) NOT NULL DEFAULT '0',
  `consented_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_signup_consents_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='회원가입 시점 약관 동의 스냅샷';

-- ── account_recovery_tokens ──
CREATE TABLE IF NOT EXISTS `account_recovery_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jti` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'JWT jti (1회용)',
  `user_id` int NOT NULL,
  `phone_enc` text COLLATE utf8mb4_unicode_ci,
  `phone_lookup` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_jti` (`jti`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_account_recovery_phone_lookup` (`phone_lookup`),
  CONSTRAINT `account_recovery_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='비밀번호 찾기 1회용 재설정 토큰';

-- ── signup_student_id_submissions ──
CREATE TABLE IF NOT EXISTS `signup_student_id_submissions` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '제출 ID',
  `user_id` int NOT NULL COMMENT '가입 사용자 ID',
  `name_enc` text COLLATE utf8mb4_unicode_ci,
  `phone_enc` text COLLATE utf8mb4_unicode_ci,
  `phone_lookup` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birth_date_enc` text COLLATE utf8mb4_unicode_ci,
  `school_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '가입 시 사용자가 선택한 학교',
  `previous_school_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '제출 시점 이전 소속 학교',
  `cloudinary_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '학생증 이미지 URL',
  `cloudinary_public_id` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Cloudinary public_id',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected',
  `submission_purpose` enum('signup','resubmit','reverification') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'signup' COMMENT 'signup=가입, resubmit=거절 재제출, reverification=학년도 재인증',
  `review_note` text COLLATE utf8mb4_unicode_ci COMMENT '관리자 검수 메모',
  `reviewed_by` int DEFAULT NULL COMMENT '검수 관리자 users.id',
  `reviewed_at` timestamp NULL DEFAULT NULL COMMENT '검수 시각',
  `verification_jti` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'signup_verification_tokens.jti',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '제출 시각',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '갱신 시각',
  PRIMARY KEY (`id`),
  KEY `reviewed_by` (`reviewed_by`),
  KEY `idx_signup_sid_status_created` (`status`,`created_at`),
  KEY `idx_signup_sid_user_id` (`user_id`),
  KEY `idx_signup_sid_jti` (`verification_jti`),
  KEY `fk_signup_sid_previous_school` (`previous_school_id`),
  KEY `idx_signup_sid_purpose_status` (`submission_purpose`,`status`,`created_at`),
  CONSTRAINT `fk_signup_sid_previous_school` FOREIGN KEY (`previous_school_id`) REFERENCES `schools` (`school_id`) ON DELETE SET NULL,
  CONSTRAINT `signup_student_id_submissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `signup_student_id_submissions_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='회원가입 학생증 수동 검수';

-- ── admin_totp_secrets ──
CREATE TABLE IF NOT EXISTS `admin_totp_secrets` (
  `admin_user_id` int NOT NULL COMMENT 'admin_users.id',
  `secret_enc` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'AES-256-GCM 암호화된 TOTP secret',
  `confirmed_at` timestamp NULL DEFAULT NULL COMMENT 'OTP 등록 완료 시각 (NULL=QR만 발급·미확인)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`admin_user_id`),
  CONSTRAINT `fk_admin_totp_admin_user` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='관리자 TOTP 2FA secret';

-- ── attendances ──
CREATE TABLE IF NOT EXISTS `attendances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `school_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attendance_date` date NOT NULL COMMENT 'KST 기준 일자',
  `checked_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('present','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'present',
  `reject_reason` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance_user_date` (`user_id`,`attendance_date`),
  KEY `idx_attendance_school_date` (`school_id`,`attendance_date`),
  CONSTRAINT `attendances_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `attendances_ibfk_2` FOREIGN KEY (`school_id`) REFERENCES `schools` (`school_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='등교 출석부';

-- ── guardian_verifications ──
CREATE TABLE IF NOT EXISTS `guardian_verifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `child_user_id` int DEFAULT NULL,
  `guardian_phone_enc` text COLLATE utf8mb4_unicode_ci COMMENT 'AES-256-GCM',
  `guardian_phone_lookup` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'HMAC lookup',
  `status` enum('pending','verified','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `verified_at` timestamp NULL DEFAULT NULL,
  `mock` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_guardian_child` (`child_user_id`),
  KEY `idx_guardian_phone_lookup` (`guardian_phone_lookup`),
  CONSTRAINT `guardian_verifications_ibfk_1` FOREIGN KEY (`child_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='보호자 본인인증';

-- ── system_flags ──
CREATE TABLE IF NOT EXISTS `system_flags` (
  `flag_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '플래그 키',
  `flag_value` json NOT NULL COMMENT '값 (boolean/string/array)',
  `note` text COLLATE utf8mb4_unicode_ci COMMENT '변경 사유',
  `updated_by_admin_id` int DEFAULT NULL COMMENT '변경 관리자',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`flag_key`),
  KEY `fk_system_flags_admin` (`updated_by_admin_id`),
  CONSTRAINT `fk_system_flags_admin` FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='비상 스위치·운영 플래그';

-- ── admin_stats_snapshots ──
CREATE TABLE IF NOT EXISTS `admin_stats_snapshots` (
  `stat_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '통계 키',
  `stat_date` date NOT NULL COMMENT 'KST 기준 일자',
  `stat_value` bigint NOT NULL DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stat_key`,`stat_date`),
  KEY `idx_admin_stats_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='관리자 대시보드 통계 스냅샷';

-- ── attendance_suspicion_flags ──
CREATE TABLE IF NOT EXISTS `attendance_suspicion_flags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `period_days` int NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `attendance_days` int NOT NULL DEFAULT '0',
  `school_days` int NOT NULL DEFAULT '0',
  `attendance_rate` decimal(6,2) NOT NULL DEFAULT '0.00',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `computed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_att_suspicion_user_period` (`user_id`,`period_start`,`period_end`),
  KEY `idx_att_suspicion_computed` (`computed_at`),
  CONSTRAINT `fk_att_suspicion_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='미등교 의심 사용자 배치 결과';

-- ── user_sanctions ──
CREATE TABLE IF NOT EXISTS `user_sanctions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `sanction_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'suspend|ban|whitelist|unwhitelist|shadow_mute|shadow_unmute|unsuspend',
  `reason` text COLLATE utf8mb4_unicode_ci,
  `admin_user_id` int NOT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_sanctions_user` (`user_id`,`created_at`),
  KEY `fk_user_sanctions_admin` (`admin_user_id`),
  CONSTRAINT `fk_user_sanctions_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_user_sanctions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 제재 이력';

-- ── reports_archive ──
CREATE TABLE IF NOT EXISTS `reports_archive` (
  `id` int NOT NULL COMMENT '원본 reports.id',
  `reporter_id` int NOT NULL,
  `target_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_id` int NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `review_note` text COLLATE utf8mb4_unicode_ci,
  `is_malicious` tinyint(1) NOT NULL DEFAULT '0',
  `penalty_applied` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL,
  `archived_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reports_archive_status_created` (`status`,`created_at`),
  KEY `idx_reports_archive_archived` (`archived_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='처리 완료 신고 아카이브';

-- ── analytics_daily_snapshots ──
CREATE TABLE IF NOT EXISTS `analytics_daily_snapshots` (
  `stat_date` date NOT NULL COMMENT 'KST 기준 일자',
  `dau_count` bigint NOT NULL DEFAULT '0' COMMENT '일별 활성 사용자 (HyperLogLog 정산)',
  `mau_rolling_30d_count` bigint NOT NULL DEFAULT '0' COMMENT '롤링 30일 MAU (HyperLogLog PFMERGE)',
  `heatmap_json` json NOT NULL COMMENT '요일×시간 히트맵 (168 slots, dow*24+hour)',
  `screen_stats_json` json DEFAULT NULL COMMENT '화면별 조회수·시간대(24h) 집계',
  `reconciled_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '마지막 정산 시각',
  PRIMARY KEY (`stat_date`),
  KEY `idx_analytics_reconciled` (`reconciled_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제품 분석 일별 스냅샷';

-- ── identity_verifications ──
CREATE TABLE IF NOT EXISTS `identity_verifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `m_tx_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '가맹점 트랜잭션 ID',
  `tx_id` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '이니시스 트랜잭션 ID',
  `purpose` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'student_signup | guardian_consent',
  `app_return_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '앱 복귀 URL (youthpaper://inicis/return 등)',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT 'pending|launched|success|fail|expired|consumed',
  `provider_dev_cd` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result_code` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result_msg` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_enc` text COLLATE utf8mb4_unicode_ci,
  `phone_enc` text COLLATE utf8mb4_unicode_ci,
  `birthday_enc` text COLLATE utf8mb4_unicode_ci,
  `gender` char(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_foreign` char(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ci_enc` text COLLATE utf8mb4_unicode_ci,
  `di_enc` text COLLATE utf8mb4_unicode_ci,
  `ci_hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `di_hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `decrypt_status` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT 'pending|ok|skipped_no_key|error',
  `client_token` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `linked_user_id` int unsigned DEFAULT NULL COMMENT '가입 시 연결된 users.id',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_identity_m_tx` (`m_tx_id`),
  UNIQUE KEY `uk_identity_client_token` (`client_token`),
  KEY `idx_identity_status_exp` (`status`,`expires_at`),
  KEY `idx_identity_ci_hash` (`ci_hash`),
  KEY `idx_identity_linked_user` (`linked_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='KG Inicis identity verification sessions';

-- ── legal_documents ──
CREATE TABLE IF NOT EXISTS `legal_documents` (
  `slug` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'terms_of_service|privacy_policy',
  `title` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'v1.0.0',
  `content_md` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_by_admin_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`slug`),
  KEY `fk_legal_documents_admin` (`updated_by_admin_id`),
  CONSTRAINT `fk_legal_documents_admin` FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='법적 문서 본문(마크다운)';

-- ── legal_document_revisions ──
CREATE TABLE IF NOT EXISTS `legal_document_revisions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `document_slug` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_md` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `archived_by_admin_id` int DEFAULT NULL COMMENT '저장으로 덮어쓰기 직전 스냅샷을 남긴 관리자',
  `archived_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_legal_rev_slug_archived` (`document_slug`,`archived_at` DESC),
  KEY `fk_legal_rev_admin` (`archived_by_admin_id`),
  CONSTRAINT `fk_legal_rev_admin` FOREIGN KEY (`archived_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_legal_rev_document` FOREIGN KEY (`document_slug`) REFERENCES `legal_documents` (`slug`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='legal_documents 변경 전 본문 이력';

-- ── 초기 시드 (신규 DB 전용) ─────────────────────────────────────────────

INSERT IGNORE INTO colors (id, hex_code, color_number) VALUES
(1, '#FFF3F3', 1),
(2, '#FFFCD7', 2),
(3, '#F7FFF3', 3),
(4, '#E4EFFF', 4);

INSERT IGNORE INTO schools (
  school_id, name, school_type, operation_status
) VALUES (
  'CERT_PENDING', '학생증 인증 대기', 'special', 'active'
);

INSERT INTO system_flags (flag_key, flag_value, note) VALUES
  ('signup_disabled', 'false', '초기값'),
  ('post_write_disabled', 'false', '초기값'),
  ('comment_write_disabled', 'false', '초기값'),
  ('report_submission_disabled', 'false', '초기값'),
  ('global_readonly', 'false', '초기값'),
  ('rate_limit_strict_mode', 'false', '초기값'),
  ('locked_school_ids', '[]', '초기값'),
  ('maintenance_message', '""', '초기값')
ON DUPLICATE KEY UPDATE flag_key = flag_key;

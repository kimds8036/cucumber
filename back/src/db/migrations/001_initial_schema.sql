-- 학교 정보 테이블 (PK = JSON 학교ID, 매년 시드 시 전체 교체)
CREATE TABLE IF NOT EXISTS schools (
  school_id VARCHAR(50) NOT NULL PRIMARY KEY COMMENT '학교ID (JSON 제공값)',
  name VARCHAR(255) NOT NULL COMMENT '학교명',
  address TEXT COMMENT '학교 주소',
  school_type VARCHAR(20) COMMENT '학교 유형 (일반고/특목고 등)',
  region VARCHAR(100) COMMENT '지역 (시/도)',
  total_students INT DEFAULT 0 COMMENT '총 학생 수',
  total_posts INT DEFAULT 0 COMMENT '총 게시글 수',
  edu_office_code VARCHAR(20) NULL COMMENT '시도교육청코드',
  edu_office_name VARCHAR(100) NULL COMMENT '시도교육청명',
  admin_standard_code VARCHAR(50) NULL COMMENT '행정표준코드',
  jurisdiction_org_name VARCHAR(150) NULL COMMENT '관할조직명',
  road_address TEXT NULL COMMENT '도로명주소',
  road_address_detail TEXT NULL COMMENT '도로명상세주소',
  phone VARCHAR(30) NULL COMMENT '전화번호',
  homepage_url VARCHAR(255) NULL COMMENT '홈페이지주소',
  coed_type VARCHAR(50) NULL COMMENT '남녀공학구분명',
  hs_general_type VARCHAR(50) NULL COMMENT '고등학교일반전문구분명',
  anniversary_date DATE NULL COMMENT '개교기념일',
  modified_date DATE NULL COMMENT '수정일자',
  school_level VARCHAR(50) NULL COMMENT '학교급구분',
  founded_date DATE NULL COMMENT '설립일자',
  foundation_type VARCHAR(50) NULL COMMENT '설립형태',
  main_branch VARCHAR(20) NULL COMMENT '본교분교구분',
  operation_status VARCHAR(20) NULL COMMENT '운영상태',
  address_lot TEXT NULL COMMENT '소재지지번주소',
  latitude DECIMAL(10,7) NULL COMMENT '위도',
  longitude DECIMAL(10,7) NULL COMMENT '경도',
  INDEX idx_name (name),
  INDEX idx_region (region)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학교 정보 테이블';

-- 컬러 테이블
CREATE TABLE IF NOT EXISTS colors (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '컬러 ID',
  hex_code VARCHAR(7) NOT NULL UNIQUE COMMENT 'HEX 색상 코드',
  color_number INT NOT NULL UNIQUE COMMENT '컬러 번호',
  INDEX idx_color_number (color_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로필 컬러 테이블';

-- 컬러 데이터 삽입
INSERT IGNORE INTO colors (id, hex_code, color_number) VALUES
(1, '#FFF3F3', 1),
(2, '#FFFCD7', 2),
(3, '#F7FFF3', 3),
(4, '#E4EFFF', 4);

-- 사용자 정보 테이블
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '사용자 ID',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '사용자명 (로그인 ID)',
  name VARCHAR(50) NOT NULL COMMENT '실명명',
  password VARCHAR(255) NOT NULL COMMENT '암호화된 비밀번호',
  phone VARCHAR(20) NOT NULL UNIQUE COMMENT '전화번호',
  birth_date DATE NOT NULL COMMENT '생년월일',
  school_id VARCHAR(50) NOT NULL COMMENT '학교 ID',
  grade TINYINT NOT NULL COMMENT '학년 (1-3)',
  class_number TINYINT NOT NULL COMMENT '반 번호',
  graduation_year INT NOT NULL COMMENT '졸업년도',
  is_graduated BOOLEAN DEFAULT FALSE COMMENT '졸업 여부',
  is_deleted BOOLEAN DEFAULT FALSE COMMENT '탈퇴 여부',
  color_id INT NOT NULL COMMENT '프로필 컬러 ID',
  phone_verified BOOLEAN DEFAULT FALSE COMMENT '전화번호 인증 여부',
  student_verified BOOLEAN DEFAULT FALSE COMMENT '학생 인증 여부',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '가입 일시',
  FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE RESTRICT,
  FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE RESTRICT,
  INDEX idx_school_id (school_id),
  INDEX idx_color_id (color_id),
  INDEX idx_username (username),
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 정보 테이블';

-- 게시글 테이블
CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '게시글 ID',
  user_id INT NOT NULL COMMENT '작성자 ID',
  board_type VARCHAR(20) NOT NULL COMMENT '게시판 유형 (national/school)',
  school_id VARCHAR(50) COMMENT '학교 ID (학교 게시판인 경우)',
  content TEXT NOT NULL COMMENT '게시글 내용',
  like_count INT DEFAULT 0 COMMENT '좋아요 수',
  comment_count INT DEFAULT 0 COMMENT '댓글 수',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '작성 일시',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_school_id (school_id),
  INDEX idx_board_type (board_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 테이블';

-- 댓글 테이블
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '댓글 ID',
  post_id INT NOT NULL COMMENT '게시글 ID',
  user_id INT NOT NULL COMMENT '작성자 ID',
  parent_comment_id INT COMMENT '부모 댓글 ID (대댓글)',
  content TEXT NULL COMMENT '댓글 내용',
  anonymous_index TINYINT NOT NULL COMMENT '익명 번호 (익명1, 익명2 등)',
  like_count INT DEFAULT 0 COMMENT '좋아요 수',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '작성 일시',
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id),
  INDEX idx_user_id (user_id),
  INDEX idx_parent_comment_id (parent_comment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='댓글 테이블';

-- 쪽지 채팅방 테이블
CREATE TABLE IF NOT EXISTS message_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '채팅방 ID',
  post_id INT NOT NULL COMMENT '게시글 ID',
  user1_id INT NOT NULL COMMENT '참여자 1',
  user2_id INT NOT NULL COMMENT '참여자 2',
  last_message TEXT COMMENT '마지막 메시지 내용',
  last_message_at TIMESTAMP NULL COMMENT '마지막 메시지 시각',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '채팅방 생성 일시',
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_post_users (post_id, user1_id, user2_id),
  INDEX idx_user1_id (user1_id),
  INDEX idx_user2_id (user2_id),
  INDEX idx_last_message_at (last_message_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='쪽지 채팅방 테이블';

-- 쪽지 메시지 테이블
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '메시지 ID',
  room_id INT NOT NULL COMMENT '채팅방 ID',
  sender_id INT NOT NULL COMMENT '발신자 ID',
  parent_message_id INT NULL COMMENT '답장 대상 메시지 ID',
  content TEXT NULL COMMENT '메시지 내용',
  is_read BOOLEAN DEFAULT FALSE COMMENT '읽음 여부',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '발송 일시',
  FOREIGN KEY (room_id) REFERENCES message_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE SET NULL,
  INDEX idx_room_id (room_id),
  INDEX idx_sender_id (sender_id),
  INDEX idx_parent_message_id (parent_message_id),
  INDEX idx_created_at (created_at),
  INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='쪽지 메시지 테이블';

-- 개인 우편 테이블
CREATE TABLE IF NOT EXISTS personal_mails (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '개인 우편 ID',
  sender_id INT NOT NULL COMMENT '발신자 ID',
  recipient_id INT NOT NULL COMMENT '수신자 ID',
  content TEXT NOT NULL COMMENT '우편 내용',
  is_read BOOLEAN DEFAULT FALSE COMMENT '읽음 여부',
  is_deleted BOOLEAN DEFAULT FALSE COMMENT '삭제 여부',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '발송 일시',
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sender_id (sender_id),
  INDEX idx_recipient_id (recipient_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='개인 우편 테이블';

-- 학교 우편 테이블
CREATE TABLE IF NOT EXISTS school_mails (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '학교 우편 ID',
  school_id VARCHAR(50) NOT NULL COMMENT '학교 ID',
  user_id INT NOT NULL COMMENT '작성자 ID',
  content TEXT NOT NULL COMMENT '우편 내용',
  comment_count INT DEFAULT 0 COMMENT '댓글 수',
  is_deleted BOOLEAN DEFAULT FALSE COMMENT '삭제 여부',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '발송 일시',
  FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_school_id (school_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학교 우편 테이블';

-- 시간표 테이블
CREATE TABLE IF NOT EXISTS timetables (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '시간표 ID',
  user_id INT NOT NULL UNIQUE COMMENT '사용자 ID',
  school_id VARCHAR(50) NOT NULL COMMENT '학교 ID',
  grade TINYINT NOT NULL COMMENT '학년',
  class_number TINYINT NOT NULL COMMENT '반',
  mon_1 VARCHAR(50) COMMENT '월요일 1교시',
  mon_2 VARCHAR(50) COMMENT '월요일 2교시',
  mon_3 VARCHAR(50) COMMENT '월요일 3교시',
  mon_4 VARCHAR(50) COMMENT '월요일 4교시',
  mon_5 VARCHAR(50) COMMENT '월요일 5교시',
  mon_6 VARCHAR(50) COMMENT '월요일 6교시',
  mon_7 VARCHAR(50) COMMENT '월요일 7교시',
  tue_1 VARCHAR(50) COMMENT '화요일 1교시',
  tue_2 VARCHAR(50) COMMENT '화요일 2교시',
  tue_3 VARCHAR(50) COMMENT '화요일 3교시',
  tue_4 VARCHAR(50) COMMENT '화요일 4교시',
  tue_5 VARCHAR(50) COMMENT '화요일 5교시',
  tue_6 VARCHAR(50) COMMENT '화요일 6교시',
  tue_7 VARCHAR(50) COMMENT '화요일 7교시',
  wed_1 VARCHAR(50) COMMENT '수요일 1교시',
  wed_2 VARCHAR(50) COMMENT '수요일 2교시',
  wed_3 VARCHAR(50) COMMENT '수요일 3교시',
  wed_4 VARCHAR(50) COMMENT '수요일 4교시',
  wed_5 VARCHAR(50) COMMENT '수요일 5교시',
  wed_6 VARCHAR(50) COMMENT '수요일 6교시',
  wed_7 VARCHAR(50) COMMENT '수요일 7교시',
  thu_1 VARCHAR(50) COMMENT '목요일 1교시',
  thu_2 VARCHAR(50) COMMENT '목요일 2교시',
  thu_3 VARCHAR(50) COMMENT '목요일 3교시',
  thu_4 VARCHAR(50) COMMENT '목요일 4교시',
  thu_5 VARCHAR(50) COMMENT '목요일 5교시',
  thu_6 VARCHAR(50) COMMENT '목요일 6교시',
  thu_7 VARCHAR(50) COMMENT '목요일 7교시',
  fri_1 VARCHAR(50) COMMENT '금요일 1교시',
  fri_2 VARCHAR(50) COMMENT '금요일 2교시',
  fri_3 VARCHAR(50) COMMENT '금요일 3교시',
  fri_4 VARCHAR(50) COMMENT '금요일 4교시',
  fri_5 VARCHAR(50) COMMENT '금요일 5교시',
  fri_6 VARCHAR(50) COMMENT '금요일 6교시',
  fri_7 VARCHAR(50) COMMENT '금요일 7교시',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE RESTRICT,
  INDEX idx_school_grade_class (school_id, grade, class_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='시간표 테이블';

-- 전화번호 인증 테이블
CREATE TABLE IF NOT EXISTS phone_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '인증 ID',
  phone VARCHAR(20) NOT NULL COMMENT '전화번호',
  verification_code VARCHAR(6) NOT NULL COMMENT '인증 코드',
  is_verified BOOLEAN DEFAULT FALSE COMMENT '인증 완료 여부',
  expires_at TIMESTAMP NOT NULL COMMENT '만료 일시',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  INDEX idx_phone (phone),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='전화번호 인증 테이블';

-- 사용자 디바이스 테이블
CREATE TABLE IF NOT EXISTS user_devices (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '디바이스 ID',
  user_id INT NOT NULL COMMENT '사용자 ID',
  device_id VARCHAR(255) COMMENT '디바이스 고유 ID',
  device_info TEXT COMMENT '디바이스 정보 (User-Agent 등)',
  ip_address VARCHAR(45) COMMENT 'IP 주소',
  last_login_at TIMESTAMP COMMENT '마지막 로그인 일시',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_device_id (device_id),
  INDEX idx_user_device (user_id, device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 디바이스 정보 테이블';

-- 게시글 좋아요 테이블
CREATE TABLE IF NOT EXISTS post_likes (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '좋아요 ID',
  user_id INT NOT NULL COMMENT '사용자 ID',
  post_id INT NOT NULL COMMENT '게시글 ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '좋아요 일시',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_post (user_id, post_id),
  INDEX idx_post_id (post_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 좋아요 테이블';

-- 댓글 좋아요 테이블
CREATE TABLE IF NOT EXISTS comment_likes (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '좋아요 ID',
  user_id INT NOT NULL COMMENT '사용자 ID',
  comment_id INT NOT NULL COMMENT '댓글 ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '좋아요 일시',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_comment (user_id, comment_id),
  INDEX idx_comment_id (comment_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='댓글 좋아요 테이블';

-- 해시태그 테이블
CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '태그 ID',
  name VARCHAR(50) NOT NULL UNIQUE COMMENT '해시태그 이름 (예: #중간고사)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '태그 생성 일시',
  INDEX idx_tag_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 해시태그 테이블';

-- 게시글-태그 매핑 테이블 (N:M)
CREATE TABLE IF NOT EXISTS post_tags (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '게시글-태그 매핑 ID',
  post_id INT NOT NULL COMMENT '게시글 ID',
  tag_id INT NOT NULL COMMENT '태그 ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '매핑 생성 일시',
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE KEY unique_post_tag (post_id, tag_id),
  INDEX idx_post_id (post_id),
  INDEX idx_tag_id (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글-태그 매핑 테이블';

-- 신고 테이블
CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '신고 ID',
  reporter_id INT NOT NULL COMMENT '신고자 ID',
  target_type VARCHAR(20) NOT NULL COMMENT '신고 대상 타입 (post/comment)',
  target_id INT NOT NULL COMMENT '신고 대상 ID',
  reason VARCHAR(255) COMMENT '신고 사유',
  description TEXT COMMENT '신고 상세 내용',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '신고 상태 (pending/processing/resolved/rejected)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '신고 일시',
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reporter_id (reporter_id),
  INDEX idx_target (target_type, target_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='신고 테이블';

-- OCR 인증 테이블
CREATE TABLE IF NOT EXISTS ocr_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'OCR 인증 ID',
  user_id INT NOT NULL COMMENT '사용자 ID',
  image_url TEXT COMMENT '학생증 이미지 URL',
  extracted_data JSON COMMENT 'OCR 추출 데이터',
  is_verified BOOLEAN DEFAULT FALSE COMMENT '인증 완료 여부',
  verified_by INT COMMENT '인증 처리자 ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OCR 학생증 인증 테이블';

-- 친구 관계 테이블
CREATE TABLE IF NOT EXISTS user_friendships (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '친구 관계 ID',
  requester_id INT NOT NULL COMMENT '친구 요청자 ID',
  addressee_id INT NOT NULL COMMENT '친구 요청 대상자 ID',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태 (pending/accepted/rejected)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '요청 일시',
  responded_at TIMESTAMP NULL COMMENT '응답 일시',
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_friend_pair (requester_id, addressee_id),
  INDEX idx_requester_id (requester_id),
  INDEX idx_addressee_id (addressee_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 친구 관계 테이블';

-- 사용자 차단 테이블
CREATE TABLE IF NOT EXISTS user_blocks (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '차단 ID',
  user_id INT NOT NULL COMMENT '차단한 사용자 ID',
  blocked_user_id INT NOT NULL COMMENT '차단된 사용자 ID',
  reason VARCHAR(255) NULL COMMENT '차단 사유',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '차단 일시',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_block_pair (user_id, blocked_user_id),
  INDEX idx_user_id (user_id),
  INDEX idx_blocked_user_id (blocked_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 차단 테이블';

-- 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '알림 ID',
  user_id INT NOT NULL COMMENT '알림을 받는 사용자 ID',
  type VARCHAR(30) NOT NULL COMMENT '알림 타입 (like/comment/mail/system 등)',
  category VARCHAR(30) NOT NULL COMMENT '알림 카테고리 (post/mail/system 등)',
  title VARCHAR(255) NOT NULL COMMENT '알림 제목',
  body TEXT COMMENT '알림 내용',
  related_type VARCHAR(30) NULL COMMENT '연관 리소스 타입 (post/comment/mail 등)',
  related_id INT NULL COMMENT '연관 리소스 ID',
  is_read BOOLEAN DEFAULT FALSE COMMENT '읽음 여부',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '알림 생성 일시',
  read_at TIMESTAMP NULL COMMENT '읽은 시각',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_is_read (is_read),
  INDEX idx_related (related_type, related_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='알림 테이블';

-- 사용자 설정 테이블 (알림/게시판 거리/아이디 변경 등)
CREATE TABLE IF NOT EXISTS user_settings (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '설정 ID',
  user_id INT NOT NULL UNIQUE COMMENT '사용자 ID',
  push_enabled BOOLEAN DEFAULT TRUE COMMENT '푸시 알림 전체 사용 여부',
  new_post BOOLEAN DEFAULT TRUE COMMENT '새 게시글 알림',
  new_comment BOOLEAN DEFAULT TRUE COMMENT '댓글 알림',
  new_like BOOLEAN DEFAULT FALSE COMMENT '좋아요 알림',
  announcement BOOLEAN DEFAULT TRUE COMMENT '공지사항 알림',
  board_distance_km TINYINT UNSIGNED DEFAULT 10 COMMENT '게시판 거리 설정 (km, 1~100)',
  last_username_change_at TIMESTAMP NULL COMMENT '마지막 아이디 변경 일시',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '설정 생성 일시',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '설정 수정 일시',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_board_distance (board_distance_km)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 환경 설정 테이블';

-- 공부/타이머 일별 요약 테이블
CREATE TABLE IF NOT EXISTS study_days (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '공부 일별 집계 ID',
  user_id INT NOT NULL COMMENT '사용자 ID',
  day_key DATE NOT NULL COMMENT '날짜 (YYYY-MM-DD)',
  total_elapsed_ms BIGINT NOT NULL DEFAULT 0 COMMENT '해당 날짜 총 공부 시간(ms)',
  subjects JSON NULL COMMENT '과목 리스트 및 색상/메모 등(JSON)',
  tasks JSON NULL COMMENT '투두리스트/과제 정보(JSON)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_day (user_id, day_key),
  INDEX idx_user_id (user_id),
  INDEX idx_day_key (day_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공부 타이머 일별 집계 테이블';

-- 공부/타이머 세션 테이블
CREATE TABLE IF NOT EXISTS study_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '공부 세션 ID',
  user_id INT NOT NULL COMMENT '사용자 ID',
  day_key DATE NOT NULL COMMENT '날짜 (YYYY-MM-DD)',
  subject_name VARCHAR(100) NULL COMMENT '과목명 (NULL이면 전체 공부)',
  start_seconds INT NOT NULL COMMENT '해당 날짜 기준 시작 시각(초)',
  end_seconds INT NULL COMMENT '해당 날짜 기준 종료 시각(초, NULL이면 진행 중)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_day (user_id, day_key),
  INDEX idx_subject_name (subject_name),
  INDEX idx_start_seconds (start_seconds)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공부 타이머 세션 테이블';

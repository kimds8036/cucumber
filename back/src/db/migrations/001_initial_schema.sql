-- 학교 정보 테이블
CREATE TABLE IF NOT EXISTS schools (
  school_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '학교 ID',
  name VARCHAR(255) NOT NULL COMMENT '학교명',
  address TEXT COMMENT '학교 주소',
  school_type VARCHAR(20) COMMENT '학교 유형 (일반고/특목고 등)',
  region VARCHAR(100) COMMENT '지역 (시/도)',
  total_students INT DEFAULT 0 COMMENT '총 학생 수',
  total_posts INT DEFAULT 0 COMMENT '총 게시글 수',
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
  name VARCHAR(50) NOT NULL COMMENT '실명',
  password VARCHAR(255) NOT NULL COMMENT '암호화된 비밀번호',
  phone VARCHAR(20) NOT NULL UNIQUE COMMENT '전화번호',
  birth_date DATE NOT NULL COMMENT '생년월일',
  school_id INT NOT NULL COMMENT '학교 ID',
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
  school_id INT COMMENT '학교 ID (학교 게시판인 경우)',
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
  content TEXT NOT NULL COMMENT '댓글 내용',
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
  content TEXT NOT NULL COMMENT '메시지 내용',
  is_read BOOLEAN DEFAULT FALSE COMMENT '읽음 여부',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '발송 일시',
  FOREIGN KEY (room_id) REFERENCES message_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_room_id (room_id),
  INDEX idx_sender_id (sender_id),
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
  school_id INT NOT NULL COMMENT '학교 ID',
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
  school_id INT NOT NULL COMMENT '학교 ID',
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

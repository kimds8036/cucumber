-- 신고(reports) ↔ 차단(user_blocks) 연동: 피신고 사용자 추적 + 동일 대상 중복 신고 방지

-- 1) 동일 신고자·대상 중복 행 제거 (가장 오래된 id 유지)
DELETE r1
FROM reports r1
INNER JOIN reports r2
  ON r1.reporter_id = r2.reporter_id
 AND r1.target_type = r2.target_type
 AND r1.target_id = r2.target_id
 AND r1.id > r2.id;

-- 2) 피신고 사용자(콘텐츠 작성자) 컬럼
ALTER TABLE reports
  ADD COLUMN reported_user_id INT NULL COMMENT '신고 대상 콘텐츠 작성자 users.id' AFTER target_id;

ALTER TABLE reports
  ADD CONSTRAINT fk_reports_reported_user
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3) 기존 신고 행: target_type별 작성자 backfill
UPDATE reports r
INNER JOIN posts p ON r.target_type = 'post' AND r.target_id = p.id
SET r.reported_user_id = p.user_id
WHERE r.reported_user_id IS NULL;

UPDATE reports r
INNER JOIN comments c ON r.target_type = 'comment' AND r.target_id = c.id
SET r.reported_user_id = c.user_id
WHERE r.reported_user_id IS NULL;

UPDATE reports r
INNER JOIN school_mails sm ON r.target_type = 'school_mail' AND r.target_id = sm.id
SET r.reported_user_id = sm.user_id
WHERE r.reported_user_id IS NULL;

UPDATE reports r
INNER JOIN school_mail_comments smc ON r.target_type = 'school_mail_comment' AND r.target_id = smc.id
SET r.reported_user_id = smc.user_id
WHERE r.reported_user_id IS NULL;

-- 4) 중복 신고 DB 차단 + 신고자·피신고자 조회 인덱스
ALTER TABLE reports
  ADD UNIQUE KEY unique_reporter_target (reporter_id, target_type, target_id),
  ADD INDEX idx_reports_reporter_reported_user (reporter_id, reported_user_id);

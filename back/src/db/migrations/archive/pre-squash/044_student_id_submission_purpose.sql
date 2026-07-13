-- 가입 학생증 vs 재인증 학생증 구분 + 이전 학교 스냅샷

ALTER TABLE signup_student_id_submissions
  ADD COLUMN submission_purpose ENUM('signup', 'resubmit', 'reverification') NOT NULL DEFAULT 'signup'
    COMMENT 'signup=가입, resubmit=거절 재제출, reverification=학년도 재인증' AFTER status,
  ADD COLUMN previous_school_id VARCHAR(50) NULL
    COMMENT '제출 시점 이전 소속 학교' AFTER school_id;

ALTER TABLE signup_student_id_submissions
  ADD CONSTRAINT fk_signup_sid_previous_school
    FOREIGN KEY (previous_school_id) REFERENCES schools(school_id) ON DELETE SET NULL;

UPDATE signup_student_id_submissions
SET submission_purpose = 'signup'
WHERE verification_jti IS NOT NULL;

UPDATE signup_student_id_submissions s
INNER JOIN users u ON u.id = s.user_id
SET s.submission_purpose = 'reverification',
    s.previous_school_id = COALESCE(u.previous_school_id, u.school_id)
WHERE s.verification_jti IS NULL
  AND u.student_verified = TRUE
  AND s.status IN ('pending', 'approved', 'rejected');

CREATE INDEX idx_signup_sid_purpose_status
  ON signup_student_id_submissions (submission_purpose, status, created_at);

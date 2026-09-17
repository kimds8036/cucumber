-- 018: 학생증 1~2장 URL JSON 저장을 위해 cloudinary_url 길이 확장
ALTER TABLE signup_student_id_submissions
  MODIFY COLUMN cloudinary_url TEXT NOT NULL COMMENT '학생증 이미지 URL(단건 또는 JSON 2장)';

ALTER TABLE signup_verification_tokens
  MODIFY COLUMN cloudinary_url TEXT NULL COMMENT '학생증 Cloudinary URL(단건 또는 JSON 2장)';

-- 사용자 PII(이름/전화/생년월일) 암호화 저장 + lookup HMAC

ALTER TABLE users
  MODIFY COLUMN name VARCHAR(50) NULL COMMENT 'DEPRECATED plaintext — name_enc 사용',
  MODIFY COLUMN phone VARCHAR(20) NULL COMMENT 'DEPRECATED plaintext — phone_enc/phone_lookup 사용',
  MODIFY COLUMN birth_date DATE NULL COMMENT 'DEPRECATED plaintext — birth_date_enc 사용',
  ADD COLUMN name_enc TEXT NULL COMMENT 'AES-256-GCM 실명' AFTER name,
  ADD COLUMN name_lookup VARCHAR(64) NULL COMMENT 'HMAC 실명 lookup' AFTER name_enc,
  ADD COLUMN phone_enc TEXT NULL COMMENT 'AES-256-GCM 전화번호' AFTER phone,
  ADD COLUMN phone_lookup VARCHAR(64) NULL COMMENT 'HMAC 전화 lookup' AFTER phone_enc,
  ADD COLUMN birth_date_enc TEXT NULL COMMENT 'AES-256-GCM 생년월일 YYYY-MM-DD' AFTER birth_date;

ALTER TABLE users
  ADD UNIQUE INDEX idx_users_phone_lookup (phone_lookup),
  ADD INDEX idx_users_name_lookup (name_lookup);

-- legacy phone UNIQUE 제거 (phone_lookup으로 대체)
ALTER TABLE users DROP INDEX phone;

ALTER TABLE phone_verifications
  ADD COLUMN phone_enc TEXT NULL COMMENT 'AES-256-GCM' AFTER phone,
  ADD COLUMN phone_lookup VARCHAR(64) NULL COMMENT 'HMAC lookup' AFTER phone_enc,
  ADD INDEX idx_phone_verifications_lookup (phone_lookup);

ALTER TABLE signup_student_id_submissions
  MODIFY COLUMN name VARCHAR(50) NULL,
  MODIFY COLUMN phone VARCHAR(20) NULL,
  MODIFY COLUMN birth_date DATE NULL,
  ADD COLUMN name_enc TEXT NULL AFTER name,
  ADD COLUMN phone_enc TEXT NULL AFTER phone,
  ADD COLUMN phone_lookup VARCHAR(64) NULL AFTER phone_enc,
  ADD COLUMN birth_date_enc TEXT NULL AFTER birth_date;

ALTER TABLE signup_certificate_submissions
  MODIFY COLUMN name VARCHAR(50) NULL,
  MODIFY COLUMN phone VARCHAR(20) NULL,
  MODIFY COLUMN birth_date DATE NULL,
  ADD COLUMN name_enc TEXT NULL AFTER name,
  ADD COLUMN phone_enc TEXT NULL AFTER phone,
  ADD COLUMN phone_lookup VARCHAR(64) NULL AFTER phone_enc,
  ADD COLUMN birth_date_enc TEXT NULL AFTER birth_date;

ALTER TABLE signup_verification_tokens
  MODIFY COLUMN name VARCHAR(50) NULL,
  MODIFY COLUMN phone VARCHAR(20) NULL,
  MODIFY COLUMN birth_date DATE NULL,
  ADD COLUMN name_enc TEXT NULL AFTER name,
  ADD COLUMN phone_enc TEXT NULL AFTER phone,
  ADD COLUMN phone_lookup VARCHAR(64) NULL AFTER phone_enc,
  ADD COLUMN birth_date_enc TEXT NULL AFTER birth_date;

ALTER TABLE account_recovery_tokens
  ADD COLUMN phone_enc TEXT NULL AFTER phone,
  ADD COLUMN phone_lookup VARCHAR(64) NULL AFTER phone_enc,
  ADD INDEX idx_account_recovery_phone_lookup (phone_lookup);

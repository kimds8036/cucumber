-- 047 PII 암호화 이후 legacy plaintext 컬럼 제거
-- 사전 조건: migrate:pii-encrypt 백필 완료 및 053 적용 후 배포 완료

UPDATE users
SET name = NULL, phone = NULL, birth_date = NULL
WHERE name_enc IS NOT NULL OR phone_enc IS NOT NULL OR birth_date_enc IS NOT NULL;

UPDATE phone_verifications
SET phone = NULL
WHERE phone_enc IS NOT NULL OR phone_lookup IS NOT NULL;

UPDATE signup_student_id_submissions
SET name = NULL, phone = NULL, birth_date = NULL
WHERE name_enc IS NOT NULL;

UPDATE signup_certificate_submissions
SET name = NULL, phone = NULL, birth_date = NULL
WHERE name_enc IS NOT NULL;

UPDATE signup_verification_tokens
SET name = NULL, phone = NULL, birth_date = NULL
WHERE name_enc IS NOT NULL;

UPDATE account_recovery_tokens
SET phone = NULL
WHERE phone_enc IS NOT NULL OR phone_lookup IS NOT NULL;

ALTER TABLE phone_verifications DROP INDEX idx_phone;

ALTER TABLE signup_verification_tokens DROP INDEX idx_phone_created;

ALTER TABLE users
  DROP COLUMN name,
  DROP COLUMN phone,
  DROP COLUMN birth_date;

ALTER TABLE phone_verifications DROP COLUMN phone;

ALTER TABLE signup_student_id_submissions
  DROP COLUMN name,
  DROP COLUMN phone,
  DROP COLUMN birth_date;

ALTER TABLE signup_certificate_submissions
  DROP COLUMN name,
  DROP COLUMN phone,
  DROP COLUMN birth_date;

ALTER TABLE signup_verification_tokens
  DROP COLUMN name,
  DROP COLUMN phone,
  DROP COLUMN birth_date;

ALTER TABLE account_recovery_tokens DROP COLUMN phone;

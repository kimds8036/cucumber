-- guardian_verifications 보호자 전화번호 암호화 저장 + legacy plaintext 제거

ALTER TABLE guardian_verifications
  ADD COLUMN guardian_phone_enc TEXT NULL COMMENT 'AES-256-GCM' AFTER guardian_phone,
  ADD COLUMN guardian_phone_lookup VARCHAR(64) NULL COMMENT 'HMAC lookup' AFTER guardian_phone_enc;

ALTER TABLE guardian_verifications
  ADD INDEX idx_guardian_phone_lookup (guardian_phone_lookup);

-- SQL로 암호화 불가 — enc 없는 기존 mock 행은 제거(재인증 필요)
DELETE FROM guardian_verifications WHERE guardian_phone_enc IS NULL;

ALTER TABLE guardian_verifications DROP INDEX idx_guardian_phone;

ALTER TABLE guardian_verifications DROP COLUMN guardian_phone;

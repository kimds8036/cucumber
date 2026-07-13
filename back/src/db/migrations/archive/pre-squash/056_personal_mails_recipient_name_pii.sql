-- personal_mails 수신자 실명 스냅샷 암호화 컬럼 추가

ALTER TABLE personal_mails
  ADD COLUMN recipient_name_enc TEXT NULL COMMENT 'AES-256-GCM 수신자 실명 스냅샷' AFTER recipient_name,
  ADD COLUMN recipient_name_lookup VARCHAR(64) NULL COMMENT 'HMAC 실명 lookup' AFTER recipient_name_enc;

ALTER TABLE personal_mails
  ADD INDEX idx_personal_mails_recipient_name_lookup (recipient_name_lookup);

-- personal_mails legacy plaintext 수신자 실명 제거

DELETE FROM personal_mails
WHERE recipient_name IS NOT NULL AND recipient_name_enc IS NULL;

ALTER TABLE personal_mails DROP COLUMN recipient_name;

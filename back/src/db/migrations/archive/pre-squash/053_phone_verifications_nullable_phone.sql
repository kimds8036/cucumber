-- phone_verifications: PII 암호화 이후 legacy phone 컬럼 nullable 허용
ALTER TABLE phone_verifications
  MODIFY COLUMN phone VARCHAR(20) NULL COMMENT 'DEPRECATED plaintext — phone_enc/phone_lookup 사용',
  MODIFY COLUMN verification_code VARCHAR(16) NOT NULL COMMENT '인증 코드';

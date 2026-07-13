-- KG 이니시스 통합인증 세션 (본인확인/법정대리인)
CREATE TABLE IF NOT EXISTS identity_verifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  m_tx_id VARCHAR(20) NOT NULL COMMENT '가맹점 트랜잭션 ID',
  tx_id VARCHAR(40) NULL COMMENT '이니시스 트랜잭션 ID',
    purpose VARCHAR(32) NOT NULL COMMENT 'student_signup | guardian_consent | find_username | password_recovery',
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
    COMMENT 'pending|launched|success|fail|expired|consumed',
  provider_dev_cd VARCHAR(16) NULL,
  result_code VARCHAR(8) NULL,
  result_msg VARCHAR(500) NULL,
  name_enc TEXT NULL,
  phone_enc TEXT NULL,
  birthday_enc TEXT NULL,
  gender CHAR(1) NULL,
  is_foreign CHAR(1) NULL,
  ci_enc TEXT NULL,
  di_enc TEXT NULL,
  ci_hash VARCHAR(64) NULL,
  di_hash VARCHAR(64) NULL,
  decrypt_status VARCHAR(24) NOT NULL DEFAULT 'pending'
    COMMENT 'pending|ok|skipped_no_key|error',
  client_token CHAR(64) NULL,
  consumed_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_identity_m_tx (m_tx_id),
  UNIQUE KEY uk_identity_client_token (client_token),
  KEY idx_identity_status_exp (status, expires_at),
  KEY idx_identity_ci_hash (ci_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='KG Inicis identity verification sessions';

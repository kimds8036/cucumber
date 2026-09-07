-- 소셜 로그인 연동 (카카오/애플 등)
CREATE TABLE IF NOT EXISTS user_oauth_providers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(32) NOT NULL COMMENT 'kakao|apple',
  provider_user_id VARCHAR(128) NOT NULL,
  linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_oauth_provider_user (provider, provider_user_id),
  UNIQUE KEY uq_oauth_user_provider (user_id, provider),
  KEY idx_oauth_user_id (user_id),
  CONSTRAINT fk_oauth_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='소셜 OAuth 제공자 연동';

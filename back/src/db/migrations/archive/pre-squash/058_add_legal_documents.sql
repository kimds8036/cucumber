-- 앱·관리자에서 편집·제공하는 법적 문서(이용약관, 개인정보처리방침 등)

CREATE TABLE IF NOT EXISTS legal_documents (
  slug VARCHAR(40) NOT NULL PRIMARY KEY COMMENT 'terms_of_service|privacy_policy',
  title VARCHAR(120) NOT NULL,
  version VARCHAR(24) NOT NULL DEFAULT 'v1.0.0',
  content_md MEDIUMTEXT NOT NULL,
  updated_by_admin_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_legal_documents_admin
    FOREIGN KEY (updated_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='법적 문서 본문(마크다운)';

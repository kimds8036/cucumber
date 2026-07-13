-- 법적 문서 수정 이력 (관리자 저장 시 이전 버전 스냅샷)

CREATE TABLE IF NOT EXISTS legal_document_revisions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  document_slug VARCHAR(40) NOT NULL,
  title VARCHAR(120) NOT NULL,
  version VARCHAR(24) NOT NULL,
  content_md MEDIUMTEXT NOT NULL,
  archived_by_admin_id INT NULL COMMENT '저장으로 덮어쓰기 직전 스냅샷을 남긴 관리자',
  archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_legal_rev_slug_archived (document_slug, archived_at DESC),
  CONSTRAINT fk_legal_rev_document
    FOREIGN KEY (document_slug) REFERENCES legal_documents(slug) ON DELETE CASCADE,
  CONSTRAINT fk_legal_rev_admin
    FOREIGN KEY (archived_by_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='legal_documents 변경 전 본문 이력';

-- legal_documents 슬러그 확장 (커뮤니티 가이드·청소년 보호·오픈소스)
-- 신규 문서 본문은 migrate.js seedLegalDocuments()가 삽입합니다.

ALTER TABLE legal_documents
  MODIFY COLUMN slug VARCHAR(40) NOT NULL
  COMMENT 'terms_of_service|privacy_policy|community_guide|youth_protection_policy|open_source_licenses';

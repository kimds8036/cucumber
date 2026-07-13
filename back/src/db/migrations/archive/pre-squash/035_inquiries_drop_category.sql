-- inquiries 테이블에서 category 컬럼 제거
-- (사용자 요구로 카테고리 분류 자체를 사용하지 않음 — NULL 허용이 아니라 컬럼 자체 삭제)
-- migrate.js가 1054(컬럼 없음)/1091(대상 없음)을 스킵 처리하므로 멱등 보장됨.

ALTER TABLE inquiries DROP INDEX idx_inquiries_category_created;

ALTER TABLE inquiries DROP COLUMN category;

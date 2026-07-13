-- inquiries 테이블에서 title, contact_phone 컬럼 제거
-- (사용자 요구로 제목/전화번호 입력을 받지 않음 — NULL 허용이 아니라 컬럼 자체 삭제)
-- 인덱스도 함께 정리.
-- migrate.js가 1054(컬럼 없음)/1091(대상 없음)을 스킵 처리하므로 멱등 보장됨.

ALTER TABLE inquiries DROP INDEX idx_inquiries_contact_phone;

ALTER TABLE inquiries DROP COLUMN title;

ALTER TABLE inquiries DROP COLUMN contact_phone;

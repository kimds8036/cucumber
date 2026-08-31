-- P0~P3 스키마 정규화 (관리자 FK · personal_mails FK · mail_rooms FK · user_devices · ocr 제거)
-- 동적 FK 정리·orphan 보정은 migrate.js → normalizeSchema006.js 후처리.

-- (실제 DDL은 JS 후처리에서 idempotent 적용 — 재실행·부분 적용 DB 대응)

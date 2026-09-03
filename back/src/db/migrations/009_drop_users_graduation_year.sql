-- users.graduation_year 제거 (가입·관리자 유추/저장 중단)
-- PREPARE/SET @var 는 mysql2 execute(prepared statement)에서 불가 → 단순 ALTER 사용
-- 컬럼이 없으면 errno 1091 로 스킵됨

ALTER TABLE `users` DROP COLUMN `graduation_year`;

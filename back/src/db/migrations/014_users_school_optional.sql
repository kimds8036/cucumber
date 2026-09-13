-- 가입 시 학교·학적 미선택 허용 (학생증 인앱 인증 때 설정)
-- school_id NULL + FK ON DELETE SET NULL
-- 동적 DROP FK는 mysql2 prepared protocol 미지원 → applyUsersSchoolOptional014.js 훅에서 처리

SELECT 1;

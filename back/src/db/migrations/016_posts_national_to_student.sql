-- 016: 기존 전국(national) 게시글을 학생 보드(student)로 이관
-- 개방 가입 전 커뮤니티 글은 학생 인증 레이어에 유지. 이후 「전체」는 신규 national.
-- 본문 UPDATE는 applyPostsNationalToStudent016.js 훅에서 수행
SELECT 1;

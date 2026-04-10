-- cache-only 시간표 전환: 서버 DB 시간표 테이블 제거
-- 주의: 이 마이그레이션 적용 후 기존 사용자 시간표 데이터는 DB에서 복구할 수 없습니다.
DROP TABLE IF EXISTS timetables;

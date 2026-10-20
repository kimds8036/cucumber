-- 시간표 저장본을 학년도·학기 행으로 나눈다. 기존 한 행은 updated_at(KST)이 속한 학기로 옮긴다.
ALTER TABLE user_timetable_overrides
  ADD COLUMN academic_year SMALLINT NULL COMMENT '학년도(3월 시작 연도)' AFTER user_id,
  ADD COLUMN semester TINYINT NULL COMMENT '1 또는 2' AFTER academic_year;

UPDATE user_timetable_overrides
SET
  academic_year = IF(
    MONTH(CONVERT_TZ(updated_at, '+00:00', '+09:00')) >= 3,
    YEAR(CONVERT_TZ(updated_at, '+00:00', '+09:00')),
    YEAR(CONVERT_TZ(updated_at, '+00:00', '+09:00')) - 1
  ),
  semester = IF(
    MONTH(CONVERT_TZ(updated_at, '+00:00', '+09:00')) BETWEEN 3 AND 7,
    1,
    2
  )
WHERE academic_year IS NULL OR semester IS NULL;

ALTER TABLE user_timetable_overrides
  MODIFY academic_year SMALLINT NOT NULL COMMENT '학년도(3월 시작 연도)',
  MODIFY semester TINYINT NOT NULL COMMENT '1 또는 2';

ALTER TABLE user_timetable_overrides
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (user_id, academic_year, semester);

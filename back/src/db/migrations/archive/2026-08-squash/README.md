# 2026-08 squash archive

`004_install_landing_daily_stats.sql` ~ `010_user_timetable_sync.sql`.

**실행되지 않습니다.** `migrate.js`는 `migrations/` 루트의 `.sql`만 읽습니다.

현재 스키마는 `../../001_init.sql` 한 파일입니다.
기존 DB에 빠진 테이블·컬럼이 있으면 `migrate.js`의 스쿼시 델타 보정이 멱등으로 채웁니다.

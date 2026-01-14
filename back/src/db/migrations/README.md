# 데이터베이스 마이그레이션

이 폴더에 SQL 스키마 파일을 작성하세요.

## 사용 방법

1. `schema.sql` 파일을 이 폴더에 생성
2. SQL 스키마 작성 (CREATE TABLE 등)
3. `npm run migrate` 실행

## 파일 명명 규칙

- `001_schema.sql` - 초기 스키마
- `002_add_users_table.sql` - 사용자 테이블 추가
- `003_add_posts_table.sql` - 게시글 테이블 추가
- 등등...

파일명은 알파벳 순서로 실행되므로 숫자로 순서를 지정해주세요.

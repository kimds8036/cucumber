# Cucumber Backend

Node.js + Express + MySQL 백엔드 서버

## 설치

```bash
npm install
```

## 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=cucumber_db

PORT=3000
NODE_ENV=development
```

## 데이터베이스 스키마 작성

1. `src/db/migrations/` 폴더에 SQL 파일 작성
2. 파일명은 `001_schema.sql`, `002_add_table.sql` 형식으로 번호를 매겨주세요
3. `npm run migrate` 실행하여 스키마 적용

## 실행

```bash
# 개발 모드 (파일 변경 시 자동 재시작)
npm run dev

# 프로덕션 모드
npm start
```

## API 엔드포인트

- `GET /health` - 서버 상태 확인
- `GET /api/test-db` - 데이터베이스 연결 테스트

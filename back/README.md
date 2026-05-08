# Cucumber Backend

Node.js + Express + MySQL 백엔드 서버

> 💡 **핸드폰(공기계)에서 서버 실행하려면?**  
> `SETUP_PHONE.md` 파일을 참고하세요. Termux에서 처음부터 설정하는 방법이 상세히 나와있습니다.

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

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
```

자세한 내용은 `docs/ENV_EXAMPLE.md`를 참고하세요.

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

### 공통
- `GET /health` - 서버 상태 확인
- `GET /api/test-db` - 데이터베이스 연결 테스트

### 인증 API
- `POST /api/auth/send-verification` - 전화번호 인증 코드 발송
- `POST /api/auth/verify-phone` - 전화번호 인증 코드 확인
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/verify-student` - 학생 인증 (인증 필요)
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃 (인증 필요)

### 인증 헤더
인증이 필요한 API는 요청 헤더에 다음을 포함해야 합니다:
```
Authorization: Bearer {JWT_TOKEN}
```

## 팀원 공유 테스트 방법
1. Docker 켜기: `docker start redis-bull cucumber-mysql`
2. 백엔드 실행: `cd back && npm run dev`
3. ngrok 실행: `ngrok http 3000`
4. 팀원한테 ngrok 주소 전달
5. 팀원 front `api.js`에서 `baseURL`을 ngrok 주소로 변경
6. 작업 끝나면 ngrok 종료, `api.js` `baseURL` 원래대로 복구

### ngrok 없이 같은 Wi‑Fi에서만 테스트 (업로드 실패 시)
- PC에서 `ipconfig`(Windows) 등으로 **IPv4 주소** 확인 (예: `192.168.45.12`).
- 프론트 `app.json` → `expo.extra.apiBaseUrl`을 `http://(위 IP):3000`으로 바꾼 뒤 **Expo 재시작** (`npx expo start --clear` 권장).
- 백엔드는 기본으로 **`0.0.0.0:PORT`** 에 바인딩한다. `LISTEN_HOST=127.0.0.1` 로 바꾸면 폰에서 접속 불가.
- **게시글 등록 버튼**을 눌렀을 때 백엔드 터미널에 `[HTTP] POST /api/posts` 가 보이면 요청이 서버까지 도달한 것이다. 아무 줄도 없으면 URL·방화벽·Wi‑Fi·cleartext 문제를 의심한다.
- **로컬 IP에서만 성공하고 ngrok에서만 Network Error**면 터널/프록시 제한 가능성이 크다.

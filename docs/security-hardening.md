# 보안 강화 작업 로그

이 문서는 백엔드 보안 강화 작업의 **단일 진행 로그**다.
새 PR 이 머지될 때마다 해당 단계의 체크박스를 채우고, 후속 PR 의 결정사항/이슈를 그 아래에 누적한다.

> 위치 변경 금지. 운영 가이드와 묶어서 보려면 `back/docs/` 가 아니라 루트 `docs/` 에 둔다.

---

## ✅ Phase 1 — 기본 보안 골격 (완료)

브랜치: `feat/back-security` → `develop` 머지됨
주요 커밋: `bf64bd2 feat(back): 보안 강화 - JWT/CORS/Helmet/RateLimit/에러핸들러`

### 적용 내역

- [x] **JWT 강화** (`back/src/utils/auth.js`)
  - `JWT_SECRET` 누락 시 부팅 거부 (fail-fast)
  - `JWT_EXPIRES_IN` 기본값 `1h` (운영 `.env` 에서 `7d` 로 오버라이드 중 — Phase 4 에서 refresh 도입 시 `15m` 로 단축 예정)
  - `jwt.sign` / `jwt.verify` 모두 `algorithms: ['HS256']` 명시 → `alg:none` / RS256 swap 공격 차단
  - `verifyToken` 이 만료/위조 시 `TOKEN_EXPIRED` / `INVALID_TOKEN` 으로 throw
- [x] **인증 미들웨어 에러 코드 분기** (`back/src/middleware/auth.js`)
  - `authenticate`: catch 에서 `code: 'TOKEN_EXPIRED' | 'INVALID_TOKEN'` 응답
  - `optionalAuthenticate`: throw 흡수 후 익명 통과
- [x] **소켓 핸드셰이크 동기화** (`back/src/socketServer.js`)
  - `verifyToken` 이 throw 로 바뀐 영향에 맞춰 `code` 기반 에러 전달
- [x] **`back/src/index.js` 보안 미들웨어 묶음**
  - `app.set('trust proxy', 1)` (Railway / ngrok 등 리버스 프록시 뒤에서 `req.ip` 정확)
  - `helmet({ contentSecurityPolicy: false })` (admin / Swagger 인라인 사용)
  - **CORS allowlist** — 운영은 `CORS_ORIGIN` env 만 허용, 모바일 앱(`origin` 헤더 없음) 통과
  - body 사이즈 `1mb` 제한 (json / urlencoded)
  - rate limit
    - `/api/auth` : 15분 / 10회
    - `/api`     : 1분 / 120회 (소켓·폴링 고려)
    - 단일 인스턴스 가정 in-memory store (멀티 인스턴스 시 ioredis 어댑터로 교체 — `// NOTE` 코멘트 남겨둠)
  - **글로벌 에러 핸들러**: CORS 403 분기, 운영 환경에선 메시지 마스킹
- [x] **테스트 API 운영 가드** (`back/src/routes/test.js`)
  - 운영(`NODE_ENV=production`)에선 `ENABLE_TEST_API=true` 가 명시되어야만 응답
- [x] **`back/.env.example` 신규 작성**
  - DB / Redis / JWT / CORS / Firebase / Cloudinary / Cron / 알림 webhook 까지 실제 코드와 일치
- [x] **deps**: `helmet`, `express-rate-limit` 설치

### Phase 1 운영 점검 메모

- 로컬 dev 시작 시 `back/.env` 에 다음 두 줄 필수:
  ```
  JWT_SECRET=<랜덤 48바이트 hex>
  JWT_EXPIRES_IN=7d
  ```
  (운영(Railway) Variables 는 별도 더 긴 랜덤값으로 분리)
- 새 랜덤 시크릿 생성:
  ```
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

---

## ✅ Phase 1.5 — 릴리즈 라인 보호 (완료)

브랜치: `chore/protect-release-branches` → `develop` 머지됨

### 적용 내역

- [x] `.github/workflows/pr-branch-check.yml` 트리거에 `production`, `main` 추가
- [x] `protect-release` 잡 신설 — base 가 `production`/`main` 이고 head 가 `develop` 이 아니면 fail
- [x] **GitHub Settings → Branch protection** 수동 등록 (`production`, `main`)
  - Require PR before merging
  - Require status checks: `check-scope`, `protect-release`
  - Block force pushes / Restrict deletions
- [x] 검증 테스트 (`feat/back-test-block`) 로 production 보호 동작 확인 후 정리

---

## ✅ Phase 2 Step 1 — 입력 검증 (express-validator) — 완료

브랜치: `feat/back-validation` → `develop` 머지됨 (PR #4, 단 base 가 main 으로 잘못 잡혀 main 에 먼저 들어간 뒤 main → develop fast-forward 동기화)
관련 프론트 작업: `feat/front-422-handler` → `develop` 머지됨 (PR #5, 커밋 `cc7c4e2`)

### 설계 원칙

1. **기존 ad-hoc 검증을 갈아엎지 않는다.** 기존 정규식/길이 체크는 그대로 두고 `express-validator` 를 **앞단 게이트**로 추가한다 → 회귀 위험 ≈ 0
2. **422 응답 통일**: `validate()` 미들웨어가 첫 에러 메시지를 `message` 에, 전체를 `errors[]` 에 담아 반환
3. **multer 가 들어가는 라우트**(파일 업로드)는 `multer.array(...) → validate(...)` 순서로 깐다 (multipart 파싱 후에 `req.body` 가 채워짐)
4. 비즈니스 규칙 검증(중복 username, 본인 학교 확인 등) 은 **핸들러 안에 그대로 둔다** — express-validator 는 형식 검증 한정

### 적용 내역 (Step 1)

- [x] `back/src/middleware/validate.js` — 공통 미들웨어 신설
- [x] `back/src/routes/auth.js`
  - [x] `POST /api/auth/login`        → username/password 타입·길이
  - [x] `POST /api/auth/signup`       → 10개 필드 타입·길이·범위
  - [x] `PATCH /api/auth/me/username` → `@` 프리픽스 정리 + 길이
  - [x] `PATCH /api/auth/me/password` → currentPassword/newPassword 길이
- [x] `back/src/routes/inquiries.js`
  - [x] `POST /api/inquiries` → content / contact_email / contact_username / app_version / device_info
- [x] `back/src/routes/posts.js`
  - [x] `POST /api/posts`             → boardType(in: school|national) / content(≤5000) / schoolId / lat / lng
  - [x] `POST /api/posts/:id/report`  → id 정수 + reason/detail 길이
- [x] `back/src/routes/comments.js`
  - [x] `POST /api/posts/:postId/comments` → postId 정수 / content(≤2000) / parentCommentId 정수
- [x] deps: `express-validator` 설치

### Step 2 (예정 — 별도 PR)

> Step 2 는 별도 PR(`feat/back-validation-2`) 로 분리. 아래 "배포 후 할 작업" 섹션의 1번 항목과 동일.

### 프론트 422 인터셉터 (`feat/front-422-handler`, 커밋 `cc7c4e2`)

`frontend/utils/api.js` 에 다음을 추가해 400/422 를 동일 UX 로 처리:

- `API_INPUT_ERROR_HTTP_STATUSES = [400, 422]`
- 응답 인터셉터: 400/422 일 때 `error.response.data.message` 를 `error.userFacingMessage` 로 복사
- 헬퍼: `isApiInputValidationHttpError(error)`, `getApiUserFacingMessage(error, fallback)`
- 기존 화면은 `error.response?.data?.message` 를 쓰고 있어 회귀 없음. 신규 코드는 헬퍼 사용 권장.

### 영향이 있던 라우트

| 라우트 | 응답 변화 | 비고 |
|---|---|---|
| `/api/auth/login` | 빈 입력 시 400 → 422 + `code: 'VALIDATION_ERROR'` | 401(자격 불일치)은 유지 |
| `/api/auth/signup` | 422 + 첫 에러 메시지 | 메시지를 그대로 토스트 가능 |
| `/api/posts (POST)` | boardType 잘못 시 422 | 정상 클라이언트 영향 없음 |

---

## 🗓 Phase 3 — 추가 보강 (장기 계획, 배포 후 작업과 별개)

- [ ] **CSP 점진 적용** — 현재 `helmet` CSP off. admin/Swagger 인라인 정리 후 좁히기
- [ ] **rate-limit-redis + ioredis 어댑터** — 멀티 인스턴스 확장 시점에 적용
- [ ] **로그인 실패 카운트 → 계정 잠금** — 같은 username 으로 10분에 5회 실패 시 임시 잠금
- [ ] **`/api/admin/*` 별도 rate limit** — 관리자 라우트는 더 엄격하게 (분당 30회 등)
- [ ] **공통 SQL 인젝션 회귀 방지 lint 룰** — `pool.query(\`...${...}\`)` 패턴 차단

---

## 🚀 배포 후 할 작업 (Post-Deploy TODO)

Railway 배포 + 학생 베타 테스트 진행 중 / 종료 후 처리할 작업 목록.
완료할 때 체크박스를 채우고 그 아래에 PR 링크/날짜를 남긴다.

### 1. Validation Step 2 — 나머지 라우트 입력 검증

라우트가 많아 두 PR 로 분할:

#### Step 2a — 사용자 핵심 라우트 (브랜치: `feat/back-validation-2a`)

- [x] `back/src/routes/messages.js`
  - `POST /rooms` (postId / otherUserId 정수)
  - `POST /rooms/:roomId/messages` (roomId 정수, content ≤ 2000, parent_message_id 정수)
  - `PUT /rooms/:roomId/read`, `DELETE /rooms/:roomId`, `DELETE /:messageId` (param 정수)
- [x] `back/src/routes/friends.js`
  - `POST /requests` (username 1-50)
  - `POST /requests/:id/accept|reject`, `DELETE /:friendUserId`, `POST /:friendUserId/block` (param 정수)
- [x] `back/src/routes/timer.js`
  - `POST /day` (dayKey 1-32, totalElapsedMs ≥ 0, sessions/subjects/tasks 배열)
  - `POST /subjects` (dayKey, name 1-100, color ≤ 20)
  - `POST /tasks` (dayKey, content 1-500, subjectId 정수, status enum)
  - `PATCH /tasks/:taskId` (taskId 정수, status enum)
  - `DELETE /subjects/:subjectId`, `DELETE /tasks/:taskId` (param 정수)
- [x] `back/src/routes/timetable.js`
  - `PUT /` (timetable 객체, ≤ 200 keys, 각 값 ≤ 50자)
- [x] `back/src/routes/dm.js`
  - `POST /rooms` (otherUserId 정수)
  - `POST /rooms/:roomId/messages` (roomId 정수, content ≤ 2000, parent_message_id 정수)
  - `PUT /rooms/:roomId/read`, `DELETE /rooms/:roomId`, `DELETE /messages/:messageId` (param 정수)

#### Step 2b — 검색/관리자/계정 라우트 (브랜치: `feat/back-validation-2b`)

- [ ] `back/src/routes/users.js` — 검색 q, 프로필 변경 페이로드
- [ ] `back/src/routes/search.js` — q 길이, 페이징 한도
- [ ] `back/src/routes/schools.js` — school id 길이/형식
- [ ] `back/src/routes/adminInquiries.js`, `adminReports.js` — admin 액션 페이로드

### 2. Refresh Token 도입 (백 + 프론트 동시 작업)

현재는 access token 단일 (`JWT_EXPIRES_IN=7d`) 운영. 학생 테스트가 안정화된 다음 단축 + refresh 도입.

- [ ] **백엔드** (`feat/back-refresh-token`)
  - `refresh_tokens` 테이블 (user_id, token_hash, device_id, expires_at, revoked_at)
  - `POST /api/auth/refresh` 엔드포인트 — refresh 검증 후 access 재발급 + rotate
  - `POST /api/auth/logout` 에서 해당 디바이스 refresh revoke
  - 강제 로그아웃 / 디바이스별 revoke admin API
  - access TTL 을 `15m` 로 단축, refresh TTL `30d`
- [ ] **프론트엔드** (`feat/front-token-interceptor`)
  - axios 응답 인터셉터에서 `401 + code: 'TOKEN_EXPIRED'` 시 자동 refresh
  - 동시 요청 race 처리 (refresh in-flight queue)
  - refresh 실패 시 `clearAuthToken()` + 로그인 화면으로 reset
- [ ] **운영 변수**
  - `JWT_REFRESH_SECRET` — JWT_SECRET 과 다른 별도 시크릿
  - `JWT_REFRESH_EXPIRES_IN=30d`
  - `JWT_EXPIRES_IN` 을 운영에서 `15m` 로 변경

### 3. main / production 보호 규칙 status check 점검

PR #4, #5 가 `protect-release` 워크플로우에도 불구하고 main 에 머지된 정황이 있어 한 번 더 점검 필요.

- [ ] GitHub Settings → Branches → `main` rule
  - "Require status checks to pass before merging" ON
  - 검색창에 `protect-release`, `check-scope` 추가
- [ ] 동일하게 `production` rule 점검
- [ ] (자동화) 임시 브랜치로 base=main PR 한 번 만들어서 머지 차단되는지 검증

### 4. bcrypt saltRounds 10 → 12 상향

현재 `back/src/utils/auth.js` 의 `hashPassword` 가 `bcrypt.hash(pw, 10)` 으로 호출됨 (확인 필요).

- [ ] `back/src/utils/auth.js` — saltRounds 12 로 상향
- [ ] 기존 사용자 비밀번호는 그대로 (bcrypt 는 verify 시 해시 안에 저장된 cost 를 사용 → 호환성 OK)
- [ ] 다음 비밀번호 변경/회원가입 시점부터 12 cost 로 저장됨
- [ ] 로그인 응답 시간 지연 측정 (12 cost 는 ~250ms, 운영 CPU 부하 확인)

> 상향 시점: Refresh token 도입과 함께 같은 PR 에서 처리하면 회귀 테스트 한 번에 끝낼 수 있음.

### 5. Multer 파일 타입 / 사이즈 제한 점검

현재 멀티파트 업로드를 받는 라우트:

- `back/src/routes/posts.js` — `upload.array('images', 5)`
- `back/src/routes/comments.js` — `upload.array('images', 5)`
- `back/src/routes/inquiries.js` — `uploadInquiry.array('images', 3)` (5MB/장 명시)
- `back/src/routes/messages.js` — 채팅 첨부 (확인 필요)
- `back/src/routes/auth.js` — `/ocr` 학생증 (확인 필요)
- `back/src/routes/users.js` — 프로필 (확인 필요)

- [ ] 모든 multer 인스턴스에 `limits.fileSize` 명시 (이미지 ≤ 5MB, OCR 이미지 ≤ 10MB 등)
- [ ] `fileFilter` 또는 CloudinaryStorage `allowed_formats` 로 MIME 화이트리스트
  - 이미지: `image/jpeg`, `image/png`, `image/webp`
  - OCR 학생증만 별도 허용 (필요 시 PDF)
- [ ] 파일 개수 한도 명시 (`upload.array('images', N)`)
- [ ] body limit 1MB 와의 충돌 여부 점검 — multipart 는 별도 라우트라 영향 없을 텐데 한 번 확인
- [ ] 거부 응답 통일: `LIMIT_FILE_SIZE` / `LIMIT_FILE_COUNT` → 422 로 변환하는 multer 에러 미들웨어 추가

---

## 운영 변수 체크리스트

배포 전(특히 Railway production) 반드시 확인:

| 변수 | 필수 | 설명 |
|---|---|---|
| `NODE_ENV` | ✅ | `production` |
| `JWT_SECRET` | ✅ | 32자 이상 랜덤 (개발과 다른 값) |
| `JWT_EXPIRES_IN` | - | 미설정 시 `1h`. 현재 운영은 `7d` 로 두는 중 (Phase 4 에서 단축 예정) |
| `CORS_ORIGIN` | ✅ | 콤마 구분 — admin 도메인, 웹 도메인 등 |
| `ENABLE_TEST_API` | ✅ | `false` (테스터 디버깅 시에만 임시 `true`) |
| `DB_PASSWORD` | ✅ | |
| `REDIS_PASSWORD` | (Redis 사용 시) | |
| `FIREBASE_*` 또는 `FIREBASE_SERVICE_ACCOUNT_PATH` | ✅ | 알림 작동에 필수 |
| `CLOUDINARY_*` | ✅ | 이미지 업로드에 필수 |

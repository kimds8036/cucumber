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

## 🛠 Phase 2 — 입력 검증 (express-validator) — 진행 중

브랜치: `feat/back-validation`
PR 대상: `develop`

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

### Step 2 (다음 PR 후보)

- [ ] `back/src/routes/messages.js` — DM/그룹 메시지 본문 길이
- [ ] `back/src/routes/friends.js` — 친구 요청/응답 페이로드
- [ ] `back/src/routes/timer.js` — start/stop payload, day_key 형식
- [ ] `back/src/routes/timetable.js` — 시간표 슬롯 인덱스 범위
- [ ] `back/src/routes/dm.js` — DM 룸 생성/조회 파라미터
- [ ] `back/src/routes/adminInquiries.js`, `adminReports.js` — admin 액션 페이로드
- [ ] `back/src/routes/users.js` — 검색/프로필 변경 파라미터
- [ ] `back/src/routes/search.js`, `schools.js` — 쿼리 파라미터 범위/길이

> Step 2 는 별도 PR (`feat/back-validation-2`) 로 분리 — 한 PR 에 너무 많은 라우트가 묶이면 리뷰가 어려움.

### 알려진 영향 (프론트 측 확인 필요)

| 라우트 | 새 응답 | 기존 응답 | 프론트 처리 |
|---|---|---|---|
| `/api/auth/login` | 422 + `code: 'VALIDATION_ERROR'` | 400 | username/password 비어있을 때 토스트 메시지 출처 변경. 기존 401(자격 불일치)은 유지. |
| `/api/auth/signup` | 422 + first error msg | 400 | 동일 — 메시지는 그대로 토스트하면 됨 |
| `/api/posts (POST)` | 422 boardType 잘못됨 | 400 | 정상 클라이언트는 영향 없음 |

422 가 발생하면 글로벌 axios 인터셉터가 `error.response.data.message` 를 그대로 토스트할지 확인 필요. (현재 `frontend/utils/api.js` 가 이 포맷을 다룬다고 가정하지만, 다음 PR 머지 후 한번 검증.)

---

## 🗓 Phase 3 — 추가 보강 (계획)

- [ ] **CSP 점진 적용** — 현재 `helmet` CSP off. admin/Swagger 인라인 정리 후 좁히기
- [ ] **rate-limit-redis + ioredis 어댑터** — 멀티 인스턴스 확장 시점에 적용
- [ ] **로그인 실패 카운트 → 계정 잠금** — 같은 username 으로 10분에 5회 실패 시 임시 잠금
- [ ] **`/api/admin/*` 별도 rate limit** — 관리자 라우트는 더 엄격하게 (분당 30회 등)
- [ ] **express-validator Step 2** (위 라우트들 전부)
- [ ] **공통 SQL 인젝션 회귀 방지 lint 룰** — `pool.query(\`...${...}\`)` 패턴 차단

---

## 🗓 Phase 4 — Refresh Token (별도 작업)

- [ ] `feat/back-refresh-token`: access(15m) + refresh(30d) + DB 저장 + rotate
- [ ] `feat/front-token-interceptor`: axios 인터셉터에서 401 + `TOKEN_EXPIRED` 받으면 자동 refresh
- [ ] 동시 요청 race 처리(refresh in-flight queue)
- [ ] 강제 로그아웃 / 디바이스별 revoke API

> 백엔드·프론트 동시 작업이라 별도 사이클로 분리. Phase 2 완료 후 착수 권장.

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

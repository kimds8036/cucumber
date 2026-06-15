# Youth Paper — 프로덕션 배포 전 최종 검증 체크리스트

작성일: 2026-05-29 (검토 반영: 2026-06-12)  
범위: `back/`, `front/` 코드·문서 기준  
앱 버전 기준: **1.3.0 (versionCode 7)**

---

## 총평 · 배포 승인 의견

**이대로 배포를 진행해도 좋습니다.** 단, **§3.3 🔴 PII 로그 제거**는 v1.3.0 본진에 반드시 포함되어야 합니다.  
보안 사고는 “나중에 고치자”고 남겨둔 디버깅 로그 한 줄에서 시작되는 경우가 많습니다.

| 구분 | 상태 |
|------|------|
| PII·인증번호·OCR raw 로그 | ✅ **v1.3.0 코드 반영 완료** (`auth.js`, `messages.js`) |
| personal-mail-return 실패 웹훅 | ✅ **반영 완료** (`sendBatchFailureAlert` 연동) |
| App-Version 헤더 (방법 A) | ⏳ 배포 후 스프린트 |
| Sentry + Winston | ⏳ 배포 후 스프린트 |
| school-stats Redis 락 | ⏳ 차기 스프린트 (**우선순위 🔴 높음**) |
| 학생증 수동 검수 (OCR → Cloudinary) | ✅ **v1.3.0 반영** (마이그레이션 041) |
| Railway DB Private Networking | 📋 §6 운영 설정 필요 |
| Google OTP 관리자 2FA | ✅ 구현 — `OTP_ENCRYPTION_KEY`·migrate 042 필요 |
| 관리자 CORS_ORIGIN | 📋 §8·§6 — production/develop URL 각각 등록 |

---

## 목차

1. [Cron / 배치 작업 현황](#1-cron--배치-작업-현황)
2. [강제 업데이트 — 방법 A + B 하이브리드](#2-강제-업데이트--방법-a--b-하이브리드)
3. [로깅 현황 · PII 제거 · Sentry/Winston](#3-로깅-현황--pii-제거--sentrywinston)
4. [운영 문서 통합](#4-운영-문서-통합)
5. [배포 직전 실행 체크리스트](#5-배포-직전-실행-체크리스트)
6. [인프라·DB 보안 (Railway)](#6-인프라db-보안-railway)
7. [학생증 수동 검수 플로우](#7-학생증-수동-검수-플로우)
8. [관리자 접속 · OTP 2FA · CORS](#8-관리자-접속--otp-2fa--cors)

---

## 1. Cron / 배치 작업 현황

### 1.1 설계 평가

**Redis 분산 락 (`batchLock.service.js`)** — Railway 멀티 인스턴스에서 스케줄러 중복 실행을 막는 설계로, 소규모 팀이 쓸 수 있는 수준에서 매우 훌륭합니다.

| 항목 | 내용 |
|------|------|
| 스케줄러 | `node-cron` (`back/src/jobs/index.js`) |
| 기동 시점 | Express 서버 시작 시 `initJobs()` (`back/src/index.js`) |
| 멀티 인스턴스 | Redis 분산 락 — study-grass, trending, personal-mail-return |
| 전역 스위치 | `ENABLE_CRON` (기본 `true`) |
| 타임존 | `CRON_TIMEZONE` (기본 `Asia/Seoul`) |

> 인스턴스가 **1개**면 `school-stats`·`timer-session-guard` 락 부재는 당장 문제 없음.  
> **2개 이상**으로 스케일 아웃 시 락 없는 job은 중복 실행 가능.

### 1.2 등록된 Cron Job (5개)

| Job | 파일 | 기본 스케줄 | 역할 | Redis 락 | 실패 알림 |
|-----|------|-------------|------|----------|-----------|
| **study-grass-aggregate** | `jobs/studyGrass.aggregate.js` | `5 * * * *` | 공부 잔디 Redis 집계 | ✅ | ✅ 웹훅 |
| **trending-settle** | `jobs/trending.settle.js` | `*/10 * * * *` | 인기 게시글·해시태그 정산 | ✅ | ✅ 웹훅 |
| **school-stats** | `jobs/schoolStats.js` | `0 * * * *` | schools 통계 UPDATE | ❌ | ❌ |
| **timer-session-guard** | `jobs/timerSession.guard.js` | `*/10 * * * *` | 타이머 stale·마라톤 정리 | ❌ | ❌ |
| **personal-mail-return** | `jobs/personalMail.return.js` | `0 4 * * *` | 개인우편 미열람 반송 | ✅ | ✅ **웹훅 (v1.3.0 반영)** |

### 1.3 보완 의견 (우선순위 반영)

| 항목 | 내용 | 우선순위 |
|------|------|----------|
| **school-stats Redis 락** | 인스턴스 2개 시 `schools` 대량 UPDATE 중복 부하 가능 → 차기 스프린트에서 **높음**으로 격상 | 🔴 **높음** |
| **personal-mail-return 웹훅** | 데이터 정산 실패 시 슬랙/디스코드 즉시 알림 — `sendBatchFailureAlert` 연동 완료 | ✅ 완료 |
| **BATCH_ALERT_WEBHOOK_URL** | production·develop 각각 설정 권장 | 운영 설정 |
| 만료 토큰 cleanup cron | `signup_verification_tokens`, `account_recovery_tokens` | 🔴 높음 |
| `phone_verifications` 정리 | 가입·인증 레코드 누적 | 🟡 중간 |
| timer-session-guard 웹훅 | 운영 누락 방지 | 🟢 낮음 |

### 1.4 관련 환경 변수

```env
ENABLE_CRON=true
CRON_TIMEZONE=Asia/Seoul
BATCH_ALERT_WEBHOOK_URL=   # 슬랙/디스코드 웹훅 — study-grass, trending, personal-mail-return 실패 시
PERSONAL_MAIL_RETURN_DAYS=1
```

전체 목록: `back/.env.example`

### 1.5 Cron이 아닌 백그라운드

| 구분 | 파일 | 방식 |
|------|------|------|
| FCM·알림 | `utils/notificationWorker.js` | Bull + Redis 상시 워커 |
| Socket.io | `socketServer.js` | 실시간 연결 |

### 1.6 Cron 배포 전 확인

- [ ] Production Railway `ENABLE_CRON=true`
- [ ] `BATCH_ALERT_WEBHOOK_URL` 설정 (3개 job 실패 알림)
- [ ] `PERSONAL_MAIL_RETURN_DAYS` 운영 의도 일치
- [ ] Redis 연결 정상 (락·Bull·rate limit)
- [ ] Railway 로그 `[BatchJob] started` 확인

---

## 2. 강제 업데이트 — 방법 A + B 하이브리드

### 2.1 현재 구현 (방법 B — UX 게이트)

| 계층 | 구현 | 파일 |
|------|------|------|
| 프론트 | 앱 실행 직후 `GET /api/app/version-check` | `ForceUpdateGate.jsx` |
| 백엔드 | `MIN_ANDROID_VERSION` semver 비교 | `back/src/routes/app.js` |
| UX | 구버전 → 전체 화면 차단 + 스토어 이동 | `ForceUpdateGate.jsx` |

→ **일반 사용자 UX 통제**에 적합.

### 2.2 방법 A — API 미들웨어 (보안 장벽)

- 모든 요청 헤더: `App-Version: 1.3.0`
- 백엔드가 구버전에 **426 Upgrade Required**
- → **API 직접 호출·백그라운드 우회** 원천 차단

### 2.3 하이브리드 전략 (적극 찬성)

| 계층 | 역할 |
|------|------|
| **ForceUpdateGate (B)** | 앱 켤 때 친절한 전면 차단 UX |
| **App-Version 미들웨어 (A)** | 구버전의 API 호출 자체를 막는 보안 장벽 |

**병행 권장** — v1.3.0 배포 시점에는 B만으로도 가능. **방법 A**는 `back/src/middleware/requireMinAppVersion.js`로 코드 반영 완료 (Railway env·E2E는 §2.5).

### 2.4 미들웨어 구현 시 화이트리스트 주의

`/health`, `/api/app/version-check` 외에도 **비로그인 허용 경로**를 빠짐없이 넣어야 앱 진입이 터지지 않습니다. 구현: `back/src/middleware/requireMinAppVersion.js`.

| 예외 후보 | 이유 |
|-----------|------|
| `/health` | Railway 헬스체크 |
| `/api/app/version-check` | 강제 업데이트 판별 |
| 회원가입·인증 관련 | `POST /api/auth/signup/*`, `verify-firebase-phone`, `verify-student-id` 등 |
| 약관·공지 정적 API | 비로그인 조회 |
| `/admin/*` | 관리자 웹 (별도 인증) |

화이트리스트 누락 시 **신규 가입·로그인 전 단계에서 426** → 반드시 E2E로 검증.

### 2.5 방법 A 도입 체크 (배포 후 스프린트)

- [x] `front/utils/api.js` — `App-Version` / `App-Platform` 헤더
- [x] `back/src/middleware/requireMinAppVersion.js` + `back/src/index.js` 마운트 + 화이트리스트
- [x] 426 → `api.js` 공통 핸들러 (스토어 링크 Alert)
- [ ] develop Railway `MIN_ANDROID_VERSION=1.0.0` 유지 (배포 시 확인)
- [ ] 구버전 앱으로 로그인·게시판·가입 플로우 E2E

---

## 3. 로깅 현황 · PII 제거 · Sentry/Winston

### 3.1 권장 스택 (소규모 팀)

| 도구 | 역할 |
|------|------|
| **Sentry (프론트)** | RN 크래시·JS 예외, 무료 플랜으로 시작 |
| **Winston (백엔드)** | 레벨 + **한글 message** → Railway stdout |
| **Railway Logs** | 실시간 tail, `[BatchJob]` 필터 |
| **BATCH_ALERT_WEBHOOK_URL** | 배치 실패 즉시 알림 |

ELK·자체 로그 서버는 **당장 불필요**.

### 3.2 v1.3.0 배포 전 필수 — PII 로그 (🚨)

**Railway 콘솔·로그 파일 유출 시 즉시 개인정보 사고로 이어질 수 있는 항목.**

| 위치 | 내용 | v1.3.0 |
|------|------|--------|
| `auth.js` | `${phone}로 인증 코드 발송: ${code}` | ✅ **삭제** |
| `auth.js` | OCR raw 800자 + checks (학교명 등) | ✅ **raw 삭제**, dev+`ENABLE_OCR_DEBUG`만 비PII 요약 |
| `auth.js` | `GET /api/auth/me` 상세 로그 | ✅ **삭제** |
| `auth.js` | 로그인 JWT 토큰 평문 로그 | ✅ **삭제** |
| `messages.js` | `QUERY DEBUG` SQL·PARAMS 덤프 | ✅ **삭제** |
| `personalMail.return.js` | 실패 시 웹훅만 (콘솔 외) | ✅ **추가** |

### 3.3 배포 후 스프린트 — 로그 정리

| 위치 | 내용 | 조치 |
|------|------|------|
| `socketServer.js` | handshake·emit 상세 | production 가드 |
| `messages.js` | GetRoom·ReadChain 디버그 | production 가드 |
| `timer.js` | `TimerTimetablePaint` | production 가드 |
| `notificationWorker.js` | job별 info 로그 | debug 레벨로 |
| 프론트 채팅·FriendContext | verbose console | `__DEV__` 가드 |

### 3.4 Winston 한글 메시지 예시 (향후)

```text
[인증] 전화번호 Firebase 토큰 검증 실패 — 사유: 토큰 만료
[배치] 개인우편 반송 완료 — 처리 12건, 소요 1.2초
[API] 회원가입 실패 — 학교 ID 교차검증 불일치
```

### 3.5 로깅 체크리스트

**v1.3.0 (배포 전)**

- [x] PII·인증번호·OCR raw 로그 제거
- [x] `messages.js` QUERY DEBUG 제거
- [x] personal-mail-return 실패 웹훅
- [ ] `BATCH_ALERT_WEBHOOK_URL` production 설정

**배포 후 스프린트**

- [ ] Socket/메시지 verbose production 가드
- [ ] Sentry RN SDK (`release` = 앱 버전)
- [ ] Winston logger + 글로벌 핸들러

---

## 4. 운영 문서 통합

구 4개 MD → **`WORKFLOW.md`** 단일화 완료.

| 핵심 규칙 | 내용 |
|-----------|------|
| **서버·DB 분리** | develop ↔ production Railway·DB 교차 연결 **금지** (최우선 안전장치) |
| production 반영 | 체리픽 또는 `merge(develop)` — 빌드·배포는 production URL·DB 유지 |
| production push | AAB·Play·`MIN_ANDROID_VERSION` **후** push |

상세: `WORKFLOW.md`

---

## 5. 배포 직전 실행 체크리스트

### 5.1 보안 · 코드 (v1.3.0 필수)

- [x] §3.2 PII 로그 코드 반영
- [x] §7 학생증 수동 검수 (OCR 비활성, Cloudinary 업로드)
- [ ] `npm run migrate` — **041** (`signup_student_id_submissions`)
- [ ] develop/production 각각 백엔드 재배포 후 Railway 로그에 인증번호·OCR raw **미출력** 확인
- [ ] §6 Railway DB Public Networking **Off** + Private URL 확인

### 5.2 Play Console / AAB

- [ ] `production` 브랜치, `npm run android:aab:prod`
- [ ] release keystore 서명 (`[withAndroidReleaseSigning] release 서명 적용`)
- [ ] `app-release.aab` Play 업로드 + `mapping.txt`
- [ ] `RELEASE_NOTES.md` 1.3.0 스토어 문구

### 5.3 Railway production

- [ ] `cd back && npm run migrate` (037~040)
- [ ] `MIN_ANDROID_VERSION=1.3.0` (**AAB 출시 후**)
- [ ] `ENABLE_CRON=true`, Redis, `BATCH_ALERT_WEBHOOK_URL`
- [ ] `ENABLE_TEST_API=false`

### 5.4 Git

- [ ] PII 수정 커밋 → develop → production 반영
- [ ] Play·MIN 버전 후 `git push origin production`

### 5.5 스모크 테스트

- [ ] 로그인·가입(전화·학생증)·게시판·우편·채팅
- [ ] 구버전 강제 업데이트 (`MIN_ANDROID_VERSION` 올린 후)
- [ ] `[BatchJob] started` 로그

### 5.6 배포 후 스프린트

- [ ] App-Version 헤더 + 426 미들웨어
- [ ] school-stats Redis 락
- [ ] 만료 토큰 cleanup cron
- [ ] Sentry + Winston

---

## 6. 인프라·DB 보안 (Railway)

### 6.1 CORS (관리자 페이지)

production·develop **각 서비스** Variables:

```env
# 끝 슬래시 없음. 관리자 HTML이 열리는 Origin과 동일해야 함.
CORS_ORIGIN=https://cucumber-production.up.railway.app
```

develop:

```env
CORS_ORIGIN=https://cucumber-develop.up.railway.app
```

환경 드롭다운으로 한 페이지에서 양쪽 API를 호출할 계획이면, **호출 대상 서버의 CORS_ORIGIN에 관리자 페이지 Origin을 포함**해야 합니다. 상세: `docs/ADMIN_ACCESS.md` §3.

### 6.2 Railway DB 네트워크 (가장 시급)

| 항목 | 권장 설정 |
|------|-----------|
| **Public Networking** | Railway DB 서비스 → Settings → Networking → **Off** (DBeaver 등 외부 직접 접속 차단) |
| **Private Networking** | 같은 프로젝트 내 백엔드 ↔ DB는 `*.railway.internal` 내부망 사용 |
| **백엔드 env** | `DB_PRIVATE_HOST` / `DB_PRIVATE_PORT` 우선 (`back/src/config/database.js` 반영) |
| **Secrets** | `DB_PASSWORD`, `JWT_SECRET` 등은 Railway Variables만 — **Git 커밋 금지** |
| **환경 분리** | develop·production DB·비밀번호 **완전 분리** (`WORKFLOW.md` §1) |

로컬 PC에서 Railway DB에 붙을 때만 public TCP proxy를 쓰고, **운영 백엔드는 private만** 사용하세요.

### 6.3 DB 내부 데이터 보호

| 데이터 | 현재·권장 |
|--------|-----------|
| **비밀번호** | ✅ `bcrypt` 단방향 해시 (`back/src/utils/auth.js`) — 평문 저장 없음 |
| **전화번호·이름 등** | ⚠️ 현재 DB 평문 — 장기적으로 AES-256-GCM 등 **애플리케이션 단 양방향 암호화** 검토 (키는 서버 env, DB와 분리) |
| **학생증 이미지** | Cloudinary private folder `focux/signup-student-id` — 관리자 API로만 조회 |

DB Raw 덤프가 유출돼도 비밀번호는 복호화 불가. PII 평문 암호화는 배포 후 스프린트 후보.

### 6.4 애플리케이션·인프라

| 항목 | 현재 상태 |
|------|-----------|
| **SQL Injection** | ✅ `mysql2` parameterized query (`pool.execute(?, ?)`) |
| **Rate Limiting** | ✅ 가입·OCR 업로드·전화 인증·recovery (`signupRateLimit.js`, Redis) |
| **DB 계정 최소 권한** | 📋 운영 DB 유저에 ALTER/DROP 제한 권장 (마이그레이션은 별도 계정) |
| **민감 로그** | ✅ §3.2 PII 제거 반영 |

---

## 7. 학생증 수동 검수 플로우

OCR 자동 인증 대신 **촬영 → Cloudinary → 관리자 승인** (v1.3.0).

### 7.1 사용자 플로우

1. 전화 인증 완료 → **학생증 제출** 선택
2. 학생증 촬영 → `POST /api/auth/signup/upload-student-id`
3. **학교 검색·선택** (`SignStepSchoolSelect`)
4. 계정·학년 정보 입력 → `POST /api/auth/signup`
5. `student_verified=FALSE` 가입 → 관리자 승인 후 `TRUE`

### 7.2 DB (마이그레이션 041)

| 테이블 | 역할 |
|--------|------|
| `signup_verification_tokens` | `token_type=student_id_manual`, `cloudinary_url` 저장 |
| `signup_student_id_submissions` | 가입 후 검수 대기 (`pending` / `approved` / `rejected`) |

### 7.3 관리자 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/admin/signup-student-ids?status=pending` | 대기 목록 |
| PATCH | `/api/admin/signup-student-ids/:id` | 승인·반려 (`schoolId` 수정 가능) |

`ADMIN_USER_IDS` env에 관리자 user id 등록 필요. 승인 시 `users.student_verified=TRUE`.

### 7.4 OCR 코드

- `back/src/routes/auth.js` — CLOVA OCR 라우트 **주석 처리**, `upload-student-id` 사용
- `back/src/services/studentIdOcr.service.js` — 보관 (재활성화 시 복구)

### 7.5 배포 체크

- [ ] develop·production `npm run migrate` (041)
- [ ] Cloudinary env (`CLOUDINARY_*`) production 설정
- [ ] 관리자가 pending 목록·이미지 URL 확인 가능한지 스모크 테스트

---

## 8. 관리자 접속 · OTP 2FA · CORS

**상세 설계:** [`docs/ADMIN_ACCESS.md`](docs/ADMIN_ACCESS.md)

### 8.1 현재 vs 목표

| | 현재 | 목표 (Google OTP) |
|---|------|-------------------|
| 로그인 | ID + PW | ID + PW + **6자리 OTP** |
| 권한 | `ADMIN_USER_IDS` env | 동일 (또는 향후 `users.role`) |
| OTP secret | 없음 | DB 암호화 저장 (`OTP_ENCRYPTION_KEY`) |
| develop/prod 전환 | URL 직접 접속 | 관리자 UI **드롭다운** (계획) |

### 8.2 Railway Production / Develop 공통 변수

```env
CORS_ORIGIN=https://cucumber-production.up.railway.app   # 환경별 URL로 교체
JWT_SECRET=...
OTP_ENCRYPTION_KEY=...    # OTP 구현 후 필수
ADMIN_USER_IDS=1,2
ENABLE_CRON=true
ENABLE_TEST_API=false
```

`JWT_SECRET`, `OTP_ENCRYPTION_KEY`, `ADMIN_USER_IDS`는 **develop·production 값을 서로 다르게**.

### 8.3 배포 시 필수 (OTP 구현 반영)

- [ ] `npm run migrate` — **042** (`admin_totp_secrets`)
- [ ] `OTP_ENCRYPTION_KEY` develop·production **각각** 다른 값 설정
- [ ] `ADMIN_USER_IDS` 각 DB user id와 일치
- [ ] `CORS_ORIGIN` (코드에 기본 admin URL 포함, env에도 명시 권장)
- [ ] `/admin/login` → 최초 QR 등록 → OTP 로그인 테스트

상세: `docs/ADMIN_ACCESS.md`

---

## 부록: 관련 파일

| 주제 | 경로 |
|------|------|
| Cron | `back/src/jobs/index.js` |
| 배치 락 | `back/src/services/batchLock.service.js` |
| 배치 알림 | `back/src/services/batchAlert.service.js` |
| 강제 업데이트 | `back/src/routes/app.js`, `back/src/middleware/requireMinAppVersion.js`, `front/components/common/ForceUpdateGate.jsx`, `front/utils/api.js` |
| 인증·PII 수정 | `back/src/routes/auth.js` |
| 학생증 업로드 | `back/src/services/signupStudentIdPhoto.service.js` |
| 학생증 검수 API | `back/src/routes/adminSignupStudentIds.js` |
| DB 연결 (private) | `back/src/config/database.js` |
| 관리자·OTP 설계 | `docs/ADMIN_ACCESS.md` |
| 관리자 웹 | `back/src/routes/adminWeb.js`, `admin/Focux admin.html` |
| 레포 규칙 | `WORKFLOW.md` |
| Android 빌드 | `front/BUILD_ANDROID.md` |

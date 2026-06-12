# Youth Paper — 프로덕션 배포 전 최종 검증 체크리스트

작성일: 2026-05-29  
범위: `back/`, `front/` 코드·문서 기준 (코드 수정 없이 점검만 수행)  
앱 버전 기준: **1.3.0 (versionCode 7)**

---

## 목차

1. [Cron / 배치 작업 현황](#1-cron--배치-작업-현황)
2. [강제 업데이트 — 방법 A (App-Version 헤더) 적용 가능성](#2-강제-업데이트--방법-a-app-version-헤더-적용-가능성)
3. [로깅 현황 · 정리 · Sentry/Winston 권장](#3-로깅-현황--정리--sentrywinston-권장)
4. [운영 문서 4종 통합 검토](#4-운영-문서-4종-통합-검토)
5. [배포 직전 실행 체크리스트](#5-배포-직전-실행-체크리스트)

---

## 1. Cron / 배치 작업 현황

### 1.1 실행 위치

| 항목 | 내용 |
|------|------|
| 스케줄러 | `node-cron` (`back/src/jobs/index.js`) |
| 기동 시점 | Express 서버 시작 시 `initJobs()` (`back/src/index.js`) |
| 멀티 인스턴스 | Redis 분산 락 (`batchLock.service.js`) — study-grass, trending, personal-mail-return |
| 전역 스위치 | `ENABLE_CRON` (기본 `true`, `false`면 cron 미기동) |
| 타임존 | `CRON_TIMEZONE` (기본 `Asia/Seoul`) |

> Railway에서 API 인스턴스가 2개 이상이면 **락 없는 job**은 중복 실행될 수 있음. 현재 `schoolStats`, `timerSession.guard`는 락 없음.

### 1.2 등록된 Cron Job (5개)

| Job | 파일 | 기본 스케줄 (cron) | 역할 | Redis 락 | 실패 알림 |
|-----|------|-------------------|------|----------|-----------|
| **study-grass-aggregate** | `jobs/studyGrass.aggregate.js` | `5 * * * *` (매시 5분) | 전날 공부 잔디 집계 → Redis | ✅ | ✅ (`BATCH_ALERT_WEBHOOK_URL`) |
| **trending-settle** | `jobs/trending.settle.js` | `*/10 * * * *` (10분) | 인기 게시글·해시태그 Redis 정산 | ✅ | ✅ |
| **school-stats** | `jobs/schoolStats.js` | `0 * * * *` (매시 정각) | `schools` 테이블 학생·게시글·우편 수 집계 | ❌ | ❌ (console.error만) |
| **timer-session-guard** | `jobs/timerSession.guard.js` | `*/10 * * * *` (10분) | 타이머 세션 마라톤 클램프·stale 종료 | ❌ | ❌ |
| **personal-mail-return** | `jobs/personalMail.return.js` | `0 4 * * *` (매일 04:00 KST) | 개인우편 N일 미열람 반송 | ✅ | ❌ (logBatchFailure만) |

### 1.3 관련 환경 변수 (`back/.env.example`)

```env
ENABLE_CRON=true
CRON_TIMEZONE=Asia/Seoul
CRON_STUDY_GRASS=5 * * * *
CRON_TRENDING_SETTLE=*/10 * * * *
CRON_SCHOOL_STATS=0 * * * *
CRON_TIMER_GUARD=*/10 * * * *
CRON_PERSONAL_MAIL_RETURN=0 4 * * *
PERSONAL_MAIL_RETURN_DAYS=1
CRON_TIMER_STALE_MINUTES=60
CRON_TIMER_MAX_OPEN_HOURS=15
CRON_TIMER_MARATHON_CLAMP=true
CRON_TIMER_STALE_CLOSE=true
BATCH_ALERT_WEBHOOK_URL=   # 슬랙/디스코드 웹훅 (선택)
```

### 1.4 Cron이 **아닌** 백그라운드 작업

| 구분 | 파일 | 방식 |
|------|------|------|
| FCM·알림 큐 | `utils/notificationWorker.js` | **Bull + Redis** 상시 워커 (cron 아님) |
| Socket.io | `socketServer.js` | 실시간 연결 |

### 1.5 추가 검토 권장 Cron (미구현)

| 후보 | 이유 | 우선순위 |
|------|------|----------|
| `signup_verification_tokens` / `account_recovery_tokens` 만료 행 정리 | 1회용 JWT 보조 테이블 누적 방지 (마이그레이션 039·040) | 🔴 높음 |
| `phone_verifications` 만료 행 정리 | 가입·인증 레코드 누적 | 🟡 중간 |
| 가입 증명서(`signup_certificate_submissions`) 미처리 알림 | 관리자 검수 SLA | 🟡 중간 |
| `school-stats`에 Redis 락 추가 | 멀티 인스턴스 중복 UPDATE 방지 | 🟡 중간 |
| `timer-session-guard` 실패 웹훅 | 운영 누락 방지 | 🟢 낮음 |
| 등교 배너 관련 집계 | 프론트만 있고 백엔드 미연결 (`0623fef` 커밋) | 🟢 기능 완성 후 |

### 1.6 Cron 배포 전 확인

- [ ] Production Railway `ENABLE_CRON=true` 확인
- [ ] `BATCH_ALERT_WEBHOOK_URL` 설정 여부 (study-grass·trending 실패 시 알림)
- [ ] `PERSONAL_MAIL_RETURN_DAYS` 운영 의도와 일치하는지
- [ ] Redis 연결 정상 (cron 락·Bull·rate limit 공용)
- [ ] Railway 로그에서 `[BatchJob] started ...` 부팅 메시지 확인

---

## 2. 강제 업데이트 — 방법 A (App-Version 헤더) 적용 가능성

### 2.1 현재 구현 (방법 B에 가까움)

| 계층 | 구현 | 파일 |
|------|------|------|
| 프론트 | 앱 **실행 직후 1회** `GET /api/app/version-check?platform=&version=` | `front/components/common/ForceUpdateGate.jsx` |
| 백엔드 | `MIN_ANDROID_VERSION` / `MIN_IOS_VERSION` env와 semver 비교 | `back/src/routes/app.js` |
| UX | 구버전이면 **전체 화면 차단** + 스토어 이동 (`phase === 'force'`) | `ForceUpdateGate.jsx` |
| API 호출 | **모든 요청에 App-Version 헤더 없음** | `front/utils/api.js` |

`ForceUpdateGate`는 `__DEV__`에서는 검사 생략. production 백엔드에서 version-check 실패 시 에러 화면, develop URL이면 통과.

### 2.2 제안하신 방법 A 요약

- 모든 API 요청 헤더: `App-Version: 1.3.0`
- 백엔드 미들웨어가 `/api/app/version-check` 외 **모든 API**에서 버전 검사
- `MIN_ANDROID_VERSION` 미만이면 **426 Upgrade Required** (또는 403/400 + message)
- 앱은 켜지지만 로그인·게시판 등 **API 전부 실패** → 사실상 먹통

### 2.3 적용 가능 여부: **가능 (권장)**

| 항목 | 판단 |
|------|------|
| 기술적 난이도 | **낮음~중간** — semver 유틸 이미 있음 (`back/src/utils/semver.js`) |
| 프론트 변경 | `api.js` request interceptor에 `App-Version` + `App-Platform` 추가 |
| 백엔드 변경 | `index.js`에 `/api` 전역 미들웨어 1개 (whitelist: `/health`, `/api/app/version-check`) |
| 기존 ForceUpdateGate와 관계 | **병행 권장** — Gate는 UX 좋은 전면 차단, 헤더는 우회·캐시·구버전 재진입 방어 |

### 2.4 설계 시 주의사항

1. **예외 경로**: `/health`, `/api/app/version-check`, (선택) `/admin/*` 정적·로그인
2. **헤더 없는 요청**: 구버전 앱·스크립트 — production에서는 거부, develop은 경고만
3. **426 vs 403**: HTTP 표준은 426; axios 전역 interceptor에서 `426` + `forceUpdate: true` body 처리
4. **배포 순서**: Play에 새 AAB **먼저** → `MIN_ANDROID_VERSION` 올림 → 백엔드 배포 (`WORKFLOW.md` §6)
5. **ForceUpdateGate 우회**: 앱을 켜두고 백그라운드만 쓰는 경우 헤더 방식이 더 강함

### 2.5 방법 A 도입 전 체크 (코드 작업 시)

- [ ] `api.js`에 `App-Version` / `App-Platform` 헤더
- [ ] 백엔드 `requireMinAppVersion` 미들웨어
- [ ] 426 응답 시 프론트 공통 핸들러 (스토어 링크)
- [ ] develop Railway는 `MIN_ANDROID_VERSION=1.0.0` 유지
- [ ] E2E: 구버전 앱으로 로그인·게시판 호출 시 차단 확인

**현재 배포(1.3.0)만으로는 방법 A 미적용** — 기존 ForceUpdateGate + Railway `MIN_ANDROID_VERSION`로 운영 가능.

---

## 3. 로깅 현황 · 정리 · Sentry/Winston 권장

### 3.1 현재 스택

| 영역 | 현재 | Sentry | Winston |
|------|------|--------|---------|
| 백엔드 | `console.log/warn/error` 직접 사용 (~50+ 파일) | ❌ 미설치 | ❌ 미설치 |
| 프론트 | `console.*` + `__DEV__` 가드 일부 | ❌ 미설치 | 해당 없음 |
| 배치 | `batchMetric.service.js` 구조화 prefix (`[BatchJob]`) | — | — |
| 배치 실패 알림 | `BATCH_ALERT_WEBHOOK_URL` 웹훅 (선택) | — | — |
| Railway | stdout → Railway Logs | — | — |

### 3.2 권장 조합 (소규모 팀)

| 도구 | 역할 |
|------|------|
| **Sentry (프론트)** | RN 크래시·JS 예외·릴리스별 집계, 무료 플랜으로 시작 |
| **Winston (백엔드)** | 레벨(`error`/`warn`/`info`) + 한글 `message` + Railway stdout |
| **Railway Logs** | 실시간 tail, 배치 `[BatchJob]` 라인 필터 |
| **BATCH_ALERT_WEBHOOK_URL** | 배치 실패 즉시 알림 (이미 코드 있음) |

자체 로그 수집 파일·ELK는 **당장 불필요**.

### 3.3 프로덕션에서 제거·축소 권장 로그 (우선순위)

#### 🔴 즉시 제거/가드 (보안·PII·노이즈)

| 위치 | 내용 | 이유 |
|------|------|------|
| `back/src/routes/auth.js` | `[개발용] ${phone}로 인증 코드 발송: ${code}` | 인증번호 평문 노출 |
| `back/src/routes/auth.js` | `[verify-student-id] OCR raw` / `checks` 상세 로그 | 학생증 OCR 원문·PII |
| `back/src/routes/messages.js` | `--- QUERY DEBUG START ---` SQL·PARAMS 덤프 | 운영 노이즈·쿼리 노출 |
| `back/src/routes/auth.js` | `[API][GET /api/auth/me]` 요청/응답 상세 (탭 전환마다) | 호출 빈도 매우 높음 |

#### 🟡 레벨 down 또는 `NODE_ENV !== 'production'` 가드

| 위치 | 내용 |
|------|------|
| `back/src/socketServer.js` | handshake·join_room·emitNotification 상세 |
| `back/src/routes/messages.js` | GetRoom·ReadChain 디버그 |
| `back/src/routes/auth.js` | 로그인 성공 토큰 발급 로그 |
| `back/src/routes/timer.js` | `TimerTimetablePaint` 디버그 |
| `back/src/utils/notificationWorker.js` | job별 `processing` / `완료` (info→debug) |
| `front/view/src/chat/hooks/useChatScroll.js` | 스크롤 디버그 (8곳) |
| `front/context/FriendContext.jsx` | `FriendBadge` 상태 로그 |

#### 🟢 유지 권장

| 위치 | 내용 |
|------|------|
| `back/src/index.js` | 서버 부팅·DB health |
| `back/src/jobs/*` | `[BatchJob] success/failed/skipped` |
| `back/src/services/batchAlert.service.js` | 웹훅 실패 |
| `back/src/index.js` 글로벌 핸들러 | `[ERROR] ${method} ${path}` + stack (서버만) |
| `front/utils/api.js` | `__DEV__` baseURL 로그만 (이미 가드됨) |

### 3.4 Winston 도입 시 한글 메시지 예시 (향후)

```text
[인증] 전화번호 Firebase 토큰 검증 실패 — 사유: 토큰 만료
[배치] 개인우편 반송 완료 — 처리 12건, 소요 1.2초
[API] 회원가입 실패 — 학교 ID 교차검증 불일치
```

관리자는 Railway에서 `[배치]`, `[인증]` 등 prefix로 필터.

### 3.5 로깅 작업 체크리스트 (배포 후 스프린트)

- [ ] PII·인증번호·OCR raw 로그 제거
- [ ] `messages.js` QUERY DEBUG 블록 제거
- [ ] Socket/메시지 verbose 로그 production 가드
- [ ] Sentry RN SDK + `release` = `1.3.0` 연동
- [ ] Winston logger 모듈 + `index.js` 글로벌 핸들러 연동
- [ ] `BATCH_ALERT_WEBHOOK_URL` production 설정

---

## 4. 운영 문서 통합 (완료)

구 `규칙.md`, `REPOSITORY_WORKFLOW.md`, `푸쉬규칙.md`, `브랜치작업.md` → **`WORKFLOW.md`** 단일 문서로 통합·삭제됨.

| 핵심 규칙 | 내용 |
|-----------|------|
| 서버·DB 분리 | develop ↔ production Railway·DB **교차 연결 금지** (최우선) |
| production 반영 | **체리픽** 또는 **`merge(develop)`** 모두 허용 — 빌드·배포는 production URL·DB 유지 |
| production push | AAB·Play·`MIN_ANDROID_VERSION` 정리 **후** push |

상세: `WORKFLOW.md`

---

## 5. 배포 직전 실행 체크리스트

### 5.1 Play Console / AAB

- [ ] `production` 브랜치, `npm run android:aab:prod`
- [ ] release keystore 서명 확인 (`[withAndroidReleaseSigning] release 서명 적용` 로그)
- [ ] `app-release.aab` Play 업로드
- [ ] `mapping.txt` 동일 빌드에서 업로드 (R8)
- [ ] 스토어 변경사항: `RELEASE_NOTES.md` 1.3.0 스토어용 블록

### 5.2 Railway production

- [ ] `cd back && npm run migrate` (037~040 포함)
- [ ] `MIN_ANDROID_VERSION=1.3.0` (**AAB 출시 후**)
- [ ] `ENABLE_CRON=true`, Redis 변수 연결
- [ ] `JWT_SECRET`, Firebase, CLOVA OCR, Redis URL 확인
- [ ] `ENABLE_TEST_API=false`

### 5.3 Git

- [ ] `production` 로컬 커밋 완료
- [ ] Play·MIN 버전 정리 후 `git push origin production`
- [ ] develop과 production API URL·`APP_ENV` 빌드 검증

### 5.4 배포 후 스모크 테스트

- [ ] 신규 가입 (전화·학생증) 또는 기존 계정 로그인
- [ ] 게시판·우편·채팅·알림
- [ ] 구버전 앱 강제 업데이트 화면 (`MIN_ANDROID_VERSION` 올린 후)
- [ ] Railway 로그: `[BatchJob] started` 확인

### 5.5 배포 후 스프린트 (필수 아님)

- [ ] App-Version 헤더 + 426 미들웨어 (방법 A)
- [ ] PII 로그 정리
- [ ] Sentry + Winston
- [ ] 만료 토큰 cleanup cron
- [x] `WORKFLOW.md` 문서 통합 (완료)

---

## 부록: 관련 파일 빠른 참조

| 주제 | 경로 |
|------|------|
| Cron 등록 | `back/src/jobs/index.js` |
| 배치 메트릭 | `back/src/services/batchMetric.service.js` |
| 강제 업데이트 API | `back/src/routes/app.js` |
| 강제 업데이트 UI | `front/components/common/ForceUpdateGate.jsx` |
| API 클라이언트 | `front/utils/api.js` |
| Android 빌드 | `front/BUILD_ANDROID.md` |
| 레포 운영·배포 규칙 | `WORKFLOW.md` |
| 릴리스 노트 | `RELEASE_NOTES.md` |

---

*이 문서는 배포 전 점검용이며, 코드 변경은 포함하지 않습니다. 통합·로깅·방법 A 구현은 별도 작업으로 진행하세요.*

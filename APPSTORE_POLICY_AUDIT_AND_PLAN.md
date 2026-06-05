# App Store 심사 대응 Audit & 개선 설계

작성일: 2026-05-28  
최종 반영: 2026-05-29 — 지금까지 구현된 항목만 체크리스트에 표시  
범위: `front`(React Native), `back`(Node.js/Express), DB 마이그레이션/조회 구조  
원칙: 1차는 Audit·설계 문서; 하단 **진행 체크리스트**는 실제 코드 기준으로 갱신

---

## 단계 1. 현재 코드 상태 점검 (Audit)

## 1) 로그인/회원가입 전 EULA(약관) 동의 구현 여부

- **현재 상태**
  - 회원가입 플로우에 약관/개인정보 동의 UI가 있고, 필수 동의 미완료 시 다음 단계 진행이 제한됨.
  - 로그인 화면에서는 약관 동의 체크 없이 바로 로그인 시도가 가능함.
  - Auth 초기 진입이 `TestLogin`으로 설정되어 테스트 진입 경로가 운영 동선에 남아 있음.

- **근거 파일**
  - `front/view/src/signup/SignStepConsent.jsx`
  - `front/view/src/Sign.jsx`
  - `front/view/src/Login.jsx`
  - `front/App.js`

- **진단**
  - 회원가입 시점 동의는 구현되어 있으나, 운영/심사 관점에서 로그인 진입 동선과 약관 고지 일관성은 보완 필요.
  - 테스트 진입 라우트(`TestLogin`)는 베타 흔적으로 분류.

---

## 2) 게시글/댓글 신고·차단 기능 반영 여부 (DB/API/UI)

- **신고(Report)**
  - 게시글/댓글 신고 UI 및 백엔드 API가 존재함.
  - 중복 신고/제한 처리 로직도 확인됨.

- **차단(Block)**
  - `user_blocks` 테이블 및 차단 유틸/엔드포인트는 존재함.
  - 다만 게시글/댓글 목록·상세 조회에서 “차단 유저 즉시 제외” 쿼리 필터는 확인되지 않음.
  - 일부 UI에서 차단 메뉴 문구는 보이지만 실제 동작 핸들러가 비어 있는 경우가 있음.

- **근거 파일**
  - 신고:
    - `front/components/common/ReportModal.jsx`
    - `front/view/src/boardAll.jsx`
    - `front/view/src/boardDetail.jsx`
    - `back/src/routes/posts.js`
    - `back/src/routes/comments.js`
  - 차단:
    - `back/src/db/migrations/001_initial_schema.sql` (`user_blocks`)
    - `back/src/routes/friends.js`
    - `back/src/utils/userBlock.js`
    - `front/view/src/schoolMailDetail.jsx` (차단 핸들러 미완성 흔적)

- **진단**
  - 신고는 “구현됨”으로 판단.
  - 익명 커뮤니티 핵심 요건인 “차단 시 피드/댓글 즉시 제외”는 게시판 컨텍스트에서 미흡(우선 개선 필요).

---

## 3) 테스트/더미/미완성 흔적 탐지

- **발견 유형**
  - 테스트 전용 진입(`TestLogin`) 및 테스트 API 연동 흔적
  - TODO/임시 플래그/주석 처리된 버튼/빈 `onPress`
  - 프리릴리즈 안내 문구 기반 임시 차단 UI

- **대표 근거 파일**
  - `front/App.js`
  - `front/view/src/TestLogin.jsx`
  - `back/src/routes/test.js`
  - `front/view/src/Login.jsx`
  - `front/view/src/Sign.jsx`
  - `front/view/src/PWfind.jsx`
  - `front/view/src/IDfind.jsx`
  - `front/view/src/boardAll.jsx`
  - `front/view/src/schoolMailDetail.jsx`

- **진단**
  - 심사/운영 전환 시 숨김 또는 제거가 필요한 베타 흔적이 다수 존재.

---

## 단계 1 결론 요약

- 회원가입 약관 동의는 구현되어 있음.
- 신고 기능은 구현되어 있음.
- 차단 기능은 일부 도메인에서만 동작하며, 게시판/댓글에서 즉시 필터링이 부족함.
- 테스트/미완성 흔적이 운영 경로에 남아 있어 심사 리스크가 존재함.

---

## 단계 2. 구체적인 수정 계획 및 아키텍처 가이드

## 2-1) EULA 구현 계획 (청소년/익명 UGC 앱용)

### 목표
- 가입 직전 필수 동의 + 버전 관리 + 서버 저장으로 “심사 증빙 가능한 동의 체계” 확보.

### 권장 UI 위치
- 1차: 회원가입 Step 0(현재 동의 단계 유지/강화)
<!-- 보류: 로그인 시 약관 재동의 — 타 서비스도 로그인마다 재동의하지 않아 v1에서는 미적용
- 2차(권장): 로그인 화면 진입 시 “약관 버전 변경 시 재동의 모달” 조건부 표시
-->

### 필수 문구(예시)
- 학교폭력·언어폭력·성적/혐오/불법 콘텐츠 무관용
- 신고/차단 기능 악용 금지
- 위반 시 게시물 삭제, 계정 제한/영구 정지 가능
- 청소년 보호 정책 및 커뮤니티 가이드 준수

### 백엔드 저장 스키마 제안
- `terms_versions`
  - `id`, `code`(예: `EULA_KR`), `version`(예: `2026.05`), `is_active`, `created_at`
- `user_terms_consents`
  - `id`, `user_id`, `terms_version_id`, `consented_at`, `ip`, `device_id`
  - unique(`user_id`, `terms_version_id`)

### API 흐름 제안
1. 앱 시작/회원가입 진입: `GET /api/app/terms/active`
2. 동의 제출: `POST /api/auth/consent` (필수 항목 체크)
<!-- 3. 로그인 후 검증(선택): `GET /api/auth/consent/status` — 재동의 강제는 v1 보류 -->

---

## 2-2) 익명 신고/차단 로직 가이드

### A. 테이블 제안 (없을 경우)

- `reports`
  - `id`, `reporter_user_id`, `target_type`(`post|comment|user|dm|mail`), `target_id`, `reason_code`, `description`, `status`, `created_at`
  - 인덱스: (`target_type`, `target_id`), (`reporter_user_id`, `created_at`)
  - 중복 방지: unique(`reporter_user_id`, `target_type`, `target_id`)

- `user_blocks`
  - `id`, `blocker_user_id`, `blocked_user_id`, `created_at`
  - unique(`blocker_user_id`, `blocked_user_id`)

> 현재 코드에는 `user_blocks`가 이미 존재하므로, 실무적으로는 조회 필터 통합이 핵심.

### B. 백엔드 조회 쿼리 필터 표준안

게시글/댓글 API에서 공통으로 아래 조건을 추가:

```sql
WHERE NOT EXISTS (
  SELECT 1
  FROM user_blocks ub
  WHERE ub.blocker_user_id = :viewerId
    AND ub.blocked_user_id = target.user_id
)
```

또는:

```sql
AND target.user_id NOT IN (
  SELECT blocked_user_id
  FROM user_blocks
  WHERE blocker_user_id = :viewerId
)
```

### C. 프론트 즉시 반영(optimistic filter) 가이드

차단 성공 시 목록 상태에서 즉시 제거:

```js
setPosts((prev) => prev.filter((p) => p.userId !== blockedUserId));
setComments((prev) => prev.filter((c) => c.userId !== blockedUserId));
```

권장:
- 차단 API 성공 후 즉시 필터 + 백그라운드 재조회 1회
- 상세/목록/검색 탭에 동일한 필터 유틸 재사용

### D. 신고/차단 관리자 알림(심플안)

- 이벤트 발생 시 비동기 Webhook 전송:
  - `REPORT_CREATED`
  - `USER_BLOCKED`
- Payload 예시:
  - `event`, `actorUserId`, `targetType`, `targetId`, `reasonCode`, `createdAt`, `env`
- 실패 시 큐 재시도(또는 로그 적재)만 우선 적용

---

## 2-3) 베타 흔적 제거(미완성 기능 스크리닝) 전략

### 원칙
- 심사 빌드에서는 “보이는 기능 = 동작하는 기능”만 노출.

### 적용 전략
1. `FEATURE_FLAGS` 단일 소스 도입
2. 미완성 기능은 `disabled` 대신 **렌더 숨김 우선**
3. 남겨야 하면 “준비 중” 라벨+클릭 불가 + 추적 로그
4. `TestLogin`, 테스트 API, 개발자용 메뉴는 프로덕션 빌드에서 완전 제외

### 체크 기준
- 빈 `onPress`
- TODO가 사용자 액션 경로에 걸린 화면
- `test`, `dummy`, `PRE_RELEASE` 문자열이 노출되는 화면

---

## 우선순위 제안 (실행 순)

1. 게시글/댓글 차단 필터(백엔드 쿼리 + 프론트 즉시 제거)
2. 운영 빌드 테스트 경로(`TestLogin`, test API) 차단
3. 약관 동의 버전 관리/서버 저장
4. 미완성 버튼 숨김 정리
5. 신고/차단 관리자 알림 연결

---

## 비고

- 본 문서는 “현행 코드 점검 + 구조 제안” 문서이며, 실제 반영 시에는 마이그레이션/엔드포인트/프론트 상태 관리를 함께 적용해야 함.

---

## 진행 체크리스트 (코드 반영 현황, 2026-05-29)

> **규칙:** 저장소에서 동작·구현이 확인된 항목만 `[x]`. 미완·심사 전 보완 필요·테스트 전용은 `[ ]` 유지.

### A. 단계 1 Audit — 현재 구현 상태

#### A-1. 로그인/회원가입 EULA·약관

- [x] 회원가입 Step 0 필수 동의 UI (`SignStepConsent.jsx`) — 약관·수집·학생증 OCR·위치·(만 14세 미만) 법정대리인
- [x] 이용약관·개인정보 처리방침 전문 화면 (`SignStepTermsOfService`, `SignStepPrivacyPolicy`, `info.jsx`)
- [x] 가입 v2 플로우 — 약관 선행 → 본인확인 → 인증방식 → 학생증/증명서 → 계정·프로필 (`Sign.jsx`)
- [x] 로그인 시 약관 재동의 **미적용** (의도적 — 가입 시 동의만, 타 앱 관행과 동일)
<!-- - [ ] 로그인 화면 약관 재동의·버전 검증 API -->
- [ ] 약관 버전 DB·서버 동의 저장 (`terms_versions`, `user_terms_consents`, `/api/auth/consent` — 미구현)

#### A-2. 신고·차단 (UGC)

- [x] 게시글·댓글 신고 UI·API (`ReportModal`, `boardAll`/`boardDetail`, `posts.js`/`comments.js`)
- [x] `user_blocks` 테이블·차단 API (`friends.js`, `userBlock.js`)
- [x] 게시글·댓글 목록·상세에서 차단 유저 **즉시 제외** (`userBlockFilter.js`, `posts.js`, `comments.js`)
- [x] 차단 성공 시 프론트 optimistic 제거 (`blockUser.js`, `boardAll.jsx`, `boardDetail.jsx`)
- [x] **신고 / 차단** 통합 UI + 신고 후 차단 유도 모달 (`ReportModal.jsx`)
- [x] 중복 신고 시 `code: ALREADY_REPORTED` (409) → 차단 유도만 표시
- [x] DM·개인우편·학교우편·게시판·댓글 메뉴 통합 (친구 목록은 **차단** 단독 유지)

#### A-3. 테스트·베타 흔적

- [x] `App.js` 초기 라우트 `Login` ( `TestLogin` 스택 연결 해제, 파일은 주석 보관)
- [x] 백엔드 테스트 API — `ENABLE_TEST_API !== 'true'` 시 production 404 (`test.js`, `.env.example` 기본 `false`)
- [ ] 가입 OCR 테스트 스킵 플래그 해제 (`Sign.jsx` `SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST = true` — 심사 빌드 전 `false` 필요)
- [ ] `FEATURE_FLAGS` 단일 소스·미완성 UI 렌더 숨김 정리

---

### B. 가입·본인확인 (v2/v3, App Store 연계)

- [x] Firebase Phone Auth + `POST /api/auth/verify-firebase-phone` → `phone_verifications`
- [x] `POST /api/auth/signup/verify-student-id` — **네이버 CLOVA General OCR** (`naverClovaOcr.service.js`, Tesseract 제거)
- [x] 학생증 가입 시 `student_verified = TRUE` INSERT (`auth.js`)
- [x] 증명서 가입 경로 + `signup_certificate_submissions` + 관리자 검수 API (`SignStepCertificate`, `adminSignupCertificates.js`)
- [x] 생년월일 기반 학교급·학년·졸업년도 유추 (`signupEnrollment.js`, OCR 3중 검증)
- [x] 연령 미달·중·고 외 차단 + `team.ucost@gmail.com` 안내 (`signupAgeUtils`, `authFeatureAlerts`)
- [x] 가입 State 누적 후 마지막 `POST /api/auth/signup` 일괄 전송 (`DISABLE_SIGN_VALIDATION` 해제)
- [x] 프로필 색 1~4 랜덤 (`pickRandomProfileColorId`)
- [ ] OCR·가입 E2E 심사용 검증 완료 (Railway `NAVER_CLOVA_OCR_*` 설정·실기기 통과 — 운영 변수·crop 품질 확인 중)
- [ ] `IDfind` / `PWfind` Firebase 전화 재사용 완료 (플랜 C2 — 후속)

---

### C. 단계 2 설계안 — 우선순위 실행

문서 §「우선순위 제안 (실행 순)」과 동일 순서.

1. [x] 게시글/댓글 차단 필터 (백엔드 쿼리 + 프론트 즉시 제거)
2. [x] 운영 빌드 `TestLogin` 진입 해제 (`ENABLE_TEST_API` production 가드는 기존 유지)
3. [ ] 약관 동의 버전 관리/서버 저장
4. [ ] 미완성 버튼·빈 `onPress` 숨김 정리
5. [ ] 신고/차단 관리자 Webhook 알림 (`BATCH_ALERT_WEBHOOK_URL` 등)

---

### D. 심사 빌드 전 필수 확인 (미체크 = 출시 전 작업)

- [ ] `SKIP_SIGNUP_VALIDATION_UNTIL_OCR_TEST` → `false`
- [ ] `App.js` `initialRouteName` 프로덕션 정상화
- [ ] Railway develop/production: `NAVER_CLOVA_OCR_INVOKE_URL`, `NAVER_CLOVA_OCR_SECRET` 설정
- [ ] Railway production: `ENABLE_TEST_API=false` 유지
- [ ] 계정 탈퇴 — 약관 문구 대비 실제 API 연동 (`mypage.jsx` 현재 Alert 스텁)
<!-- - [ ] 로그인 후 최신 약관 미동의 시 재동의 모달 (v1 보류) -->

---

### E. 단계 1 결론 요약 (갱신)

| 항목 | 상태 |
|------|------|
| 회원가입 약관 동의 | **구현됨** (버전·서버 저장은 미구현) |
| 신고 | **구현됨** |
| 차단 | **부분** (API·테이블 있음, 피드 필터·UI 미흡) |
| 가입 본인확인·학생증 OCR | **구현됨** (CLOVA 전환, E2E·테스트 플래그 정리 필요) |
| 베타/테스트 흔적 | **잔존** (`TestLogin`, 가입 OCR 스킵 플래그) |

# Youth Paper 회원가입 플로우 — 설계·작업 목록

작성일: 2026-05-28  
최종 기획 반영: **v2** (약관 선행 · 연령+전화 통합 · 학교 수동 선택 제거 · OCR 학교 유추)  
대상: `front/view/src/signup/`  
관련: `APPSTORE_POLICY_AUDIT_AND_PLAN.md`, `back/src/routes/auth.js`, `back/src/services/studentIdOcr.service.js`

---

## 1. 목표

- 애플 Guideline 1.2(UGC)·청소년 보호에 맞는 **가입·학생 인증** 완성
- **중·고등 재학 연령만** 가입 허용 (그 외 연령·만 14세 미만 차단)
- 유료 OCR 없이 **Tesseract** + 키워드 매칭
- **학교 검색 화면 없음** → OCR 텍스트로 학교·학교급 유추

---

## 2. 확정 가입 순서 (Target Flow v2)

| 순서 | 화면 | 파일(예정) | 설명 |
|------|------|------------|------|
| 진입 | 로그인 | `Login.jsx` | 「회원가입」→ `Sign` |
| **Step 0** | **약관·EULA** | `SignStepConsent.jsx` | **첫 화면**. 필수 동의(UGC·OCR·위치 등) |
| **Step 1** | **연령·본인 확인** | `SignStepIdentity.jsx` | 이름 · 생년월일 · 전화번호 + 인증 (한 화면) |
| **Step 2** | 학생증 인증 | `SignStepVerificationMethod.jsx` → `SignStepStudentIdVerify.jsx` | 학교 선택 **없음**. 촬영 → OCR |
| **Step 3** | 계정 정보 | `SignStep2.jsx` ~ `SignStep4.jsx` | 인증 통과 후 아이디·비밀번호·학년·반 등 |
| 완료 | — | `Sign.jsx` | 가입 완료 → `Login` |

### Step 1 상세 (연령·본인 확인)

한 화면(또는 동일 스텝 그룹)에서 처리:

1. **이름** 입력  
2. **생년월일** 입력  
3. **전화번호** 입력 + **인증번호** 발송·확인 (`/api/auth/send-verification`, `/api/auth/verify-phone`)  
4. 인증 성공 시 `name`, `birthDate`, `phone`을 `formData`에 저장  

### Step 1 가입 가능 연령 (생년월일 기준)

| 구분 | 만 나이(예시 정책) | 처리 |
|------|-------------------|------|
| 만 14세 **미만** | `< 14` | 보호자 PASS 미구현 → **가입 불가** 팝업 → `Login` |
| **중·고 재학 가능** | `12~15` → 중학, `16~19` → 고등 (정책 표로 확정) | 다음 단계 진행 |
| **성인·유아 등 그 외** | `< 12` 또는 `≥ 20` 등 중·고 구간 밖 | **가입 불가** 안내 (서비스 대상 아님) → `Login` |

> v2에서는 「만 14세 이상/미만 카드 선택」UI를 쓰지 않음. **생년월일 숫자**로만 판단.

**가입 불가 안내 문구(예시, 중·고 연령 아님):**

> Youth Paper는 중·고등학생을 위한 서비스입니다. 입력하신 생년월일 기준으로 가입할 수 없습니다.

### 만 14세 미만 차단 (기존 유지)

- 타이틀: **안내 (Youth Paper)**  
- 본문: 보호자 PASS 준비 중 (기존 `authFeatureAlerts.js` 문구)  
- [확인] → `Login`

---

## 3. 삭제·변경 (v1 → v2)

| 항목 | v1(이전 문서/코드) | v2(확정) |
|------|-------------------|----------|
| 첫 화면 | Step 0 연령 확인 | **Step 0 약관 동의** |
| 본인인증 | Step 2 `SignStep1` 별도 | **Step 1에 이름·생년·전화·인증 통합** |
| 학교 선택 | `SignStepSchoolSelect.jsx` Step 3 | **삭제** — OCR 후 유추 |
| 학교 매칭 | 사용자가 고른 `schoolId`와 OCR 비교 | OCR 텍스트 → `schools` DB **검색·유추** |
| 연령 검사 | 만 14세 미만만 | **+ 중·고 연령 밖 차단** |

**코드에서 제거·비활성 예정:** `SignStepSchoolSelect.jsx`, `Sign.jsx`의 `STEP.SCHOOL` 분기.

---

## 4. Tesseract 검증 (v2)

**원칙:** 전체 파싱 신뢰 X → `includes()` · DB 검색 · 생년월일 기반 학교급.

| # | 검증 | 입력 | 실패 시 |
|---|------|------|---------|
| 1 | **실명** | Step 1 `name` | OCR 텍스트에 이름 미포함 → 반려 |
| 2 | **학교급(중/고)** | Step 1 `birthDate` → `inferExpectedSchoolLevel` | 기대 학교급과 OCR `중학교`/`고등학교` 불일치 → 반려 |
| 3 | **학교 유추** | OCR 텍스트에서 학교명 후보 추출 → `schools` 검색 | 매칭 실패 → 재촬영 / 성공 시 「○○고등학교 · 지역 맞나요?」 |

### OCR 시 학교급 판별 (생년월일 연동)

`studentIdOcr.service.js` — **이미 구현된 부분:**

```text
inferExpectedSchoolLevel(birthDate):
  만 12~15 → middle
  만 16~19 → high
  그 외 → null (중·고 재학 연령 아님)

detectSchoolLevelInText(ocrText):
  "고등학교" 등 → high
  "중학교" 등 → middle

→ expected ≠ detected 이면 levelOk = false
```

**v2에서 추가·변경 필요:**

- API 요청에서 **`schoolId` 제거** (선택 학교 없음)  
- `inferExpectedSchoolLevel(birthDate) === null` 이면 **OCR 전에** 가입 불가 처리 권장  
- OCR 후 `schools` 테이블 **이름 부분 일치 검색**으로 `school` 후보 반환 (`/api/schools/search` 로직 재사용 가능)

### API (목표)

| 구분 | 경로 | 비고 |
|------|------|------|
| 구현 | `POST /api/auth/signup/verify-student-id` | `{ name, birthDate, imageBase64 }` — 응답 `school` **OCR 유추** |

---

## 5. 현재 코드 vs v2 — 2026-05-28 구현 반영

### 5.1 `Sign.jsx` 스텝 순서

| Step | **구현** | 일치 |
|------|----------|------|
| 0 | `SignStepConsent` (약관) | ✅ |
| 1 | `SignStepIdentity` (이름·생년·전화·인증) | ✅ |
| 2 | `SignStepVerificationMethod` | ✅ |
| 3 | `SignStepStudentIdVerify` / 증명서 | ✅ |
| 4~5 | 계정 · 프로필 | ✅ |

### 5.2 연령 검사

| 검사 | 상태 |
|------|------|
| 만 14세 미만 | ✅ `signupAgeUtils` + `showUnder14BlockAlert` |
| 중·고 연령 밖 | ✅ `showIneligibleAgeAlert` (Step 1) |

### 5.3 OCR·학교

| 항목 | 상태 |
|------|------|
| 학교 선택 UI | ✅ `Sign.jsx`에서 제거 (`SignStepSchoolSelect` 미사용) |
| 학교 검증 | ✅ OCR → DB 유추 (`inferSchoolFromOcrText`) |
| 학교급 | ✅ birthDate + OCR 키워드 |

### 5.4 `Login.jsx`

| 항목 | 상태 |
|------|------|
| 회원가입 → `Sign` | ✅ |
| 아이디/비번 찾기 → 각 화면 | ✅ (화면 내 API는 TODO) |

---

## 6. 작업 목록 (Done / Todo)

### ✅ 완료 (v1 기준)

| 항목 | 비고 |
|------|------|
| signup 폴더 정리, `App.js` import | |
| `Login` → `Sign` / `IDfind` / `PWfind` | |
| Tesseract 3중 검증 API (실명·학교급·**선택 학교명**) | v2에서 3번만 변경 |
| `SignStepStudentIdVerify` 촬영 UI | |
| 만 14세 미만 팝업 | Step 위치 v2에서 이동 예정 |

### ✅ v2 완료 (2026-05-28)

| # | 작업 |
|---|------|
| V2-1 ~ V2-6 | `Sign.jsx` 스텝 재배치, `SignStepIdentity`, 연령 검사, OCR 학교 유추, 학교 확인 Alert |
| V2-10 | Firebase Phone Auth (`SignStepIdentity`), `verify-firebase-phone`, 번호 교차 검증·중복 선검사 |

### 🔲 v2 후속

| # | 작업 |
|---|------|
| V2-7 | `DISABLE_SIGN_VALIDATION_FOR_REDESIGN` → `false` (운영 전 E2E) |
| V2-8 | `SignStepSchoolSelect.jsx` 파일 삭제(선택) |
| V2-9 | Railway develop 배포 후 실기기 OCR·Phone Auth 검증 |
| V2-11 | `IDfind` / `PWfind` / `SignStep1` → `firebasePhoneAuth.js` 공통화 (자체 SMS API 폐기) |

**전화번호 저장 규칙:** DB·API 전역 `01012345678` (숫자만). Firebase E.164는 `normalizeLocalKrPhone` / `localKrToE164`로 변환.

---

## 7. 파일 맵 (v2 기준)

| 파일 | v2 역할 |
|------|---------|
| `Login.jsx` | 로그인, Sign/ID/PW 진입 |
| `Sign.jsx` | 스텝 오케스트레이터 |
| `SignStepConsent.jsx` | **Step 0** 약관 |
| `SignStepIdentity.jsx` | **Step 1** 본인 확인 (통합) |
| `signupAgeUtils.js` | 만 14 미만·중·고 연령 판별 |
| `SignStepAgeGate.jsx` | `buildBirthDate` 유틸만 재사용 |
| `SignStepSchoolSelect.jsx` | 미사용 (추후 파일 삭제 가능) |
| `SignStepVerificationMethod.jsx` | 학생증/증명서 선택 |
| `SignStepStudentIdVerify.jsx` | 학생증 촬영·OCR |
| `SignStep2.jsx` / `SignStep4.jsx` | 계정·학생 정보 |
| `SignStep1-2.jsx` | 보호자 PASS — v2에서 미사용 |
| `authFeatureAlerts.js` | 만 14세 미만·찾기 안내 등 |

---

## 8. 리스크·확정 필요

| 주제 | 내용 |
|------|------|
| 중·고 만 나이 구간 | `12~15` / `16~19` 확정 여부, 경계 학년(만 15·16) |
| OCR 학교 유추 | 동명이교·줄임말(예: 「한울고」) 매칭 규칙 |
| Tesseract Railway | WASM 메모리·첫 호출 지연 |
| 증명서 제출 플로우 | v2에서 유지 여부 |

---

## 9. 다음 액션 (v2 문서 기준)

1. Railway develop 배포 후 실기기 OCR·연령 차단 검증  
2. `DISABLE_SIGN_VALIDATION_FOR_REDESIGN` 해제 및 E2E 가입 테스트  
3. `APPSTORE_POLICY_AUDIT_AND_PLAN.md` 플로우 문구 동기화  

---

## 10. API·DB 대조 및 구현 계획 v3 (2026-05-29)

> 코드·마이그레이션·`auth.js` 기준으로 재점검. **UI 플로우(v2)는 대체로 맞고, “실제 가입 완료”는 아직 우회 모드.**

### 10.1 DB (`users` · `phone_verifications` · `schools`)

| 컬럼/테이블 | 가입 시 필요 | 비고 |
|-------------|-------------|------|
| `users.username`, `password`, `name`, `phone`, `birth_date` | ✅ | `phone` UNIQUE, 숫자만(`010…`) 권장 |
| `users.school_id` | ✅ FK → `schools.school_id` | OCR 유추 `school.id`와 동일 키 |
| `users.grade`, `class_number`, `graduation_year` | ✅ | OCR API는 **학년·반 미반환** → Step 4 수동 입력 |
| `users.color_id` | ✅ FK → `colors` | 프론트 현재 **항상 `1` 고정** |
| `users.phone_verified` | ✅ | `verify-firebase-phone` → `phone_verifications.is_verified` |
| `users.student_verified` | ⚠️ optional | 가입 API에서 **미설정**(기본 FALSE) |

`phone_verifications`: Firebase 경로는 `verification_code = 'FIREBASE'`, 24h 유효.

### 10.2 백엔드 API 현황

| API | 상태 | 프론트 연동 |
|-----|------|-------------|
| `POST /api/auth/check-phone-available` | ✅ | `SignStepIdentity` 발송 전 |
| `POST /api/auth/verify-firebase-phone` | ✅ | Firebase 확인 후 |
| `POST /api/auth/signup/verify-student-id` | ✅ `{ name, birthDate, imageBase64 }` | `SignStepStudentIdVerify` |
| `POST /api/auth/signup` | ✅ | `Sign.jsx` `handleComplete` |
| `POST /api/auth/send-verification` · `verify-phone` | ⚠️ 레거시 SMS | **미사용**(Firebase로 대체) |
| 증명서 제출 API | ❌ 없음 | 증명서 플로우는 **모달만** |
| 아이디/비번 찾기 API | ❌ 없음 | `IDfind` / `PWfind` TODO |

**`signup` 검증:** `schoolId` 필수, `grade` 1–6, `classNumber` 1–50, `graduationYear` 1900–2100, `colorId` 유효 ID.

### 10.3 프론트 ↔ API 갭 (우선 수정)

| # | 이슈 | 영향 |
|---|------|------|
| G1 | `DISABLE_SIGN_VALIDATION_FOR_REDESIGN = true` | 전화·OCR·`signup` API **전부 스킵**, 성공 모달만 |
| G2 | OCR 성공 후 `grade`/`class` 빈 값 | Step 4 필수인데 비어 있을 수 있음 |
| G3 | `handleComplete` `colorId: 1` 고정 | DB에 없는 ID면 400 |
| G4 | `graduationYear` 임의 fallback | 정책 없이 `올해+1` |
| G5 | Step 4에서 학교 **텍스트만** 수정 가능 | `schoolId`와 불일치 위험 → 학교명 읽기 전용 권장 |
| G6 | 증명서 플로우 | 계정 미생성 · 검수 백엔드 없음 |
| G7 | 가입 후 `student_verified` | OCR 통과해도 DB FALSE 유지 |
| G8 | 아이디 중복 | 제출 직전 API 확인 없음 |

### 10.4 작업 단계 (권장 순서)

#### Phase A — 학생증 가입 E2E (최우선)

| ID | 작업 | 파일 |
|----|------|------|
| A1 | `DISABLE_SIGN_VALIDATION` → `false` (환경변수 `EXPO_PUBLIC_DISABLE_SIGN_VALIDATION` 권장) | `Sign.jsx` |
| A2 | `handleComplete` payload 정합: `phone` 숫자만, `birthDate` `YYYY-MM-DD`, `schoolId` OCR `school.id` | `Sign.jsx` |
| A3 | Step 4 검증: 학년·반·졸업년도 필수; 학교명 read-only + `schoolId` 유지 | `SignStep4.jsx`, `Sign.jsx` |
| A4 | `graduationYear` 규칙 확정 후 계산/선택 UI | `SignStep4.jsx` 또는 유틸 |
| A5 | `colorId`: `colors` 시드 조회 API 없으면 최소 1번 ID 확인 또는 선택 UI | `Sign.jsx` / 신규 API |
| A6 | OCR 통과 시 `student_verified: true` 옵션 — **백엔드** `signup` body 플래그 또는 INSERT 시 TRUE | `auth.js` |
| A7 | 실기기: Firebase SMS + OCR + `signup` 201 E2E | — |

#### Phase B — 백엔드 보강 (선택·정책 확정 후)

| ID | 작업 |
|----|------|
| B1 | `GET /api/auth/check-username-available` |
| B2 | `signup` 시 OCR 세션 토큰(학생증 통과 직후 1회용) — schoolId 위변조 방지 |
| B3 | `verify-student-id` 응답에 `grade`/`classNumber` 파싱 추가(가능 시) |
| B4 | 레거시 `send-verification` / `verify-phone` deprecate 문서화 |

#### Phase C — 증명서·찾기 (범위 별도)

| ID | 작업 |
|----|------|
| C1 | 증명서: 제출 테이블·관리자 검수 API 또는 v1에서 UI 비활성 |
| C2 | `IDfind` / `PWfind` + Firebase 전화 재사용 (`firebasePhoneAuth.js`) |

#### Phase D — 정리

| ID | 작업 |
|----|------|
| D1 | `SignStepSchoolSelect.jsx` 삭제 |
| D2 | `SignStep1.jsx`, `SignStep1-2.jsx`, `SignStep3.jsx` 미사용 정리 |
| D3 | `BUILD_ANDROID.md` / 앱스토어 문서 플로우 동기화 |

### 10.5 의사결정 (2026-05-29 확정)

| 항목 | 결정 |
|------|------|
| 증명서 | **API + 관리자 검수** (`signup_certificate_submissions`, `/api/admin/signup-certificates`) |
| 재학 정보 | **생년월일·학교급으로 학년·졸업년도 유추** (예외는 Step 4 안내 + 마이페이지 문의) |
| 프로필 색 | 가입 시 **1~4 랜덤** (`pickRandomProfileColorId`) |
| `student_verified` | 학생증 가입 **즉시 TRUE** (등교·학적 로직에서 FALSE 가능 — 코드 주석) |
| 증명서 가입 | 가입 시 **FALSE**, 검수 승인 시 TRUE |
| 연령 구간 | **12–15 중 / 16–19 고 확정** |
| 연령 차단 시 | **team.ucost@gmail.com** 안내 (팝업) |
| 아이디/비번 찾기 | **가입만** (후속) |
| `DISABLE_SIGN_VALIDATION` | **false** — 마지막 `POST /signup` 일괄 전송 |

### 10.6 v3 체크리스트 (완료 정의)

- [x] 증명서 제출 테이블·관리자 검수 API  
- [x] 생년월일 기반 학년·졸업년도 유추 + Step 4 안내 문구  
- [x] 연령 차단 시 team.ucost@gmail.com 안내  
- [x] 프로필 색 1~4 랜덤 · 학생증 가입 `student_verified` TRUE  
- [x] `DISABLE_SIGN_VALIDATION` 해제 — State 누적 후 마지막 signup  
- [ ] Firebase 인증 → `phone_verifications` → `signup` 201  
- [ ] OCR 실패/연령 차단/학교 확인 Alert 동작  
- [ ] `users` row에 `school_id`, `grade`, `class_number`, `graduation_year`, `color_id` 정확  
- [ ] 가입 후 `Login` → 로그인 성공  
- [ ] (선택) `student_verified === true`  

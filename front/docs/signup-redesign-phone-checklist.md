# 전화번호 회원가입 플로우 — 프론트엔드 구현 체크리스트

> **작업 범위:** 프론트엔드 UI·화면 전환·로컬 유효성 검증만.  
> signup API, 이니시스·전화번호 인증 백엔드 연동은 **별도 작업**.

---

## 플로우 개요

```
[진입 화면] (카카오·애플과 공유) → 전화번호로 시작하기
    → [약관 동의 바텀시트] (공유 UI)
    → [생년월일 입력] (애플과 동일 달력 UI + 기존 검증 로직)
    → 만 14세 미만? → [보호자 인증] → [KG이니시스 본인인증]
                  └ 만 14세 이상 ───→ [KG이니시스 본인인증]
    → [계정 만들기] ★ 전화번호 플로우만 포함
    → [재학정보] → [학생증] → [가입 마무리]
    → (학생증 승인 후) → 메인 직행 (프로필 아이디 화면 없음)
```

### 카카오·애플·전화번호 비교

| 단계 | 카카오 | 애플 | 전화번호 |
|------|--------|------|----------|
| 소셜 인증 | 카카오 mock | Apple mock | **없음** |
| 생년월일 | 카카오에서 수신 | 달력 UI 입력 | 달력 UI 입력 |
| 본인인증 후 | 재학정보 | 재학정보 | **계정 만들기** |
| 승인 후 | 프로필 아이디 입력 | 프로필 아이디 입력 | **메인 직행** |

---

## 0. 사전 준비

- [ ] 공유 컴포넌트 확인·재사용
  - `SignupEntry.jsx` — 진입 화면
  - `SignupConsentSheet.jsx` — 약관 바텀시트 (`provider: 'phone'`)
  - `SignStepBirthDateCalendar.jsx` — 달력형 생년월일 (애플에서 구현)
- [ ] `App.js`에 `SignPhone` (전화번호 플로우 오케스트레이터) 라우트 등록
- [ ] 기존 `Sign.jsx`와의 관계 정리
  - **권장:** `SignPhone.jsx` 신규 오케스트레이터 — 약관~완료 step 관리
  - **대안:** `Login.jsx` "회원가입" → `SignPhone`으로 진입 경로 변경 (기존 `Sign` deprecate 계획)
- [ ] **(옵션, 권장)** 공용 pending 세션 유틸 `signupSessionStorage.js` — [카카오 §0](./signup-redesign-kakao-checklist.md#0-사전-준비)과 동일 키·API (`provider: 'phone'`)
- [ ] 이니시스 중단 복구는 `services/inicisAuth.js` **그대로 재사용**

---

## 1. 진입 화면 (카카오·애플과 공유)

**재사용:** `front/view/src/signup/SignupEntry.jsx`

- [ ] "전화번호로 시작하기" 버튼 활성화
  - 흰 배경 + 연두색 테두리 스타일
- [ ] 탭 시 약관 동의 바텀시트 오픈 (`provider: 'phone'`)
- [ ] 카카오·Apple 버튼과 동일 레이아웃 유지

> [카카오 체크리스트 §1](./signup-redesign-kakao-checklist.md#1-진입-화면-signupentry)

---

## 2. 약관 동의 바텀시트 (카카오·애플과 공유 UI)

**재사용:** `SignupConsentSheet.jsx` — 카카오 구현 단계에서 작성된 **3플로우 공용** 컴포넌트

- [ ] "전화번호로 시작하기" 탭 → 바텀시트 노출 (`provider="phone"`)
- [ ] 전체 동의 토글
- [ ] 필수 4개: 서비스 이용약관 / 개인정보 수집·이용 / **학생증 인증용 개인정보 수집·이용** / 위치 정보 수집·이용
- [ ] 선택 1개: 마케팅·이벤트 정보 수신
- [ ] 필수 4개 모두 체크 시에만 "다음 단계" 활성화
- [ ] "다음 단계" → **소셜 인증 없이** 생년월일 입력 화면으로 이동

> 상세 인터페이스·`CONSENT_ITEMS` 구조: [카카오 체크리스트 §2](./signup-redesign-kakao-checklist.md#2-약관-동의-바텀시트--3개-플로우-공용-컴포넌트)  
> 카카오·애플과 달리 약관 직후 바로 생년월일 — **인증 단계 생략**

---

## 3. 생년월일 입력 (애플과 동일 UI, 기존 로직)

**재사용:** `SignStepBirthDateCalendar.jsx` (애플 회원가입에서 구현)

### UI (애플과 100% 동일 컴포넌트)

- [ ] 상단: 뒤로가기 + "생년월일 입력" 타이틀
- [ ] 연/월 좌우 화살표 네비게이션
- [ ] 월간 달력 — 날짜 탭 선택, 일요일 빨강·토요일 파랑·선택일 원형 하이라이트
- [ ] "선택한 생년월일: YYYY년 MM월 DD일"
- [ ] "다음 단계" — 날짜 선택 시 활성화

### 로직 (기존 그대로, 변경 없음)

#### 연령 판정 유틸 (3플로우 공통)

**원본 파일:** `front/view/src/signup/signupBirthDatePolicy.js`  
(`Sign.jsx` `handleBirthDateNext`가 실제로 import·호출하는 파일)

| 함수 | 역할 |
|------|------|
| `isValidBirthDateString()` | `YYYY-MM-DD` 형식 검증 |
| `classifyBirthDateCase()` | **A** / **B** / **C** / **D** / `invalid` 판정 |
| `getBirthDateBoundaries()` | 가입 가능 생년월일 경계 (만 13~17세, 매년 롤링) |
| `computeAge()` | 만 나이 계산 (**이 파일이 원본 정의**) |

**차단 알림:** `authFeatureAlerts.js` — `showTooOldForSignupAlert()` (A), `showTooYoungForSignupAlert()` (D)

**재사용 핸들러 패턴** — `Sign.jsx` `handleBirthDateNext`

| `classifyBirthDateCase` 결과 | 처리 |
|------------------------------|------|
| `invalid` | 형식 오류 알림 |
| `A` (너무 연장) | `showTooOldForSignupAlert()` |
| `D` (너무 어림) | `showTooYoungForSignupAlert()` |
| `C` (만 14세 미만) | 보호자 인증 분기 (§4) |
| `B` (만 14세 이상) | 이니시스 본인인증 (§4) |

- [ ] "다음 단계" 탭 시 `classifyBirthDateCase(birthDate)` 호출
- [ ] `onBirthDateChange('YYYY-MM-DD')` 콜백 연동
- [ ] `applyBirthDateToState()` — `birthDate`, `formData`, `identityData` 동기화

> `signupAgeUtils.js`(`getSignupEligibility`)는 **미사용** — 참조하지 않는다.  
> [애플 체크리스트 §4-2](./signup-redesign-apple-checklist.md#4-2-기존-검증분기-로직-연결-로직-변경-없음)와 동일

### 기존 드롭다운 UI

- [ ] `SignStepAgeGate.jsx` — 레거시 `Sign.jsx`용으로 **유지** (이번 플로우에서는 미사용)

---

## 4. 연령 분기 및 본인인증

애플 플로우와 **동일한 분기·컴포넌트** 재사용.

### 만 14세 이상 (`birthCase === 'B'`)

- [ ] `SignupStudentIdentityIntroModal` → KG이니시스 본인인증
- [ ] `runStudentIdentityVerificationCore` (`Sign.jsx` 로직 재사용)
- [ ] `SignupIdentityVerifyingOverlay`
- [ ] 완료 후 → **계정 만들기** 단계 (§5)

### 만 14세 미만 (`birthCase === 'C'`)

- [ ] `SignStepGuardianConsentModal`
- [ ] 보호자 KG이니시스 — `runGuardianIdentityVerificationCore`
- [ ] 완료 후 학생 KG이니시스 — `runGuardianAndStudentVerification`
- [ ] 완료 후 → **계정 만들기** 단계 (§5)

### 카카오·애플과의 차이

- [ ] 본인인증 완료 후 **재학정보가 아닌 계정 만들기**로 이동
- [ ] 이니시스에서 수신한 `name`, `phone`, `birthDate` → `identityData`에 저장 (`Sign.jsx` 기존 패턴)

### 참고 — 기존 코드

| 기능 | 파일 |
|------|------|
| 보호자 동의 | `SignStepGuardianConsentModal.jsx` |
| 이니시스 | `Sign.jsx`, `services/inicisAuth.js` |
| 인증 오버레이 | `SignupIdentityVerifyingOverlay.jsx` |

> [애플 체크리스트 §5](./signup-redesign-apple-checklist.md#5-연령-분기-및-본인인증)

---

## 5. 계정 만들기 ~ 가입 마무리 (기존 컴포넌트 재사용)

**신규 개발 없음** — `SignPhone.jsx`에서 step state로 연결.

### Pending 세션 이어하기 (`SignPhone.jsx`)

> **기존 `Sign.jsx` 동작 (코드베이스 기준)**
>
> | 구분 | 구현 위치 | 내용 |
> |------|-----------|------|
> | 이니시스 인증 중단 복구 | `services/inicisAuth.js` | AsyncStorage `@inicis_pending_session` — `{ mTxId, purpose, startedAt }`, TTL 30분. 인증 시작 시 `savePendingSession`, 재개 시 `resumePendingInicisFlow()` |
> | 앱 cold start 라우팅 | `App.js` | 비로그인 + pending 있으면 `Sign` + `{ resumeInicis: true }` |
> | 화면 복원 | `Sign.jsx` | 마운트 시 `resumeInicisFromPending()`; 일반 진입 시 `clearPendingInicisSession()` |
> | step·입력값 전체 저장 | *(없음)* | **신규 오케스트레이터에서 `signupSessionStorage.js`로 추가** |

- [ ] 각 step 전환 시 현재 진행 state 저장 — `currentStep`, `consents`, `identityData`, `formData`, `stepInfoData`, `birthDate`, `stepInfoData`(username/password), 보호자/학생 이니시스 클라이언트 토큰, `studentVerificationToken` 등
- [ ] `signupSessionStorage.js`(권장) — 키 `@signup_pending_session`, payload에 `provider: 'phone'` + `savedAt` + state snapshot (TTL 30분 권장)
- [ ] `SignPhone` 마운트 시 저장된 state 확인 → 있으면 해당 step부터 복원; 없으면 약관·생년월일 첫 step부터
- [ ] `route.params.resumeSession === true` 또는 cold start 시 — 저장 state 복원 후, pending 이니시스가 있으면 `resumeInicisFromPending()` (`Sign.jsx` 패턴) 연동
- [ ] `App.js` — `getSignupPendingSession()` 시 `provider === 'phone'`이면 `SignPhone` + `{ resumeSession: true }`
- [ ] 이니시스 pending은 `inicisAuth.js` API 그대로 사용
- [ ] 명시적 이탈 시 `clearSignupPendingSession('phone')` + `clearPendingInicisSession()`
- [ ] 가입 완료(`handleComplete` 성공) 또는 로그인 완료 직후 저장 state + inicis pending **모두** 정리

### 5-1. 계정 만들기 ★ 전화번호 플로우 전용

**재사용:** `SignStep2.jsx`

- [ ] props: `accountOnly={true}`, `verifiedName`, `verifiedBirthDate`, `verifiedPhone` (이니시스 결과)
- [ ] 아이디 입력 — `isValidUsername()` (`signupValidation.js`)
- [ ] 비밀번호·비밀번호 확인 — `isValidPassword()`, 일치 검증
- [ ] `handleAccountNext` 로직 — `Sign.jsx`에서 복사·연결
- [ ] "다음 단계" — 유효성 통과 시 재학정보로 이동

### 5-2. 재학 정보 입력

- [ ] `SignStepSchoolSelect` — 학교 검색, 학년 자동계산, 반 입력

### 5-3. 학생증 인증

- [ ] `SignStepStudentIdVerify` — 기본 학생증 촬영
- [ ] 대안: `SignStepAltVerifyChoice` → `SignStepNeisPlusSubmit` / `SignStepCertificateGuide` + `SignStepCertificate`

### 5-4. 가입 마무리

- [ ] 기존 `handleComplete` / 마무리 UI 재사용
- [ ] payload: `username`, `password` 포함 (계정 단계에서 입력받음)
- [ ] 이번 작업: signup API 호출 mock 또는 스킵 명시

### Pending 세션 이어하기 (`SignPhone.jsx`) — 가입 마무리 시점

§5 Pending 세션 항목과 **동일 규칙** 적용. 가입 마무리 단계에서 추가로 확인:

- [ ] 각 step 전환 시 현재 진행 state 저장 — `currentStep`, `consents`, `identityData`, `formData`, `stepInfoData`, `birthDate`, username/password, 보호자/학생 이니시스 클라이언트 토큰, `studentVerificationToken` 등
- [ ] `SignPhone` 마운트 시 저장된 state 확인 → 있으면 해당 step부터 복원; 없으면 진입 화면부터
- [ ] `route.params.resumeSession` / `App.js` cold start → `SignPhone` 복원 + 이니시스 `resumeInicisFromPending()` 연동
- [ ] 명시적 이탈 시 `clearSignupPendingSession('phone')` + `clearPendingInicisSession()`
- [ ] **가입 완료(`handleComplete` 성공) 직후** pending 세션·inicis pending 정리 — 재진입 시 가입 화면이 뜨지 않아야 함

### Step 순서 (전화번호 전용)

```
ACCOUNT(2) → SCHOOL_SELECT(3) → STUDENT_VERIFY(4) → [대안 경로] → COMPLETE
```

> 기존 `Sign.jsx` STEP 상수와 동일 번호 재사용 가능 — CONSENT(0)·BIRTH_DATE(1)는 `SignPhone`에서 선행 처리

---

## 6. 학생증 승인 완료 후 (카카오·애플과 차이)

- [ ] **`SignProfileUsername` 화면 사용하지 않음**
- [ ] 학생증 승인(`studentVerificationStatus === 'APPROVED'`) 후 앱 최초 진입 시 **메인으로 직행**
- [ ] AuthContext / 로그인 후 리다이렉트 로직에서 `signupMethod === 'phone'` 이면 프로필 아이디 게이트 스킵
- [ ] 계정 만들기에서 입력한 `username`이 로그인·친구 검색용 아이디로 사용됨

### 구현 시 체크

- [ ] `SignProfileUsername` 노출 조건에 `signupMethod !== 'phone'` (또는 동등 플래그) 추가
- [ ] 카카오·애플만 `needsProfileUsername` 플래그 true

---

## 7. 이번 작업에서 하지 않는 것

- [ ] signup API 실제 호출·파라미터 변경
- [ ] 이니시스 백엔드 토큰 검증
- [ ] 전화번호 SMS 인증 (레거시 `phone_verifications` — 이니시스 ON 시 미사용)
- [ ] `SignProfileUsername` 구현·연동 (전화번호 플로우 제외)
- [ ] `SignStepAgeGate.jsx` 드롭다운 UI 제거 (레거시 유지)

---

## 8. 수동 테스트 체크리스트

### 진입·약관

- [ ] 전화번호 버튼 → `SignupConsentSheet` (`provider="phone"`, 카카오·애플과 동일 UI)
- [ ] 필수 4개 미체크 시 "다음 단계" 비활성
- [ ] 약관 완료 후 **소셜 인증 없이** 생년월일 화면 진입

### 생년월일 (달력 UI)

- [ ] 애플과 동일 달력 UI·동작
- [ ] 만 13~17세 범위 밖 → A/D 차단 알림
- [ ] 만 14세 이상 → 이니시스만
- [ ] 만 14세 미만 → 보호자 → 이니시스

### 계정 ~ 완료

- [ ] 본인인증 후 **계정 만들기** 화면 진입 (재학정보 아님)
- [ ] 아이디·비밀번호 유효성·일치 검증
- [ ] 재학정보 · 학생증 · 가입 마무리까지 도달

### 승인 후

- [ ] mock 승인 완료 시 프로필 아이디 화면 **미노출**
- [ ] 메인(또는 mock 목적지) 직행

### Pending 세션 이어하기

- [ ] 특정 step(예: 생년월일·계정 만들기·이니시스 인증 중) 진행 중 앱 강제 종료 → 재진입 시 **해당 step으로 복원**되는지 확인
- [ ] 이니시스 브라우저 이탈 후 cold start → `SignPhone` 복귀 + 인증 재개 또는 오버레이 복원 확인
- [ ] 가입 완료 후 재진입 시 pending 세션(`@signup_pending_session`, `@inicis_pending_session`) **잔존 없음** 확인
- [ ] 플로우 명시적 취소(진입 화면 복귀) 후 재진입 시 처음부터 시작되는지 확인

---

## 9. 파일 목록 (예상)

| 구분 | 파일 | 비고 |
|------|------|------|
| 재사용 | `SignupEntry.jsx` | 진입 (3플로우 공유) |
| 재사용 | `SignupConsentSheet.jsx` | 약관 바텀시트 (3플로우 공용) |
| 재사용 | `signupConsentItems.js` | `CONSENT_ITEMS` 상수 |
| 재사용 | `SignStepBirthDateCalendar.jsx` | 생년월일 (애플과 공유) |
| 신규 | `SignPhone.jsx` | 전화번호 플로우 오케스트레이터 |
| 신규 | `signupSessionStorage.js` | (권장) step state pending 저장·복원 공용 유틸 |
| 수정 | `App.js` | `SignPhone` 라우트 + pending cold start 라우팅 |
| 수정 | `Login.jsx` | 회원가입 → `SignupEntry` 또는 `SignPhone` (선택) |
| 재사용 | `services/inicisAuth.js` | 이니시스 pending 세션 (`@inicis_pending_session`) |
| 재사용 | `SignStep2.jsx` | 계정 만들기 |
| 재사용 | `SignStepSchoolSelect.jsx` | 재학정보 |
| 재사용 | `SignStepStudentIdVerify.jsx` | 학생증 |
| 재사용 | `SignStepGuardianConsentModal.jsx` | 만 14세 미만 |
| **미사용** | `SignProfileUsername.jsx` | 전화번호 플로우 제외 |
| 로직만 | `signupBirthDatePolicy.js` | 연령 판정·범위 (`classifyBirthDateCase` 등) |
| 로직만 | `authFeatureAlerts.js` | A/D 차단 알림 |
| 로직만 | `signupBirthDatePolicy.test.js` | 판정 로직 단위 테스트 |
| 로직만 | `signupValidation.js` | 아이디·비밀번호 (변경 없음) |

---

## 10. `SignPhone.jsx` Step 설계 (권장)

```js
const PHONE_STEP = {
  BIRTH_DATE: 'birth_date',
  ACCOUNT: 'account',
  SCHOOL_SELECT: 'school_select',
  STUDENT_VERIFY: 'student_verify',
  ALT_VERIFY_CHOICE: 'alt_verify_choice',
  CERTIFICATE_GUIDE: 'certificate_guide',
  CERTIFICATE_SUBMIT: 'certificate_submit',
  NEIS_PLUS_SUBMIT: 'neis_plus_submit',
  COMPLETE: 'complete',
};
```

- [ ] 약관은 `SignupEntry` + `SignupConsentSheet`에서 처리 후 `SignPhone`으로 `consents` 전달
- [ ] `Sign.jsx`의 핸들러(`handleAccountNext`, `handleSchoolSelectNext`, `handleComplete` 등)를 훅으로 추출하면 3플로우 중복 최소화 (선택)

---

## 관련 문서

- [카카오 회원가입 체크리스트](./signup-redesign-kakao-checklist.md)
- [애플 회원가입 체크리스트](./signup-redesign-apple-checklist.md)
- [회원가입 개편 — 유효성 검사 우회 체크리스트](./signup-redesign-validation-checklist.md)

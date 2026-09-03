# 애플 회원가입 플로우 — 프론트엔드 구현 체크리스트

> **작업 범위:** 프론트엔드 UI·화면 전환·로컬 유효성 검증만.  
> Apple 로그인 SDK 실제 연동, 프로필 아이디 저장 API, signup API 파라미터 변경은 **별도 작업**.

---

## 플로우 개요

```
[진입 화면] (카카오와 공유) → Apple로 시작하기
    → [약관 동의 바텀시트] (카카오와 공유 UI)
    → [애플 인증] (mock: 이름·토큰)
    → [생년월일 입력] ★ 신규 달력 UI + 기존 검증 로직
    → 만 14세 미만? → [보호자 인증] → [KG이니시스 본인인증]
                  └ 만 14세 이상 ───→ [KG이니시스 본인인증]
    → [재학정보] → [학생증] → [가입 마무리]
    → (학생증 승인 후 최초 진입) → [프로필 아이디] (카카오와 공유) → 메인
```

---

## 0. 사전 준비

- [ ] 카카오 체크리스트에서 구현한 **공유 컴포넌트** 확인·재사용
  - `SignupEntry.jsx` — 진입 화면
  - `SignupConsentSheet.jsx` — 약관 바텀시트 (`provider: 'apple'`)
  - `SignProfileUsername.jsx` — 승인 후 프로필 아이디
- [ ] `App.js`에 `SignApple` (애플 플로우 오케스트레이터) 라우트 등록
- [ ] mock 애플 사용자 데이터 상수 정의

```js
// 예시 — front/view/src/signup/appleSignupMocks.js
export const APPLE_MOCK_PROFILE = {
  name: '애플테스트',
  appleUserId: 'apple-mock-user-001',
  identityToken: 'mock-apple-identity-token',
};
```

- [ ] **(옵션, 권장)** 공용 pending 세션 유틸 `signupSessionStorage.js` — [카카오 §0](./signup-redesign-kakao-checklist.md#0-사전-준비)과 동일 키·API (`provider: 'apple'`)
- [ ] 이니시스 중단 복구는 `services/inicisAuth.js` **그대로 재사용**

---

## 1. 진입 화면 (카카오와 공유)

**재사용:** `front/view/src/signup/SignupEntry.jsx`

- [ ] "Apple로 시작하기" 버튼 활성화 (카카오 구현 시 placeholder였다면 연결)
- [ ] 탭 시 약관 동의 바텀시트 오픈 (`provider: 'apple'`)
- [ ] 카카오·전화번호 버튼과 동일 레이아웃 유지

> 카카오 체크리스트 [1. 진입 화면](./signup-redesign-kakao-checklist.md#1-진입-화면-signupentry) 참고

---

## 2. 약관 동의 바텀시트 (카카오·전화번호와 공유 UI)

**재사용:** `SignupConsentSheet.jsx` — 카카오 구현 단계에서 작성된 **3플로우 공용** 컴포넌트

- [ ] "Apple로 시작하기" 탭 → 바텀시트 노출 (`provider="apple"`, 풀스크린 전환 아님)
- [ ] 전체 동의 토글
- [ ] 필수 4개: 서비스 이용약관 / 개인정보 수집·이용 / **학생증 인증용 개인정보 수집·이용** / 위치 정보 수집·이용
- [ ] 선택 1개: 마케팅·이벤트 정보 수신
- [ ] 필수 4개 모두 체크 시에만 "다음 단계" 활성화
- [ ] "다음 단계" → `SignApple` 화면으로 이동 + `consents` 전달

> 상세 인터페이스·`CONSENT_ITEMS` 구조: [카카오 체크리스트 §2](./signup-redesign-kakao-checklist.md#2-약관-동의-바텀시트--3개-플로우-공용-컴포넌트)

---

## 3. 애플 소셜 인증 (mock)

**권장:** `SignApple.jsx` 내부 1단계 또는 `AppleAuthStep.jsx`

### UI / UX

- [ ] 약관 완료 직후 애플 로그인 진행 화면 (로딩·안내)
- [ ] 실제 `expo-apple-authentication` / Sign in with Apple SDK 호출 **없이** mock 진행
- [ ] mock 수신 필드
  - `name` (이름 — 최초 1회만 제공된다고 가정)
  - `identityToken` (로그인 토큰 placeholder)
  - `appleUserId` (선택, 추후 연동 대비)

### 제외 (추후)

- [ ] ~~Apple SDK 설치·초기화~~
- [ ] ~~identityToken 서버 검증~~
- [ ] ~~애플 계정 연동 상태 저장~~

### 다음 단계

- [ ] mock 인증 완료 → **생년월일 입력 화면**으로 이동 (애플은 생년월일 미제공)

### Pending 세션 이어하기 (`SignApple.jsx`)

> **기존 `Sign.jsx` 동작 (코드베이스 기준)**
>
> | 구분 | 구현 위치 | 내용 |
> |------|-----------|------|
> | 이니시스 인증 중단 복구 | `services/inicisAuth.js` | AsyncStorage `@inicis_pending_session` — `{ mTxId, purpose, startedAt }`, TTL 30분. 인증 시작 시 `savePendingSession`, 재개 시 `resumePendingInicisFlow()` |
> | 앱 cold start 라우팅 | `App.js` | 비로그인 + pending 있으면 `Sign` + `{ resumeInicis: true }` |
> | 화면 복원 | `Sign.jsx` | 마운트 시 `resumeInicisFromPending()`; 일반 진입 시 `clearPendingInicisSession()` |
> | step·입력값 전체 저장 | *(없음)* | **신규 오케스트레이터에서 `signupSessionStorage.js`로 추가** |

- [ ] 각 step 전환 시 현재 진행 state 저장 — `currentStep`, `consents`, `identityData`, `formData`, `stepInfoData`, `birthDate`, 보호자/학생 이니시스 클라이언트 토큰, `studentVerificationToken` 등
- [ ] `signupSessionStorage.js`(권장) — 키 `@signup_pending_session`, payload에 `provider: 'apple'` + `savedAt` + state snapshot (TTL 30분 권장)
- [ ] `SignApple` 마운트 시 저장된 state 확인 → 있으면 해당 step부터 복원; 없으면 약관·애플 인증 첫 step부터
- [ ] `route.params.resumeSession === true` 또는 cold start 시 — 저장 state 복원 후, pending 이니시스가 있으면 `resumeInicisFromPending()` (`Sign.jsx` 패턴) 연동
- [ ] `App.js` — `getSignupPendingSession()` 시 `provider === 'apple'`이면 `SignApple` + `{ resumeSession: true }`
- [ ] 이니시스 pending은 `inicisAuth.js` API 그대로 사용
- [ ] 명시적 이탈 시 `clearSignupPendingSession('apple')` + `clearPendingInicisSession()`
- [ ] 가입 완료(`handleComplete` 성공) 또는 로그인 완료 직후 저장 state + inicis pending **모두** 정리

---

## 4. 생년월일 입력 ★ 신규 UI + 기존 로직

### 4-1. 신규 UI 컴포넌트

**신규 파일 권장:** `front/view/src/signup/SignStepBirthDateCalendar.jsx`

**디자인 참고:** `생년월일_입력.png` (디자인 에셋)

#### 레이아웃

- [ ] 상단: 뒤로가기(`chevron-back`) + "생년월일 입력" 타이틀 — `Sign.jsx` header 패턴 참고
- [ ] 연/월 네비게이션: 좌·우 화살표로 이전/다음 달 이동
- [ ] 월간 달력 그리드
  - [ ] 날짜 직접 탭 선택
  - [ ] 일요일 빨강, 토요일 파랑
  - [ ] 선택된 날짜 원형 하이라이트
- [ ] 선택 요약: "선택한 생년월일: YYYY년 MM월 DD일"
- [ ] 하단 "다음 단계" — **유효한 날짜 선택 시에만** 활성화

#### 구현 참고 (그리드만)

| 기존 코드 | 용도 |
|-----------|------|
| `timerModals.jsx` — `CalendarModal` | 월 그리드·요일 헤더 패턴 |
| `mealcalender.jsx` + `calender.style.js` | 달력 스타일 참고 |
| `SignStepAgeGate.jsx` | `buildBirthDate()`, `daysInMonth()` 유틸 재사용 가능 |

#### UI에서 제한할 선택 범위 (선택 사항)

- [ ] 달력에서 `getBirthDateBoundaries()` 기준 선택 가능 연도·날짜만 활성화 (UX 개선)
- [ ] 범위 밖 날짜는 비활성(회색) 처리 — **차단 판정 자체는 기존 로직에 위임**

### 4-2. 기존 검증·분기 로직 연결 (로직 변경 없음)

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

**재사용 핸들러 패턴** — `Sign.jsx` `handleBirthDateNext` (로직 그대로 복사·연결)

- [ ] "다음 단계" 탭 시 `classifyBirthDateCase(birthDate)` 호출
- [ ] `invalid` → `Alert.alert('알림', '생년월일을 올바르게 입력해 주세요.')`
- [ ] `A` (너무 연장) → `showTooOldForSignupAlert()` (`authFeatureAlerts.js`)
- [ ] `D` (너무 어림) → `showTooYoungForSignupAlert()` (`authFeatureAlerts.js`)
- [ ] `C` (만 14세 미만) → 보호자 인증 분기로 이동 (§5)
- [ ] `B` (만 14세 이상) → KG이니시스 본인인증으로 이동 (§5)

> `signupAgeUtils.js`(`getSignupEligibility`)는 **미사용** — 참조하지 않는다.

> **주의:** 기존 `SignStepAgeGate.jsx`(드롭다운 UI)는 **교체하지 않음**.  
> 애플 플로우에서만 `SignStepBirthDateCalendar` 사용. 전화번호 가입 등 기존 `Sign.jsx`는 유지.

### 4-3. 상태 연동

- [ ] `onBirthDateChange('YYYY-MM-DD')` 콜백 — `SignStepAgeGate`와 동일 인터페이스
- [ ] `applyBirthDateToState()` 패턴 — `identityData.birthDate`, `formData.birthDate` 동기화
- [ ] 애플 mock `name`은 `identityData.name`에 유지 (본인인증·가입 payload용)

---

## 5. 연령 분기 및 본인인증

### 만 14세 이상 (`birthCase === 'B'`)

- [ ] `SignupStudentIdentityIntroModal` 표시 후 KG이니시스 본인인증
- [ ] `runStudentIdentityVerificationCore` — `Sign.jsx` 로직 재사용
- [ ] `SignupIdentityVerifyingOverlay` (인증 중 오버레이)
- [ ] 완료 후 → 재학정보 단계

### 만 14세 미만 (`birthCase === 'C'`)

- [ ] `SignStepGuardianConsentModal` 표시
- [ ] 보호자 KG이니시스 본인인증 — `runGuardianIdentityVerificationCore` 재사용
- [ ] 보호자 인증 완료 후 → 학생 KG이니시스 본인인증 (`runGuardianAndStudentVerification` 또는 동일 순서)
- [ ] 완료 후 → 재학정보 단계

### 참고 — 기존 코드 위치

| 기능 | 파일 |
|------|------|
| 보호자 동의 모달 | `SignStepGuardianConsentModal.jsx` |
| 본인인증 intro | `SignupStudentIdentityIntroModal.jsx` |
| 이니시스 플로우 | `Sign.jsx`, `services/inicisAuth.js` |
| 인증 오버레이 | `SignupIdentityVerifyingOverlay.jsx` |

### 카카오 플로우와의 차이

| 항목 | 카카오 | 애플 |
|------|--------|------|
| 생년월일 출처 | 카카오 mock에서 수신 | 사용자 직접 입력 (신규 달력 UI) |
| 본인인증 | 카카오 정보로 전화 확보 가정, 분기 단순화 가능 | **항상** KG이니시스 본인인증 필요 |
| 생년월일 UI | 없음 | `SignStepBirthDateCalendar` 신규 |

---

## 6. 재학정보 ~ 가입 마무리 (기존 컴포넌트 재사용)

**신규 개발 없음** — `SignApple.jsx`에서 step state로 연결.

### 6-1. 재학 정보 입력

- [ ] `SignStepSchoolSelect` — 학교 검색, 학년 자동계산, 반 입력

### 6-2. 학생증 인증

- [ ] `SignStepStudentIdVerify` — 기본 학생증 촬영
- [ ] 대안: `SignStepAltVerifyChoice` → `SignStepNeisPlusSubmit` / `SignStepCertificateGuide` + `SignStepCertificate`

### 6-3. 가입 마무리

- [ ] 기존 가입 완료 UI·제출 흐름 재사용
- [ ] 애플 플로우: 계정(아이디·비밀번호) 단계 **생략** (카카오와 동일)
- [ ] signup API 호출 — 이번 작업: mock 또는 스킵 명시

### Pending 세션 이어하기 (`SignApple.jsx`) — 가입 마무리 시점

§3 Pending 세션 항목과 **동일 규칙** 적용. 가입 마무리 단계에서 추가로 확인:

- [ ] 각 step 전환 시 현재 진행 state 저장 — `currentStep`, `consents`, `identityData`, `formData`, `stepInfoData`, `birthDate`, 보호자/학생 이니시스 클라이언트 토큰, `studentVerificationToken` 등
- [ ] `SignApple` 마운트 시 저장된 state 확인 → 있으면 해당 step부터 복원; 없으면 진입 화면부터
- [ ] `route.params.resumeSession` / `App.js` cold start → `SignApple` 복원 + 이니시스 `resumeInicisFromPending()` 연동
- [ ] 명시적 이탈 시 `clearSignupPendingSession('apple')` + `clearPendingInicisSession()`
- [ ] **가입 완료(`handleComplete` 성공) 직후** pending 세션·inicis pending 정리 — 재진입 시 가입 화면이 뜨지 않아야 함

### 오케스트레이터 전략

- [ ] **권장:** `SignApple.jsx` 신규 — 생년월일~완료 step 관리
- [ ] `Sign.jsx`에 `signupMethod: 'apple'` 분기는 **비권장** (생년월일 UI가 다름)

---

## 7. 프로필 아이디 입력 (카카오와 공유)

**재사용:** `front/view/src/signup/SignProfileUsername.jsx`

- [ ] 학생증 승인 완료 후 최초 진입 시 1회 노출
- [ ] `isValidUsername()` — `front/utils/signupValidation.js`
- [ ] "시작하기" → 메인 진입
- [ ] 백엔드 저장 API — 추후

> 카카오 체크리스트 [6. 프로필 아이디](./signup-redesign-kakao-checklist.md#6-신규-화면--프로필-아이디-입력-학생증-승인-완료-후-최초-진입-시) 참고

---

## 8. 공통·스타일

- [ ] 애플 버튼: 검정 배경 + 흰색 애플 아이콘 (`SignupEntry`에 이미 정의)
- [ ] 생년월일 달력: 일요일 `colors` 빨강, 토요일 파랑 — `colors.js` 토큰 활용
- [ ] `SignupIosSafeModal` — iOS 모달 터치 이슈 (보호자·인증 모달)
- [ ] Apple 플로우는 iOS 실기 테스트 우선 (Sign in with Apple은 iOS 필수 검증 대상)

---

## 9. 이번 작업에서 하지 않는 것

- [ ] Apple Sign In SDK (`expo-apple-authentication`) 실제 연동
- [ ] identityToken / authorizationCode 백엔드 전송
- [ ] signup API `verificationMethod: 'apple'` 파라미터
- [ ] 프로필 아이디 저장 API
- [ ] `SignStepAgeGate.jsx` 기존 드롭다운 UI 변경 (전화번호 가입용 유지)
- [ ] 생년월일 검증 로직 변경 (`classifyBirthDateCase` 등)

---

## 10. 수동 테스트 체크리스트

### 진입·약관 (공유)

- [ ] Apple 버튼 → `SignupConsentSheet` (`provider="apple"`, 카카오와 동일 UI)
- [ ] 필수 4개 미체크 시 "다음 단계" 비활성

### 애플 인증 mock

- [ ] mock 이름 수신 후 생년월일 화면으로 전환

### 생년월일 (신규 UI)

- [ ] 월 이전/다음 화살표 동작
- [ ] 날짜 탭 → 하이라이트 + "선택한 생년월일" 문구 갱신
- [ ] 미선택 시 "다음 단계" 비활성
- [ ] 만 13~17세 범위 밖 → 기존과 동일 차단 알림 (A/D)
- [ ] 만 14세 이상 선택 → 이니시스 본인인증만
- [ ] 만 14세 미만 선택 → 보호자 모달 → 보호자 인증 → 학생 이니시스

### 기존 step 재사용

- [ ] 재학정보 · 학생증 · 가입 마무리까지 도달
- [ ] 프로필 아이디 화면 (mock 진입) · 유효성 · 메인 이동

### Pending 세션 이어하기

- [ ] 특정 step(예: 생년월일·이니시스 인증 중·재학정보) 진행 중 앱 강제 종료 → 재진입 시 **해당 step으로 복원**되는지 확인
- [ ] 이니시스 브라우저 이탈 후 cold start → `SignApple` 복귀 + 인증 재개 또는 오버레이 복원 확인
- [ ] 가입 완료 후 재진입 시 pending 세션(`@signup_pending_session`, `@inicis_pending_session`) **잔존 없음** 확인
- [ ] 플로우 명시적 취소(진입 화면 복귀) 후 재진입 시 처음부터 시작되는지 확인

---

## 11. 파일 목록 (예상)

| 구분 | 파일 | 비고 |
|------|------|------|
| 재사용 | `SignupEntry.jsx` | 진입 (카카오 공유) |
| 재사용 | `SignupConsentSheet.jsx` | 약관 바텀시트 (3플로우 공용, 카카오에서 최초 구현) |
| 재사용 | `signupConsentItems.js` | `CONSENT_ITEMS` 상수 |
| 신규 | `SignApple.jsx` | 애플 플로우 오케스트레이터 |
| 신규 | `SignStepBirthDateCalendar.jsx` | ★ 달력 UI (로직은 기존 연결) |
| 신규 | `appleSignupMocks.js` | mock 프로필 |
| 신규 | `signupSessionStorage.js` | (권장) step state pending 저장·복원 공용 유틸 |
| 재사용 | `SignProfileUsername.jsx` | 프로필 아이디 (카카오 공유) |
| 수정 | `App.js` | `SignApple` 라우트 + pending cold start 라우팅 |
| 재사용 | `services/inicisAuth.js` | 이니시스 pending 세션 (`@inicis_pending_session`) |
| 재사용 | `SignStepSchoolSelect.jsx` | 재학정보 |
| 재사용 | `SignStepStudentIdVerify.jsx` | 학생증 |
| 재사용 | `SignStepGuardianConsentModal.jsx` | 만 14세 미만 |
| 유지 | `SignStepAgeGate.jsx` | 전화번호 가입용 (변경 없음) |
| 로직만 | `signupBirthDatePolicy.js` | 연령 판정·범위 (`classifyBirthDateCase` 등) |
| 로직만 | `authFeatureAlerts.js` | A/D 차단 알림 |
| 로직만 | `signupBirthDatePolicy.test.js` | 판정 로직 단위 테스트 |

---

## 관련 문서

- [카카오 회원가입 체크리스트](./signup-redesign-kakao-checklist.md)
- [회원가입 개편 — 유효성 검사 우회 체크리스트](./signup-redesign-validation-checklist.md)
- [전화번호 회원가입 체크리스트](./signup-redesign-phone-checklist.md)

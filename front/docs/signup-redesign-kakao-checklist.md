# 카카오 회원가입 플로우 — 프론트엔드 구현 체크리스트

> **작업 범위:** 프론트엔드 UI·화면 전환·로컬 유효성 검증만.  
> 카카오 SDK 실제 연동, 프로필 아이디 저장 API, signup API 파라미터 변경은 **별도 작업**.

---

## 플로우 개요

```
[진입 화면] (3플로우 공유) → 카카오로 시작하기
    → [약관 동의 바텀시트] (SignupConsentSheet, provider="kakao")
    → [카카오 인증] (mock)
    → 만 14세 미만? → [보호자 인증] → [재학정보] → [학생증] → [가입 마무리]
                  └ 만 14세 이상 ─────→ [재학정보] → [학생증] → [가입 마무리]
    → (학생증 승인 후 최초 진입) → [프로필 아이디 입력] → 메인
```

---

## 0. 사전 준비

- [ ] `App.js`에 신규 화면 라우트 등록 계획 수립
  - 권장: `SignupEntry` (진입), `SignKakao` (카카오 플로우 오케스트레이터), `SignProfileUsername` (승인 후 아이디)
- [ ] **`SignupConsentSheet.jsx`를 카카오 작업 단계에서 최초 구현** — 애플·전화번호 플로우가 동일 컴포넌트를 재사용 (§2 참고)
- [ ] 기존 `Login.jsx`의 "회원가입" 버튼 → `SignupEntry`로 이동하도록 변경 여부 결정
- [ ] `Sign.jsx`와 분리할 상태·핸들러 범위 정의 (카카오 전용 플로우 컨테이너)
- [ ] mock 카카오 사용자 데이터 상수 정의 (이름·생년월일·전화번호)
- [ ] **(옵션, 권장)** 공용 pending 세션 유틸 `signupSessionStorage.js` 설계
  - 3플로우 동일 키·네이밍: `@signup_pending_session` + payload `provider` (`'kakao'|'apple'|'phone'`)
  - `saveSignupPendingSession` / `getSignupPendingSession` / `clearSignupPendingSession`
  - 이니시스 중단 복구는 기존 `services/inicisAuth.js` (`@inicis_pending_session`) **그대로 재사용**

```js
// 예시 — front/view/src/signup/kakaoSignupMocks.js
export const KAKAO_MOCK_PROFILE = {
  name: '카카오테스트',
  birthDate: '2010-05-15', // 만 14세 이상 케이스
  phone: '01012345678',
};
export const KAKAO_MOCK_PROFILE_UNDER14 = {
  name: '카카오어린이',
  birthDate: '2015-03-01',
  phone: '01098765432',
};
```

---

## 1. 진입 화면 (`SignupEntry`)

**신규 파일 권장:** `front/view/src/signup/SignupEntry.jsx`

### UI

- [ ] 중앙 상단: 서비스 로고 (`Logo.svg` 재사용) + "YOUTH PAPER" 워드마크
- [ ] 버튼 3개 세로 스택 (위→아래 순서)
  - [ ] **카카오로 시작하기** — 노란 배경(`#FEE500` 등), 검정 말풍선 아이콘 + 텍스트
  - [ ] **Apple로 시작하기** — 검정 배경, 흰 애플 아이콘 + 텍스트 → *이번 작업: 비활성 또는 "준비 중" (Apple 체크리스트에서 구현)*
  - [ ] **전화번호로 시작하기** — 흰 배경, 연두색 테두리 → *이번 작업: 비활성 또는 기존 `Sign`으로 라우팅 placeholder*
- [ ] 하단: "이미 계정이 있나요? **로그인**" → `navigation.navigate('Login')`

### 동작

- [ ] "카카오로 시작하기" 탭 → 공용 약관 동의 바텀시트 오픈 (`provider="kakao"`, 화면 전환 없음)
- [ ] SafeArea·키보드·스크롤 없는 단순 진입 레이아웃
- [ ] `login.style.js` 또는 신규 `signupEntry.style.js`로 스타일 분리

### 네비게이션

- [ ] `App.js` — `<Stack.Screen name="SignupEntry" component={SignupEntry} />` 등록

---

## 2. 약관 동의 바텀시트 — **3개 플로우 공용 컴포넌트**

> **카카오·애플·전화번호가 동일한 `SignupConsentSheet.jsx`를 공유한다.**  
> 카카오 구현 단계에서 이 컴포넌트를 **최초 작성**하고, 애플·전화번호는 `provider` prop만 바꿔 재사용한다.

**신규 파일:** `front/view/src/signup/SignupConsentSheet.jsx`  
**상수 분리 권장:** `front/view/src/signup/signupConsentItems.js` — `CONSENT_ITEMS` 및 provider별 override

> 기존 `SignStepConsent.jsx`는 **풀스크린 0단계**(레거시 전화번호 `Sign.jsx`용)이며 UI·노출 방식이 다름.  
> 개편 플로우는 바텀시트 전용 `SignupConsentSheet`를 사용한다. 약관 본문 모달은 `SignStepTermsOfService` / `SignStepPrivacyPolicy` 재사용 검토.

### 인터페이스

```jsx
<SignupConsentSheet
  visible={consentSheetVisible}
  provider="kakao"  // 'kakao' | 'apple' | 'phone'
  onClose={() => setConsentSheetVisible(false)}
  onConfirm={(consents) => { /* 다음 단계 */ }}
/>
```

| Prop | 타입 | 설명 |
|------|------|------|
| `visible` | `boolean` | 바텀시트 표시 여부 |
| `provider` | `'kakao' \| 'apple' \| 'phone'` | 가입 경로 식별. 현재 UI·문구는 동일하나 로깅·분석·추후 override용 |
| `onClose` | `() => void` | 닫기(배경 탭·스와이프 등) |
| `onConfirm` | `(consents: ConsentsState) => void` | 필수 항목 충족 후 "다음 단계" |

`onConfirm`이 반환하는 `consents` 키는 기존 `SignStepConsent`·signup API와 맞춘다:

| 키 | 필수 | 라벨 |
|----|------|------|
| `termsOfService` | ✅ | 서비스 이용약관 동의 |
| `dataCollection` | ✅ | 회원가입 및 서비스 제공을 위한 개인정보 수집·이용 |
| `studentOcr` | ✅ | 학생증 인증용 개인정보 수집·이용 |
| `location` | ✅ | 위치 정보 수집·이용 |
| `marketingOptIn` | 선택 | 마케팅·이벤트 정보 수신 |

### `CONSENT_ITEMS` 상수 구조 (provider override 대비)

컴포넌트 내부 하드코딩 대신 상수로 분리한다. provider별 문구가 달라질 때 `CONSENT_ITEMS_BY_PROVIDER[provider]`로 override.

```js
// signupConsentItems.js (예시)
export const DEFAULT_CONSENT_ITEMS = [
  { key: 'termsOfService', required: true, label: '서비스 이용약관 동의', detail: 'terms' },
  { key: 'dataCollection', required: true, label: '회원가입 및 서비스 제공을 위한 개인정보 수집·이용', detail: 'privacy' },
  { key: 'studentOcr', required: true, label: '학생증 인증용 개인정보 수집·이용', detail: 'privacy' },
  { key: 'location', required: true, label: '위치 정보 수집·이용', detail: null },
  { key: 'marketingOptIn', required: false, label: '마케팅·이벤트 정보 수신', detail: null },
];

export function getConsentItemsForProvider(provider) {
  // 현재는 세 provider 모두 DEFAULT 반환. 추후 provider별 배열 merge.
  return DEFAULT_CONSENT_ITEMS;
}
```

- [ ] `provider` 수신 시 `__DEV__` 로깅 또는 analytics hook 자리 확보 (텍스트 분기는 현재 불필요)

### UI

- [ ] 바텀시트 형태 (`Modal` + 하단 슬라이드업 또는 `@gorhom/bottom-sheet` 도입 검토 — 현재 프로젝트에 미설치)
- [ ] 상단: "항목 전체 동의" 체크박스
- [ ] 안내 문구: "이용약관 및 개인정보처리방침을 읽었으며 이에 모두 동의합니다"
- [ ] `CONSENT_ITEMS` 기반 개별 항목 리스트 렌더
  - [ ] [필수] 서비스 이용약관 동의 (+ 상세 보기 → `SignStepTermsOfService`)
  - [ ] [필수] 회원가입 및 서비스 제공을 위한 개인정보 수집·이용 (+ 상세 보기)
  - [ ] [필수] **학생증 인증용 개인정보 수집·이용** (+ 상세 보기)
  - [ ] [필수] 위치 정보 수집·이용
  - [ ] [선택] 마케팅·이벤트 정보 수신
- [ ] 하단 안내: "* 필수 항목 동의 거부 시 회원가입 및 서비스 이용이 제한됩니다."
- [ ] "다음 단계" 버튼

### 유효성

- [ ] **필수 4개**(`termsOfService`, `dataCollection`, `studentOcr`, `location`) 모두 체크 시에만 "다음 단계" 활성화
- [ ] 마케팅(`marketingOptIn`)은 선택 — 미체크여도 진행 가능
- [ ] "항목 전체 동의" 토글 시 필수 4개 + 선택 1개 일괄 on/off

### 동작 (카카오 플로우)

- [ ] `SignupEntry`에서 `provider="kakao"`로 시트 오픈
- [ ] "다음 단계" 탭 → 바텀시트 닫기 → 카카오 플로우 화면(`SignKakao`)으로 이동
- [ ] 동의 상태를 `consents` 객체로 상위에 전달·보관 (추후 signup API 연동 대비)

### 다른 플로우에서의 재사용

| 플로우 | `provider` | "다음 단계" 후 이동 |
|--------|------------|---------------------|
| 카카오 | `'kakao'` | `SignKakao` (카카오 인증 mock) |
| 애플 | `'apple'` | `SignApple` (애플 인증 mock) |
| 전화번호 | `'phone'` | `SignPhone` (생년월일 입력) |

> 애플·전화번호 체크리스트는 이 컴포넌트를 **재사용**만 명시한다. — [애플 §2](./signup-redesign-apple-checklist.md#2-약관-동의-바텀시트-카카오와-공유-ui) · [전화번호 §2](./signup-redesign-phone-checklist.md#2-약관-동의-바텀시트-카카오애플과-공유-ui)

---

## 3. 카카오 소셜 인증 (mock)

**권장:** `SignKakao.jsx` 내부 1단계 또는 별도 `KakaoAuthStep.jsx`

### UI / UX

- [ ] 약관 완료 직후 카카오 인증 진행 화면 표시 (로딩·안내 문구)
- [ ] 실제 SDK 호출 없이 mock 프로필 주입 후 다음 단계로 자동/수동 진행
- [ ] 개발용: 만 14세 이상/미만 mock 프로필 전환 토글 (선택)

### 데이터

- [ ] mock에서 수신한다고 가정하는 필드
  - `name` (이름)
  - `birthDate` (`YYYY-MM-DD`)
  - `phone` (전화번호)
- [ ] `identityData` 형태로 정규화 — 기존 `Sign.jsx`의 `identityData` 구조와 맞추기

### 제외 (추후)

- [ ] ~~카카오 SDK 설치·초기화~~
- [ ] ~~카카오 토큰 서버 전송~~
- [ ] ~~카카오 계정 연동 상태 저장~~

### Pending 세션 이어하기 (`SignKakao.jsx`)

> **기존 `Sign.jsx` 동작 (코드베이스 기준)**
>
> | 구분 | 구현 위치 | 내용 |
> |------|-----------|------|
> | 이니시스 인증 중단 복구 | `services/inicisAuth.js` | AsyncStorage `@inicis_pending_session` — `{ mTxId, purpose, startedAt }`, TTL 30분. 인증 시작 시 `savePendingSession`, 재개 시 `resumePendingInicisFlow()` |
> | 앱 cold start 라우팅 | `App.js` | 비로그인 + pending 있으면 `Sign` + `{ resumeInicis: true }` |
> | 화면 복원 | `Sign.jsx` | 마운트 시 `resumeInicisFromPending()`; 일반 진입 시 `clearPendingInicisSession()` |
> | step·입력값 전체 저장 | *(없음)* | **신규 오케스트레이터에서 `signupSessionStorage.js`로 추가** |

- [ ] 각 step 전환 시 현재 진행 state 저장 — `currentStep`, `consents`, `identityData`, `formData`, `stepInfoData`, 보호자/학생 이니시스 클라이언트 토큰, `studentVerificationToken` 등
- [ ] `signupSessionStorage.js`(권장) 또는 동일 규칙의 공용 유틸 — 키 `@signup_pending_session`, payload에 `provider: 'kakao'` + `savedAt` + state snapshot (TTL 30분 권장, inicis와 맞춤)
- [ ] `SignKakao` 마운트 시 저장된 state 확인 → 있으면 해당 step부터 복원; 없으면 약관·카카오 인증 첫 step부터
- [ ] `route.params.resumeSession === true` 또는 cold start 시 — 저장 state 복원 후, pending 이니시스가 있으면 `resumeInicisFromPending()` (`Sign.jsx` 패턴) 연동
- [ ] `App.js` — `getSignupPendingSession()` 시 `provider === 'kakao'`이면 `SignKakao` + `{ resumeSession: true }` (기존 `Sign` 이니시스 라우팅 확장)
- [ ] 이니시스 pending 저장·재개는 `inicisAuth.js` API 그대로 사용 (`getPendingInicisSession`, `clearPendingInicisSession`, `resumePendingInicisFlow`)
- [ ] 명시적 이탈(뒤로가기로 `SignupEntry` 복귀, 플로우 취소) 시 `clearSignupPendingSession('kakao')` + `clearPendingInicisSession()`
- [ ] 가입 완료(`handleComplete` 성공) 또는 로그인 완료 직후 저장 state + inicis pending **모두** 정리

---

## 4. 연령 분기 (만 14세)

카카오 mock에서 수신한 `birthDate`에 대해, `Sign.jsx`와 **동일한** `signupBirthDatePolicy.js` 판정을 사용한다.

### 연령 판정 유틸 (3플로우 공통)

**원본 파일:** `front/view/src/signup/signupBirthDatePolicy.js`  
(`Sign.jsx` `handleBirthDateNext`가 실제로 import·호출하는 파일)

| 함수 | 역할 |
|------|------|
| `isValidBirthDateString()` | `YYYY-MM-DD` 형식 검증 |
| `classifyBirthDateCase()` | **A** / **B** / **C** / **D** / `invalid` 판정 (만 14세 분기의 기준) |
| `getBirthDateBoundaries()` | 가입 가능 생년월일 경계 (만 13~17세, 매년 롤링) |
| `computeAge()` | 만 나이 계산 (**이 파일이 원본 정의**) |

**차단 알림:** `authFeatureAlerts.js` — `showTooOldForSignupAlert()` (A), `showTooYoungForSignupAlert()` (D)

> `signupAgeUtils.js`(`getSignupEligibility`)는 파일은 존재하나 **현재 코드베이스에서 import되는 곳 없음**.  
> `Sign.jsx`는 `classifyBirthDateCase`만 사용 — 체크리스트·신규 플로우도 동일하게 맞춘다.

### 분기 로직 (`classifyBirthDateCase` 기준)

- [ ] mock `birthDate`에 대해 `classifyBirthDateCase(birthDate)` 호출
- [ ] `invalid` → 형식 오류 알림
- [ ] `A` (너무 연장) → `showTooOldForSignupAlert()`
- [ ] `D` (너무 어림) → `showTooYoungForSignupAlert()`
- [ ] **`C` (만 14세 미만, `birthCase === 'C'`)**
  - [ ] `SignStepGuardianConsentModal` 표시
  - [ ] 보호자 KG이니시스 — `Sign.jsx`의 `runGuardianIdentityVerificationCore` 재사용
  - [ ] `SignupIdentityVerifyingOverlay` 재사용
  - [ ] 보호자 인증 완료 후 → 재학정보 단계
- [ ] **`B` (만 14세 이상, `birthCase === 'B'`)**
  - [ ] 보호자 인증 스킵 → 바로 재학정보 단계

### 참고 — 기존 코드 위치

| 기능 | 파일 |
|------|------|
| 연령 판정·범위 | `signupBirthDatePolicy.js` |
| 차단 알림 | `authFeatureAlerts.js` |
| 분기 핸들러 패턴 | `Sign.jsx` — `handleBirthDateNext` |
| 보호자 동의 모달 | `SignStepGuardianConsentModal.jsx` |
| 보호자/본인 이니시스 | `Sign.jsx` — `runGuardianIdentityVerificationCore`, `runStudentIdentityVerificationCore` |
| 단위 테스트 | `signupBirthDatePolicy.test.js` |

---

## 5. 재학정보 ~ 가입 마무리 (기존 컴포넌트 재사용)

**신규 개발 없음** — `SignKakao.jsx`에서 step state로 기존 컴포넌트에 props 연결.

### 5-1. 재학 정보 입력

- [ ] `SignStepSchoolSelect` 마운트
- [ ] props: `identityData`(카카오 mock), `onChange`, `selectedSchool`, `grade`, `classNumber` 등 기존 `Sign.jsx`와 동일 인터페이스 확인
- [ ] 학교 검색 · 학년 자동계산 · 반 입력 동작 확인

### 5-2. 학생증 인증

- [ ] `SignStepStudentIdVerify` 마운트
- [ ] 대안 경로: `SignStepAltVerifyChoice` → `SignStepNeisPlusSubmit` / `SignStepCertificateGuide` + `SignStepCertificate`
- [ ] `onVerified` 콜백으로 토큰·학년 정보 수신 (현재는 mock/기존 API 호출)

### 5-3. 가입 마무리

- [ ] 기존 가입 완료 UI 재사용 (`Sign.jsx`의 `handleComplete` / 마무리 step)
- [ ] 카카오 플로우에서는 **계정(아이디·비밀번호) 단계 생략** — signup payload에서 username/password 처리 방식은 추후 백엔드 연동 시 정의
- [ ] 이번 작업: 가입 제출 API 호출 **mock 또는 스킵** 처리 명시 (UI만 완료)

### Pending 세션 이어하기 (`SignKakao.jsx`) — 가입 마무리 시점

§3 Pending 세션 항목과 **동일 규칙** 적용. 가입 마무리 단계에서 추가로 확인:

- [ ] 각 step 전환 시 현재 진행 state 저장 — `currentStep`, `consents`, `identityData`, `formData`, `stepInfoData`, 보호자/학생 이니시스 클라이언트 토큰, `studentVerificationToken` 등
- [ ] `SignKakao` 마운트 시 저장된 state 확인 → 있으면 해당 step부터 복원; 없으면 진입 화면부터
- [ ] `route.params.resumeSession` / `App.js` cold start → `SignKakao` 복원 + 이니시스 `resumeInicisFromPending()` 연동
- [ ] 명시적 이탈 시 `clearSignupPendingSession('kakao')` + `clearPendingInicisSession()`
- [ ] **가입 완료(`handleComplete` 성공) 직후** pending 세션·inicis pending 정리 — 재진입 시 가입 화면이 뜨지 않아야 함

### Sign.jsx 연동 전략 (택 1)

- [ ] **A안:** `SignKakao.jsx` 신규 오케스트레이터 — school~complete step만 `Sign.jsx`에서 복사·연결
- [ ] **B안:** `Sign.jsx`에 `route.params.signupMethod: 'kakao'` 추가 — 초기 step 건너뛰기
- [ ] 팀에서 한 안 선택 후 체크

---

## 6. 프로필 아이디 입력 (학생증 승인 후 최초 진입)

**신규 파일 권장:** `front/view/src/signup/SignProfileUsername.jsx`

> 학생증 **승인 완료 후** 앱 최초 진입 시 1회 노출. 백엔드 저장 API는 추후.

### UI

- [ ] 타이틀: "앱 내에서 사용할 프로필 아이디를 입력해 주세요"
- [ ] 서브텍스트: "아이디는 로그인 및 친구 검색 시 사용되며 마이페이지에서 변경 가능합니다"
- [ ] 입력 필드 placeholder: "영문, 숫자 포함 3~20자"
- [ ] "시작하기" 버튼

### 유효성 (로컬만)

- [ ] `isValidUsername()` 재사용 — `front/utils/signupValidation.js`
- [ ] `USERNAME_HINT` / `USERNAME_ERROR` 메시지 표시
- [ ] 유효하지 않으면 "시작하기" 비활성 또는 인라인 에러

### 동작

- [ ] "시작하기" 탭 → `navigation.reset` 또는 `navigate('Main')` 으로 메인 진입
- [ ] 입력값은 `AsyncStorage` 등에 임시 저장 (선택) — API 연동 전까지
- [ ] 노출 조건 mock: `route.params.needsProfileUsername === true` 또는 AuthContext 플래그

### App 진입점 연동 (추후/mock)

- [ ] 로그인 후 `studentVerificationStatus === 'APPROVED'` && `!profileUsernameSet` → 이 화면으로 리다이렉트
- [ ] 이번 작업: 수동 네비게이션 또는 dev 버튼으로 화면 확인 가능하게

---

## 7. 공통·스타일

- [ ] `colors.js` — 카카오 노란(`#FEE500`), 연두 테두리(전화번호 버튼) 토큰 추가 여부
- [ ] `login.style.js` / `signupEntry.style.js` — 버튼·타이포 일관성
- [ ] `SignupIosSafeModal` 패턴 — 바텀시트·모달 iOS 터치 이슈 방지
- [ ] SubHeader 사용 여부 (카카오 플로우 중 뒤로가기) — `Sign.jsx` SubHeader 패턴 참고

---

## 8. 이번 작업에서 하지 않는 것

- [ ] 카카오 SDK 연동 및 실제 프로필 수신
- [ ] 카카오 access token 백엔드 전송
- [ ] signup API `verificationMethod: 'kakao'` 등 파라미터 추가
- [ ] 프로필 아이디 저장 API
- [ ] Apple / 전화번호 플로우 본 구현 (각각 별도 체크리스트)
- [ ] 서버 측 약관·동의 기록 저장

---

## 9. 수동 테스트 체크리스트

### 진입·약관

- [ ] 진입 화면 3버튼 + 로그인 링크 표시
- [ ] 카카오 버튼 → `SignupConsentSheet` 바텀시트 (`provider="kakao"`, 풀스크린 아님)
- [ ] 필수 4개 미체크 시 "다음 단계" 비활성
- [ ] 필수 4개 체크 시 "다음 단계" 활성 (마케팅 미체크 OK)

### 연령 분기

- [ ] mock 만 14세 이상 (`classifyBirthDateCase` → `B`) → 보호자 인증 없이 재학정보 진입
- [ ] mock 만 14세 미만 (`classifyBirthDateCase` → `C`) → 보호자 동의 모달 → 이니시스(mock) → 재학정보 진입
- [ ] 범위 밖 (`A` / `D`) → `showTooOldForSignupAlert` / `showTooYoungForSignupAlert`

### 기존 step 재사용

- [ ] 학교 검색·학년 자동계산·반 입력
- [ ] 학생증 촬영 화면 진입
- [ ] 나이스+ / 재학증명서 대안 경로 진입
- [ ] 가입 마무리 화면까지 도달

### 프로필 아이디

- [ ] 3~20자 영문·숫자 유효성
- [ ] 유효 입력 후 "시작하기" → 메인(또는 mock 목적지) 이동

### Pending 세션 이어하기

- [ ] 특정 step(예: 재학정보·학생증·이니시스 인증 중) 진행 중 앱 강제 종료 → 재진입 시 **해당 step으로 복원**되는지 확인
- [ ] 이니시스 브라우저 이탈 후 cold start → `SignKakao` 복귀 + 인증 재개 또는 오버레이 복원 확인
- [ ] 가입 완료 후 재진입 시 pending 세션(`@signup_pending_session`, `@inicis_pending_session`) **잔존 없음** 확인
- [ ] 플로우 명시적 취소(진입 화면 복귀) 후 재진입 시 처음부터 시작되는지 확인

---

## 10. 파일 목록 (예상)

| 구분 | 파일 | 비고 |
|------|------|------|
| 신규 | `SignupEntry.jsx` | 진입 화면 (3플로우 공유) |
| 신규 | `SignupConsentSheet.jsx` | **약관 바텀시트 — 카카오·애플·전화번호 공용** |
| 신규 | `signupConsentItems.js` | `CONSENT_ITEMS` 상수·provider override |
| 신규 | `SignKakao.jsx` | 카카오 플로우 오케스트레이터 |
| 신규 | `SignProfileUsername.jsx` | 승인 후 프로필 아이디 |
| 신규 | `kakaoSignupMocks.js` | mock 프로필 상수 |
| 신규 | `signupSessionStorage.js` | (권장) step state pending 저장·복원 공용 유틸 |
| 수정 | `App.js` | 라우트 등록 + pending cold start 라우팅 |
| 수정 | `Login.jsx` | 회원가입 → `SignupEntry` (선택) |
| 재사용 | `services/inicisAuth.js` | 이니시스 pending 세션 (`@inicis_pending_session`) |
| 재사용 | `SignStepSchoolSelect.jsx` | 재학정보 |
| 재사용 | `SignStepStudentIdVerify.jsx` | 학생증 |
| 재사용 | `SignStepGuardianConsentModal.jsx` | 만 14세 미만 |
| 재사용 | `signupBirthDatePolicy.js` | 연령 판정·범위 (`classifyBirthDateCase` 등) |
| 재사용 | `authFeatureAlerts.js` | A/D 차단 알림 |
| 재사용 | `signupBirthDatePolicy.test.js` | 판정 로직 단위 테스트 |
| 재사용 | `signupValidation.js` | 아이디 유효성 |

---

## 관련 문서

- [회원가입 개편 — 유효성 검사 우회 체크리스트](./signup-redesign-validation-checklist.md) (개편 중 임시 우회)
- [애플 회원가입 체크리스트](./signup-redesign-apple-checklist.md)
- [전화번호 회원가입 체크리스트](./signup-redesign-phone-checklist.md)

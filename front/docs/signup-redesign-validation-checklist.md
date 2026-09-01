# 회원가입 개편 — 유효성 검사 우회 체크리스트

개편 작업 중 회원가입 플로우를 빠르게 탐색·프로토타이핑하기 위해 검증을 일시 우회합니다.  
**스토어 배포 전 반드시 전부 복구하세요.**

> **현재 상태:** 우회 적용됨 (`SIGNUP_REDESIGN_SKIP_VALIDATION = true`)  
> 백엔드 로컬 테스트 시 `.env`에 `SIGNUP_REDESIGN_SKIP_VALIDATION=true` 추가 필요

---@

## 마스터 스위치 (개편 완료 시 먼저 확인)

| 위치 | 현재 | 복구 방법 |
|------|------|-----------|
| `front/view/src/signup/signupRedesignFlags.js` | `SIGNUP_REDESIGN_SKIP_VALIDATION = true` | `false`로 변경 후 파일 삭제 검토 |
| 백엔드 `.env` | `SIGNUP_REDESIGN_SKIP_VALIDATION=true` (로컬) | 변수 제거 또는 `false` |

---

## 프론트엔드 — `Sign.jsx`

검색 키워드: `shouldSkipSignupValidation`, `SIGNUP_REDESIGN_SKIP`

- [x] **마스터 헬퍼** `shouldSkipSignupValidation()` — `signupRedesignFlags` + 기존 OCR 테스트 플래그 OR
- [x] **Step 0 약관** `handleConsentNext` — 동의 없이 다음 단계
- [x] **Step 1 생년월일** `handleBirthDateNext` — 형식·연령(A/B/C/D)·보호자 분기 우회 → mock 본인정보로 계정 단계
- [x] **본인인증** `runStudentIdentityVerificationCore` / `runGuardianIdentityVerificationCore` — 이니시스 mock
- [x] **Step 2 계정** `handleAccountNext` — 아이디·비밀번호 형식·일치 검증 우회
- [x] **Step 3 학교** `handleSchoolSelectNext` — 학교·반·학년 검증·확인 모달 우회
- [x] **Step 4 학생증** `handleStudentVerified` — 토큰·이니시스 토큰 필수 검증 우회
- [x] **재학증명서** `handleCertificateSubmit` — URL·열람번호·계정 필수 검증 우회
- [x] **가입 제출** `handleComplete` — 학생증 토큰·졸업년도 검증 우회 (mock 토큰 사용)
- [x] **다음 버튼** `isPrimaryDisabled` — 단계별 비활성 조건 우회 (제출 중·인증 오버레이만 유지)
- [x] **마운트 시** `useEffect` — mock 동의·생년월일·본인정보 자동 주입
- [x] **이니시스 결과** `evaluateStudentVerifyResult` — 생년월일·전화 불일치 검증 (skip 시 core에서 mock 반환)
- [x] **로그인 연동** `handleComplete` — 가입 후 `payload.username/password`로 자동 로그인

---

## 프론트엔드 — 하위 컴포넌트

- [x] `SignStepConsent.jsx` — `canProceedToNext` 항상 true (플래그 ON 시)
- [x] `SignStepStudentIdVerify.jsx` — 촬영·학교·본인정보·업로드 API 우회 → mock `onVerified`
- [x] `SignStepNeisPlusSubmit.jsx` — 이미지·본인·학교 필수 검증 우회 → mock `onVerified`

### 개편 범위 밖 (우회 안 함)

- `Login.jsx`, `IDfind.jsx`, `PWfind.jsx` — 로그인·찾기 플로우
- `StudentIdResubmit.jsx`, `CertificateResubmit.jsx` — 거절 후 재제출 (가입 플로우 아님)

---

## 백엔드 — `back/src/routes/auth.js`

검색 키워드: `isSignupRedesignSkipValidation`, `SIGNUP_REDESIGN_SKIP`

- [x] **`POST /api/auth/signup`** — express `validate(signupValidators)` 조건부 스킵
- [x] 필수 필드(username, password, name, phone, birthDate, schoolId, grade…)
- [x] 증명서 URL·열람번호 / 학교 ID
- [x] 필수 약관 동의 (`consents`)
- [x] `studentVerificationToken` 필수
- [x] username / password / phone / birthDate 형식 검증
- [x] 이니시스 `studentInicisClientToken` / `guardianInicisClientToken` 필수
- [x] 레거시 전화번호 인증 기록 확인
- [x] 학생증 토큰 소비(`consumeStudentIdManualVerificationToken`) 스킵
- [x] 잘못된 schoolId(`REDESIGN_SKIP` 등) → DB 첫 학교로 대체

- [x] **`POST /api/auth/signup/upload-student-id`** — 이름·생년월일·이미지·학교 ID 필수 검증 우회 → mock 토큰 반환

유틸: `back/src/utils/signupRedesignFlags.js`

---

## 복구 순서 (권장)

1. `signupRedesignFlags.js` (프론트) → `false`
2. 백엔드 `.env`에서 `SIGNUP_REDESIGN_SKIP_VALIDATION` 제거
3. 위 체크리스트 항목별로 `// [SIGNUP_REDESIGN_SKIP]` 주석 블록 제거 또는 조건 분기 삭제
4. 가입 E2E 수동 테스트
   - [ ] 만 14세 이상 정상 가입
   - [ ] 만 14세 미만 보호자 인증
   - [ ] 연령 외 가입 차단
   - [ ] 학생증 촬영 → 승인 대기
   - [ ] 나이스+ / 재학증명서 대안 경로
   - [ ] 약관 미동의 시 진행 불가
5. `signupRedesignFlags.js` 파일 삭제 (선택)
6. 이 체크리스트 파일 아카이브 또는 삭제

---

## 주의

- **Production / 스토어 빌드에 프론트 플래그 `true` 금지**
- **Production Railway에 `SIGNUP_REDESIGN_SKIP_VALIDATION=true` 금지**
- 기존 `EXPO_PUBLIC_SIGNUP_TEST_MODE` (OCR 테스트)는 `__DEV__` 전용 — 개편 플래그와 별개
- 우회 모드에서 가입된 계정은 학생증 검수 레코드 없이 생성될 수 있음 (프로토타입용)
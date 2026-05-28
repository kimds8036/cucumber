# Youth Paper 회원가입 플로우 — 설계·작업 목록

작성일: 2026-05-28  
대상: `frontend/view/src/signup/`  
관련: `APPSTORE_POLICY_AUDIT_AND_PLAN.md` (루트), `back/src/routes/auth.js` (`/ocr`, `/signup`)

---

## 1. 목표

- 애플 Guideline 1.2(UGC)·청소년 보호에 맞는 **가입·학생 인증** 완성
- **만 14세 미만** 법적 리스크 차단(보호자 PASS 미구현 시 가입 불가)
- 유료 OCR 없이 **Tesseract(오픈소스)** + 키워드 매칭으로 학생증 3중 교차 검증
- `signup/` 폴더 기준으로 화면·import·네비게이션 일원화

---

## 2. 확정 가입 순서 (Target Flow)

| 순서 | 화면 | 파일 | 설명 |
|------|------|------|------|
| 진입 | 로그인 | `Login.jsx` | 「회원가입」→ `Sign` 스택 진입 |
| **Step 0** | 연령 확인 | `SignStepAgeGate.jsx` | 생년월일 입력. **만 14세 미만** → 차단 팝업 후 `Login` |
| **Step 1** | 약관·EULA | `SignStepConsent.jsx` | 필수 동의(UGC·OCR·위치 등). 미동의 시 다음 불가 |
| **Step 2** | 본인인증 | `SignStep1.jsx` | PASS로 **실명·생년월일·휴대폰** 확보 → `formData` 저장 |
| **Step 3** | 학생인증 | `SignStepVerificationMethod.jsx` → `SignStepCertificate.jsx` (+ 촬영 UI) | **계정 입력보다 먼저**. 학교 검색 → 학생증 촬영 → 서버 Tesseract 3중 검증 |
| **Step 4** | 계정 정보 | `SignStep2.jsx` ~ `SignStep4.jsx` (+ 필요 시 `SignStepNumber.jsx`) | 인증 통과자만 아이디·비밀번호·닉네임 등 |
| 완료 | — | `Sign.jsx` 모달 | 가입 완료 후 **`Login`으로 reset** |

> **기획 변경 반영:** 현재 코드는 Step 2에서 `SignStep2`(아이디·비밀번호)가 학생인증보다 **앞**에 있음 → Step 3·4 순서 **스왑** 필요.

### 만 14세 미만 차단 팝업 (`SignStepAgeGate.jsx`)

| 항목 | 내용 |
|------|------|
| 타이틀 | 안내 (Youth Paper) |
| 본문 | 만 14세 미만은 법정대리인 동의(PASS) 필요. 현재 PASS 보호자 인증 준비 중이며 추후 업데이트 예정. |
| [확인] | 가입 중단 → **`Login`으로 이동** (`navigation` reset 또는 `goBack` + 스택 정리) |

---

## 3. Tesseract 3중 교차 검증 (백엔드 설계)

**원칙:** 전체 문장 파싱 신뢰 X → `includes()` 키워드·학교 DB 매칭.

| # | 검증 | 입력 | 실패 시 |
|---|------|------|---------|
| 1 | **실명** | Step 2 `name` | OCR 전체 텍스트에 `name` 미포함 → 반려 |
| 2 | **학교급** | Step 2 `birthDate` → 서버에서 만 나이·학년도 기준 **중/고** 판정 | 중학 나이인데 OCR에 `고등학교`, 또는 고등 나이인데 `중학교` → 반려 |
| 3 | **학교명** | OCR에서 추출·정규화한 학교명 → `schools` 테이블 조회 | 매칭 실패 → 「다시 촬영」 / 성공 시 「○○고등학교 (위치) 맞나요?」 확인 UI |

### API·인프라 (예정)

| 구분 | 경로·비고 |
|------|-----------|
| 기존 스텁 | `POST /api/auth/ocr` — `ocrData` 수신·`ocr_verifications` 저장 (실검증 미완) |
| 신규/확장 | `POST /api/auth/student-id/verify` (가칭) — 이미지 업로드 → Tesseract → 3중 검증 JSON |
| 패키지 | `back`: `tesseract.js` 또는 서버 `tesseract` CLI 래퍼 (Railway Docker에 `tesseract-ocr` + `kor` 언어팩) |
| DB | `ocr_verifications`, `users.student_verified`, `schools` (`edu_office_code`, `admin_standard_code`) |

### 학교급 나이 계산 (서버 예시 로직)

```text
기준 연도: 2026 (또는 서버 UTC 연도)
만 나이 = 생년월일 기준 오늘 만 나이
중학생 일반 구간: 만 13~16 (학년·입학월에 따라 조정 가능 — 정책 확정 필요)
고등학생 일반 구간: 만 16~19
→ OCR 텍스트에 "중학교" / "고등학교" 포함 여부와 교차
```

---

## 4. 현재 코드 vs 목표 (Gap)

### 4.1 `Sign.jsx` 단계 매핑 (만 14세 이상, `currentStep`)

| currentStep | **현재** 렌더 | **목표** |
|-------------|---------------|----------|
| 0 | `SignStepConsent` | `SignStepAgeGate` |
| 1 | `SignStep1` (PASS) | `SignStepConsent` |
| 2 | `SignStep2` (아이디·비밀번호) | `SignStep1` (PASS) |
| 3 | `SignStepVerificationMethod` | 학교 검색 + `SignStepCertificate` / 촬영 |
| 4 | `SignStep3` (목업 3초) / `SignStepCertificate` | Tesseract 결과·학교 확인 |
| 5 | `SignStep4` | `SignStep2` ~ `SignStep4` (계정) |

### 4.2 `SignStepAgeGate.jsx`

| 상태 | 내용 |
|------|------|
| **현재** | 「만 14세 미만 / 이상」 **카드 선택 UI**만 존재. `Sign.jsx`에서 **미사용**(import 없음) |
| **목표** | 생년월일 입력 + 만 14세 미만 팝업 + Login 리다이렉트 |

---

## 5. 작업 목록 (Done / Todo)

### ✅ 완료·부분 완료

| 항목 | 파일·비고 |
|------|-----------|
| signup 폴더로 인증 UI 이동 | `Login`, `Sign`, `IDfind`, `PWfind`, `SignStep*` |
| `App.js` import 경로 | `./view/src/signup/Login` 등 **정상** |
| 약관·EULA UI | `SignStepConsent.jsx`, `SignStepTermsOfService.jsx`, `SignStepPrivacyPolicy.jsx` |
| PASS 본인인증 UI 골격 | `SignStep1.jsx` (`passMode`, `onChange`) |
| 만 14세 미만 **보호자** 분기 골격 | `SignStep1-2.jsx`, `isUnder14Flow` in `Sign.jsx` |
| 학생인증 방식 선택 UI | `SignStepVerificationMethod.jsx` |
| 학생증·증명서 안내 플레이스홀더 | `SignStepCertificate.jsx`, `SignStep3.jsx` (3초 목업) |
| 회원가입 API 연동 골격 | `Sign.jsx` → `POST /api/auth/signup` |
| OCR API 스텁 | `back/src/routes/auth.js` `POST /api/auth/ocr` |
| 키보드 리팩터 1차 | `frontend/docs/keyboard/*` (SignStep 일부) |
| Login 아이디/비밀번호/회원가입 | `PRE_RELEASE` Alert (`showPreReleaseAuthFeatureAlert`) — **Sign 미연결** |
| App Store 감사 문서 | `APPSTORE_POLICY_AUDIT_AND_PLAN.md` (develop 동기화) |

### 🔲 미완료 (우선순위)

#### Phase 1 — 연결·경로 (심사 전 필수)

| # | 작업 | 상세 |
|---|------|------|
| 1.1 | **Login → Sign 연결** | ✅ `Login.jsx` → `navigate('Sign')` |
| 1.2 | **import 경로 전역 점검** | ✅ `App.js` signup 경로. 문서 경로는 추후 정리 |
| 1.3 | **`SignStepAgeGate` 연동** | ✅ `Sign.jsx` Step 0 |
| 1.4 | **만 14세 미만 팝업** | ✅ `authFeatureAlerts.js` + AgeGate |
| 1.5 | **`IDfind` / `PWfind` 마감** | ✅ `showComingSoonAuthFeatureAlert` |
| 1.6 | **`DISABLE_SIGN_VALIDATION_FOR_REDESIGN`** | `false`로 전환 일정 확정 (운영 전) |

#### Phase 2 — 플로우 재배선

| # | 작업 | 상세 |
|---|------|------|
| 2.1 | **Step 순서 변경** | ✅ `Sign.jsx` Target Flow 재배치 |
| 2.2 | **학교 검색 화면** | ✅ `SignStepSchoolSelect.jsx` + `/api/schools/search` |
| 2.3 | **학생증 촬영** | ✅ `SignStepStudentIdVerify.jsx` (expo-camera) |
| 2.4 | **학교 확인 UI** | ✅ 인증 후 Alert 「이 학교가 맞나요?」 |
| 2.5 | **가입 완료 → Login** | 이미 `resetTo('Login')` — 학생인증 완료 플래그 state 유지 |

#### Phase 3 — Tesseract·백엔드

| # | 작업 | 상세 |
|---|------|------|
| 3.1 | Railway/Docker에 Tesseract + `kor` | ⚠️ `tesseract.js` npm (WASM) — Railway 배포 후 실기기 검증 필요 |
| 3.2 | `POST /api/auth/signup/verify-student-id` | ✅ `auth.js` + `studentIdOcr.service.js` |
| 3.3 | 실명 `includes` | ✅ |
| 3.4 | 학교급 교차 | ✅ `inferExpectedSchoolLevel` |
| 3.5 | `schools` 매칭 | ✅ 선택 학교명 키워드 포함 |
| 3.6 | `users.student_verified` | 통과 시 true, 실패 시 가입 단계 진행 불가 |

#### Phase 4 — 심사·운영 마감

| # | 작업 | 상세 |
|---|------|------|
| 4.1 | `TestLogin` / `initialRouteName` | 운영 빌드에서 `Login` 진입 |
| 4.2 | `ENABLE_TEST_API` | production Railway false |
| 4.3 | PASS 실연동 | Step 2 본인인증 (현재 UI + 서버 검증) |
| 4.4 | 만 14세 미만 보호자 PASS | 별도 릴리스 (현재는 AgeGate 차단만) |

---

## 6. 단계별 구현 브리핑 (Cursor 작업 순서)

### 단계 1: import 경로 정리

**목표:** signup 이동 후 깨진 참조 제거.

**체크리스트**

```bash
# frontend 루트에서 실행
rg "view/src/(Login|Sign|IDfind|PWfind)" frontend --glob "!**/signup/**"
rg "from ['\"].*SignStep" frontend/view/src/signup
```

| 확인 파일 | 기대 |
|-----------|------|
| `frontend/App.js` | `./view/src/signup/*` |
| `frontend/view/src/signup/Sign.jsx` | `./SignStep*` 상대 경로 |
| `frontend/view/src/signup/Login.jsx` | `../../../styles`, `../../../utils/api` |
| 문서 | `APPSTORE_POLICY_AUDIT_AND_PLAN.md` 경로 `signup/` 반영 |

**완료 기준:** Metro 번들 에러 없음, `Sign` 화면 진입 가능.

---

### 단계 2: `SignStepAgeGate` + 만 14세 차단

**파일:** `SignStepAgeGate.jsx`, `Sign.jsx`, `Login.jsx`

**UI 변경 (`SignStepAgeGate`)**

- 카드 선택 UI 제거 또는 보조
- **생년월일** 입력 (DatePicker 또는 `YYYY-MM-DD` 3필드 — `SignStep1`과 UX 통일)
- [다음] 시 만 나이 계산 (`Sign.jsx`의 `isUnder14ByBirthDate` 재사용)

**팝업 (미만 시)**

```javascript
Alert.alert(
  '안내 (Youth Paper)',
  '만 14세 미만 회원의 경우, 관련 법령에 따라 법정대리인(보호자)의 동의 절차가 필요합니다. 현재 보호자 동의 인증 시스템(PASS)을 준비 중입니다. 보다 안전하고 원활한 서비스 제공을 위해 추후 업데이트를 통해 도입될 예정이오니 양해 부탁드립니다.',
  [{ text: '확인', onPress: () => resetTo('Login') }],
);
```

**`Sign.jsx` 변경 요약**

- `currentStep === 0` → `SignStepAgeGate`
- `handleAgeGateNext`: 14세 이상만 `setCurrentStep(1)` → Consent
- `selectedAgeGroup` / `isUnder14Flow`는 AgeGate 이후 Consent·PASS에서 재검증 가능 (이중 안전)

**`Login.jsx`**

- 회원가입: `navigate('Sign')` 복구

---

## 7. `IDfind` / `PWfind` 마감 스펙

**공통 Alert (버튼·제출 시):**

> 아이디/비밀번호 찾기 기능은 정식 출시 후 제공될 예정입니다. 고객센터(이메일)로 문의해 주세요.

- 고객센터 이메일: `Info.jsx` / `Inquiry`에 쓰는 주소와 **동일 상수**로 통일 권장
- Mock PASS·`mockFoundId` 제거 또는 개발 플래그 뒤로 숨김

---

## 8. 파일 맵 (`signup/`)

| 파일 | 역할 (목표 기준) |
|------|------------------|
| `Login.jsx` | 로그인, Sign/ID/PW 진입 |
| `Sign.jsx` | 가입 오케스트레이터 (`currentStep`) |
| `SignStepAgeGate.jsx` | Step 0 연령 |
| `SignStepConsent.jsx` | Step 1 약관 |
| `SignStep1.jsx` | Step 2 PASS |
| `SignStep1-2.jsx` | (추후) 보호자 PASS — 현재 AgeGate 차단 시 미사용 |
| `SignStepVerificationMethod.jsx` | Step 3 방식 선택 |
| `SignStepCertificate.jsx` | Step 3 학생증 촬영·안내 |
| `SignStep3.jsx` | (통합 예정) 촬영·OCR 대기 UI |
| `SignStep2.jsx` | Step 4 계정 일부 |
| `SignStep4.jsx` | Step 4 계정 일부 |
| `SignStepNumber.jsx` | 증명서 URL·접수번호 |
| `SignStepPrivacyPolicy.jsx` | 약관 상세 |
| `SignStepTermsOfService.jsx` | 이용약관 상세 |
| `IDfind.jsx` | 아이디 찾기 (마감 Alert) |
| `PWfind.jsx` | 비밀번호 찾기 (마감 Alert) |

---

## 9. 리스크·결정 사항 (확인 필요)

| 주제 | 질문 |
|------|------|
| 중/고 나이 구간 | 2026학년도 기준 만 나이·학년 매핑 표 확정 |
| Tesseract 정확도 | 저화질 학생증 → 수동 심사 큐 필요 여부 |
| 학교명 OCR | `schools.name` 부분 일치·초성 검색 범위 |
| 만 14세 미만 | AgeGate만 할지, 추후 `SignStep1-2` 보호자 플로우 재개 시점 |
| iOS 심사 | `TestLogin` 제거 시점 vs 내부 테스트 빌드 |

---

## 10. 다음 액션 (권장)

1. **Phase 1.1 ~ 1.5** 코드 (Login 연결, AgeGate, ID/PW Alert, import grep)  
2. **develop** push → 실기기 Sign 진입 smoke test  
3. **Phase 2** 플로우 스왑 + 학교 검색 UI  
4. **Phase 3** Tesseract 백엔드 (develop Railway 스테이징)  
5. `APPSTORE_POLICY_AUDIT_AND_PLAN.md` 단계 2 체크리스트와 본 문서 동기화  

---

*이 문서는 구현 진행에 따라 Done/Todo 표를 갱신합니다.*

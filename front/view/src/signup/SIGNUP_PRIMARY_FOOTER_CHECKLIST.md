# 회원가입 Primary Footer 컴포넌트 분리 — 구현 체크리스트

> 상태: **1차 구현 완료** (수동 확인 권장)  
> 디자인 기준: `createSignupStyles`의 `primaryButton` + `primaryButtonText`  
> 컴포넌트: `front/view/src/signup/SignupPrimaryFooter.jsx`

---

## 목표

회원가입 플로우에 흩어져 있는 하단 액션 버튼을 **SignupPrimaryFooter**로 분리하고, 각 화면에서 불러 쓰도록 통일한다.

---

## 범위

### 포함 (완료)

| 화면 | 상태 |
|---|---|
| `SignKakao.jsx` | ✅ |
| `SignApple.jsx` | ✅ |
| `SignPhone.jsx` | ✅ |
| `Sign.jsx` (레거시) | ✅ (`nextButton` → primary 기준) |
| `SignStepStudentIdVerify.jsx` | ✅ (촬영하기/제출하기/확인, 대안 링크는 본문 유지) |
| `SignStepCertificateGuide.jsx` | ✅ (+ hint) |
| `SignStepNeisPlusSubmit.jsx` | ✅ |
| `CertificateResubmit.jsx` | ✅ |
| `CertificateGuideResubmit.jsx` | ✅ (Guide 경유) |
| `NeisPlusResubmit.jsx` | ✅ (NeisPlusSubmit 경유) |

### 이번 범위에서 제외 (2차)

- [ ] `SignupConsentSheet.jsx`
- [ ] `SignupIdentityVerifyingOverlay.jsx`
- [ ] `IDfind.jsx` / `PWfind.jsx`
- [ ] `SignProfileUsername.jsx`
- [ ] `StudentIdResubmit.jsx`

---

## 구현 체크리스트

### 1. 컴포넌트 생성

- [x] `SignupPrimaryFooter.jsx` 생성
- [x] `disabled` / `loading` / `hint` / `onLayout` / `style` 지원
- [x] 스타일: `primaryButton` 기준 (height 52, radius 26)
- [x] 본문에 이미 좌우 패딩이 있으면 `style={{ paddingHorizontal: 0 }}`

### 2. 오케스트레이터 교체

- [x] `SignKakao.jsx`
- [x] `SignApple.jsx`
- [x] `SignPhone.jsx`
- [x] `Sign.jsx`

### 3. 스텝·재제출 화면 교체

- [x] `SignStepStudentIdVerify.jsx`
- [x] `SignStepCertificateGuide.jsx`
- [x] `SignStepNeisPlusSubmit.jsx`
- [x] `CertificateResubmit.jsx`

### 4. 레이아웃

- [x] 페이지 내부 footer는 `paddingHorizontal: 0`으로 이중 패딩 방지
- [x] 「다른 방법으로 인증하기」는 footer 밖 본문 유지
- [ ] 수동: 화면별 버튼 높이·여백 육안 확인

### 5. 스타일 정리

- [x] CertificateResubmit / NeisPlusSubmit 로컬 submit 스타일 제거
- [ ] `login.style.js` 주석 보강 (선택)

### 6. 동작 확인 (수동)

#### 카카오 / 애플 / 전화번호

- [ ] 다음 단계 / 제출하기 / 촬영하기 / 제출하러 가기
- [ ] disabled / loading 표시

#### 재제출

- [ ] CertificateGuide / Certificate / NeisPlus 재제출

---

## Props 요약

```jsx
<SignupPrimaryFooter
  label="다음 단계"
  onPress={handlePrimaryPress}
  disabled={isPrimaryDisabled()}
  loading={submitting}
  onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
  hint={null} // optional
  style={{ paddingHorizontal: 0 }} // 본문 패딩과 겹칠 때
/>
```

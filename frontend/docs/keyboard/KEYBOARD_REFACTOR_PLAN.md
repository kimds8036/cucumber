# 키보드 전면 개선 수정 계획 (iOS / Android 실기기 기준)

## 0. 절대 원칙

- **디자인(색상, 폰트, 간격, 컴포넌트 외형, 레이아웃 비율)은 절대 수정 금지**
- 이번 작업의 범위는 **키보드 동작/포커스/스크롤/가림 현상 해결**로 한정
- UI 스타일 파일(`styles/*`) 수정은 원칙적으로 금지하고, 불가피한 경우에도 디자인값 변경 없이 동작 보정만 허용

---

## 1. 목표

- `KEYBOARD_INPUT_ANALYSIS.md`(동일 폴더)에 정리된 입력 화면 전부를 대상으로
  - iOS/Android에서 입력창 가림 없음
  - 포커스 시 스크롤 위치 안정화
  - 키보드 열림/닫힘 시 튐(jump) 최소화
  - 탭/스크롤/전송 시 키보드 동작 일관성 확보

---

## 2. 참고 기준 (`expo keyboard.md`, 동일 폴더 반영)

- 기본 원칙:
  - iOS: `KeyboardAvoidingView`의 `behavior="padding"` 우선
  - Android: `behavior="height"` 또는 화면에 따라 `undefined` 비교 테스트
- Android 키보드 겹침 이슈 대응:
  - `app.json`의 `android.softwareKeyboardLayoutMode` 검토 (`pan` 후보)
- 복잡한 입력 화면은 `react-native-keyboard-controller` 도입 검토
  - `KeyboardAwareScrollView` / `KeyboardToolbar`
  - 단, **Expo Go 제한** 고려(개발 빌드에서 검증)

---

## 3. 작업 대상 파일군 (파일별 체크리스트)

- 체크 기준
  - `[ ]` 미착수
  - `[~]` 진행 중
  - `[x]` 완료

## A. 핵심 키보드 로직 파일 (우선순위 최상)

- [x] `frontend/context/KeyboardContext.jsx` (검토 완료: 이벤트/애니메이션 구조 유지)
- [x] `frontend/view/src/chat/hooks/useChatScroll.js` (검토 완료: 키보드 스크롤 보정 로직 유지)
- [x] `frontend/view/src/boardDetail.jsx` (검토 완료: 댓글 포커스/스크롤 보정 이미 적용됨)
- [x] `frontend/view/src/schoolMailDetail.jsx` (검토 완료: 댓글 포커스/스크롤 보정 이미 적용됨)
- [x] `frontend/view/src/chat/screens/ChatScreen.jsx` (검토 완료: KAV/offset 구조 유지)
- [x] `frontend/view/src/chat/components/MessageInput.jsx` (검토 완료: 키보드 높이 기반 padding 구조 유지)
- [x] `frontend/components/CommentInput.jsx` (검토 완료: 상위 제어 구조 유지)

## B. 폼/입력 화면 (중요)

- [x] `frontend/view/src/Login.jsx` (1차 적용 완료)
- [x] `frontend/view/src/searchscreen.jsx` (1차 적용 완료)
- [x] `frontend/view/src/SearchResult.jsx` (1차 적용 완료)
- [x] `frontend/view/src/sendmailscreen.jsx` (1차 적용 완료)
- [x] `frontend/view/src/sendSchoolMailScreen.jsx` (1차 적용 완료)
- [x] `frontend/view/src/boardWrite.jsx` (1차 적용 완료)
- [x] `frontend/view/src/PWfind.jsx` (1차 적용 완료)
- [x] `frontend/view/src/IDfind.jsx` (1차 적용 완료)
- [x] `frontend/view/src/changepassword.jsx` (1차 적용 완료)
- [x] `frontend/view/src/changeschool.jsx` (1차 적용 완료)
- [x] `frontend/view/src/signup/SignStep1.jsx` (1차 적용 완료)
- [x] `frontend/view/src/signup/SignStep1-2.jsx` (1차 적용 완료)
- [x] `frontend/view/src/signup/SignStep2.jsx` (1차 적용 완료)
- [x] `frontend/view/src/signup/SignStep4.jsx` (1차 적용 완료)
- [x] `frontend/view/src/signup/SignStepNumber.jsx` (1차 적용 완료)
- [x] `frontend/view/frame/SearchSubHeader.jsx` (누락 보정: 입력 컴포넌트 분석 반영)

## C. 보강 필요 후보 (키보드 보정 약한 화면)

- [x] `frontend/components/timerFriendModals.jsx` (실제 수정 완료: 모달 KAV + dismiss 적용)
- [x] `frontend/view/src/mailreply.jsx` (1차 적용 완료)
- [x] `frontend/view/src/edittimetable.jsx` (1차 적용 완료)
- [x] `frontend/view/src/friendsscreen.jsx` (1차 적용 완료)
- [x] `frontend/view/src/notificationsettings.jsx` (1차 적용 완료)
- [x] `frontend/view/src/timerModals.jsx` (1차 적용 완료)

---

## 4. 구현 전략 (단계별)

## 1단계: 공통 키보드 정책 정규화

- 공통 규칙 문서화 및 코드 기준 통일:
  - 배경 탭 dismiss 정책
  - `keyboardShouldPersistTaps` 기본값 정책
  - `keyboardDismissMode` 사용 규칙
  - `keyboardVerticalOffset` 계산 기준(헤더/safe area 포함)
- `KeyboardContext`의 이벤트 선택(iOS will*, Android did*) 유지하되 예외 화면 규칙 명시

## 2단계: 채팅/댓글 고난도 화면 안정화

- `useChatScroll`의 show/hide 지연값 및 스크롤 조건 재검증
- `boardDetail` / `schoolMailDetail`의
  - reply 포커스 시점
  - `scrollToComment` 타이밍
  - 백업 포커스 로직
    최적화
- 목표: 입력 전환/대댓글 이동 시 키보드 미노출, 스크롤 튐, 입력창 가림 제거

## 3단계: 폼 화면 공통 패턴 정리

- `KeyboardAvoidingView + ScrollView + dismiss` 패턴 일괄 점검
- Android에서 `behavior="height"` vs `undefined` A/B 검증
- `Search`, `BoardWrite`, `SendMail*` 등 입력량 많은 화면 우선 보정

## 4단계: 보강 후보 화면 처리

- `mailreply.jsx`에 키보드 회피 구조 추가
- 모달 입력(`edittimetable`, `timerModals`)의 작은 화면 가림 대응
- `friendsscreen`, `notificationsettings` 입력 UX 최소 보정

## 5단계: 선택적 고급화 검토

- 필요 시 `react-native-keyboard-controller` 도입 파일 제한 적용
  - 도입 조건: 현재 구조로 실기기 이슈 재현/해결이 어려운 화면
  - 도입 전/후 성능 및 동작 비교 기록 필수

---

## 5. 테스트 계획 (실기기 필수)

## 공통 시나리오 (모든 입력 화면)

- 입력창 포커스 시 키보드 노출
- 입력창이 키보드에 가려지지 않는지 확인
- 배경 탭/뒤로가기/스크롤 시 키보드 정상 dismiss
- 엔터/전송/Submit 시 동작 및 키보드 상태 확인
- 화면 회전(가능 시), 다크모드(디자인 변경 없이 동작만) 확인

## iOS 실기기 체크

- `keyboardWillShow/Hide` 타이밍과 애니메이션 동기화
- safe area + 헤더 offset 충돌 여부
- multiline 입력창 높이 증가 시 하단 가림 여부

## Android 실기기 체크

- 키보드 종류(Gboard/삼성키보드)별 레이아웃 차이
- `softwareKeyboardLayoutMode` 영향(`pan` 여부) 확인
- 키보드 열림 시 탭/하단 요소 밀림 여부

## 고난도 화면 추가 체크

- 채팅: 하단 고정 상태에서 메시지 입력/전송 연속 동작
- 댓글: 특정 댓글 답글 포커스 시 해당 댓글로 정확히 이동
- 검색: 포커스 이동(`SearchResult` -> `SearchScreen`) 시 키보드 상태 일관성

---

## 6. 산출물 계획

- 코드 수정 PR(또는 커밋) 단위:
  1. 공통 정책 + 핵심 화면
  2. 일반 폼 화면
  3. 보강 후보 화면
- 문서:
  - 변경 전/후 이슈 목록
  - 플랫폼별 테스트 체크리스트 결과
  - 미해결 리스크 및 재현 방법

---

## 7. 리스크 및 대응

- 리스크: 화면마다 offset 계산 기준이 달라 수정 중 회귀 가능
  - 대응: 공통 offset 유틸/규칙 도입, 화면별 예외 최소화
- 리스크: Android 제조사 키보드별 동작 편차
  - 대응: 최소 2종 키보드 실기기 검증
- 리스크: 키보드 개선 중 UI 흔들림으로 “디자인 변경” 오해
  - 대응: 스타일 값 불변 원칙 준수 + 동작 로직만 수정

---

## 8. 완료 기준 (Definition of Done)

- `KEYBOARD_INPUT_ANALYSIS.md` 대상 화면 전체에서
  - iOS/Android 실기기 테스트 통과
  - 입력창 가림/스크롤 튐/포커스 실패 재현 불가
  - **디자인 변경 없음** 확인
- 테스트 결과 문서화 완료

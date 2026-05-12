# react-native-keyboard-controller 전면 교체 분석

## 범위
- 코드 수정 없이, 현재 키보드 처리 구조를 분석하고 교체 전략만 정리함.
- 필수 분석 대상 12개 파일 + 추가 키보드 사용 파일을 확인함.
- 목표: `react-native-keyboard-controller` 기준으로 키보드 동작을 통일하고, 화면별 수동 처리 편차를 제거.

## 1) 현황 파악

| 파일 | KeyboardAvoidingView 사용 | KeyboardContext(useKeyboard) 사용 | Keyboard 이벤트 리스너 사용 | keyboardHeightAnimated 사용 위치/방식 | 메모 |
|---|---|---|---|---|---|
| `frontend/context/KeyboardContext.jsx` | 아니오 | Provider/Hook 정의만 존재 | 있음 (`keyboardWill/DidShow/Hide`) | `Animated.Value` 생성 후 `timing/setValue`, `useNativeDriver: true` | 전역 컨텍스트 정의 파일 |
| `frontend/view/src/chat/screens/ChatScreen.jsx` | 예 (루트 1개) | 아니오 | 아니오 (직접 없음) | 없음 | `scroll.keyboardHeight`를 `MessageInput`으로 전달 |
| `frontend/view/src/chat/components/MessageInput.jsx` | 아니오 | 아니오 | 아니오 | 없음 | `keyboardHeight` prop으로 paddingBottom 제어 |
| `frontend/view/src/chat/hooks/useChatScroll.js` | 아니오 | 아니오 | 있음 (`Keyboard.addListener`) | 없음 | 키보드 높이를 state로 보관 + 키보드 show/hide 시 `scrollToEnd` |
| `frontend/view/src/boardDetail.jsx` | 아니오 | 아니오 | 있음 (`Keyboard.addListener(show)`) | 없음 | 키보드 show 후 지연 `scrollToComment/scrollToEnd` |
| `frontend/view/src/schoolMailDetail.jsx` | 아니오 | 아니오 | 있음 (`Keyboard.addListener(show)`) | 없음 | boardDetail과 유사한 댓글 입력/답글 포커스 패턴 |
| `frontend/components/CommentInput.jsx` | 아니오 | 아니오 | 아니오 | 없음 | 순수 입력 UI 컴포넌트 |
| `frontend/components/timerFriendModals.jsx` | 예 (`AddFriendModal`) | 아니오 | 아니오 (`Keyboard.dismiss`만) | 없음 | Modal 내부 KAV 구조 (친구추가) |
| `frontend/view/src/boardWrite.jsx` | 예 (화면 루트) | 아니오 | 아니오 (`Keyboard.dismiss`만) | 없음 | KAV + ScrollView + 하단 툴바/패널 |
| `frontend/view/src/sendmailscreen.jsx` | 예 (화면 루트) | 아니오 | 아니오 (`Keyboard.dismiss`만) | 없음 | KAV + ScrollView + 하단 CTA |
| `frontend/view/src/sendSchoolMailScreen.jsx` | 예 (화면 루트) | 아니오 | 아니오 (`Keyboard.dismiss`만) | 없음 | sendmailscreen과 구조 유사 |
| `frontend/view/src/Login.jsx` | 예 (화면 루트) | 아니오 | 아니오 (`Keyboard.dismiss`만) | 없음 | KAV + ScrollView 로그인 폼 |

### 추가로 확인된 키보드 사용 화면
- `frontend/view/src/timerModals.jsx`: `AddSubjectModal`, `AddTaskModal`에서 Modal + KAV 사용.
- `frontend/view/src/edittimetable.jsx`: Modal + KAV 사용.
- `frontend/view/src/mailreply.jsx`: 화면 루트 KAV 사용.
- 즉, 친구추가 모달 이슈와 같은 **Modal+KAV 패턴이 프로젝트에 다수 존재**.

### 핵심 관찰
- `useKeyboard()` 소비 지점은 없음(검색 결과 0건, 정의만 존재).
- `keyboardHeightAnimated`도 `KeyboardContext.jsx` 내부에서만 존재하고 외부 소비가 없음.
- `KeyboardProvider`는 `App.js`에서 전체 앱을 감싸고 있으나, 실제 값 소비 컴포넌트가 없어 사실상 유휴 상태.

## 2) 교체 전략 (케이스 분류)

### 케이스 A: KeyboardAwareScrollView로 단순 교체 가능
기존 KAV + ScrollView 중심, 하단 고정 입력창 애니메이션이 없는 화면.

- `frontend/view/src/boardWrite.jsx`
- `frontend/view/src/sendmailscreen.jsx`
- `frontend/view/src/sendSchoolMailScreen.jsx`
- `frontend/view/src/Login.jsx`
- (추가 후보) `frontend/view/src/mailreply.jsx`

적용 방향:
- `KeyboardAvoidingView` 제거 후 `KeyboardAwareScrollView`(keyboard-controller 제공 컴포넌트/패턴)로 통일.
- 기존 `keyboardShouldPersistTaps`, `keyboardDismissMode` 동작은 유지.
- 시각 스타일은 유지하고 키보드 회피 로직만 교체.

### 케이스 B: useKeyboardHandler 필요
키보드 높이/타이밍에 맞춘 스크롤 보정 또는 하단 입력 동작 제어가 필요한 구조.

- `frontend/view/src/chat/screens/ChatScreen.jsx`
- `frontend/view/src/chat/hooks/useChatScroll.js`
- `frontend/view/src/chat/components/MessageInput.jsx`
- `frontend/view/src/boardDetail.jsx`
- `frontend/view/src/schoolMailDetail.jsx`
- `frontend/components/CommentInput.jsx` (직접 핸들러는 아니지만 B 화면의 공통 입력부)

적용 방향:
- 수동 `Keyboard.addListener` 제거.
- `useKeyboardHandler` 기반으로 show/hide 진행률/높이에 맞춰:
  - 채팅: 하단 입력영역 + 리스트 앵커(scrollToEnd) 동기화.
  - 댓글 화면(board/schoolMail): 포커스 후 대상 댓글로 스크롤하는 로직을 keyboard-controller 이벤트로 이관.
- `MessageInput`의 `keyboardHeight` prop 의존은 축소/제거하고, 컨테이너 inset 계산을 라이브러리 값으로 통일.

### 케이스 C: Modal 구조 별도 처리 필요
Modal 내부 KAV로 인해 닫힘/복귀 시 레이아웃 잔여 오프셋이 생기기 쉬운 구조.

- `frontend/components/timerFriendModals.jsx` (`AddFriendModal`)
- (추가 후보) `frontend/view/src/timerModals.jsx` (`AddSubjectModal`, `AddTaskModal`)
- (추가 후보) `frontend/view/src/edittimetable.jsx` (입력 모달)

적용 방향:
- Modal 내부 KAV를 keyboard-controller 모달 패턴(또는 모달 컨테이너용 handler)로 통일.
- 모달 닫힘 시 키보드 상태 리셋과 translate/padding 복귀를 명시적으로 보장.
- 친구추가 모달에서 재현된 “키보드 내려간 뒤 하단 유격”을 우선 검증 포인트로 설정.

## 3) KeyboardContext 처리 판단

### 결론
- **전면 교체 후 완전 제거 가능성이 매우 높음(사실상 제거 권장).**

### 근거
- `useKeyboard()` 실제 사용처 없음.
- `keyboardHeightAnimated` 외부 소비 없음.
- 현재 키보드 문제는 컨텍스트 값 공유 문제가 아니라, 각 화면의 개별 KAV/리스너 로직 편차에서 발생.
- `KeyboardProvider`는 앱 전역에 있으나 기능적 기여가 없는 상태.

### 권장 처리
- 1단계: keyboard-controller 기반 교체를 진행하면서 신규 화면에서 `KeyboardContext` 참조를 금지.
- 2단계: 전역 검색으로 재확인 후 `KeyboardProvider` 제거 + `KeyboardContext.jsx` 삭제.
- 3단계: 제거 직후 채팅/댓글/모달 회귀 테스트 수행.

## 4) 교체 우선순위 (의존성 + 위험도 기준)

1. **Modal C군 선행 정리**
   - 대상: `timerFriendModals.jsx` (필수), `timerModals.jsx`, `edittimetable.jsx`
   - 이유: 현재 실제 버그(복귀 유격)와 직접 연결, 회귀 여부가 명확함.

2. **댓글 입력 B군 (board/schoolMail)**
   - 대상: `boardDetail.jsx`, `schoolMailDetail.jsx`, `CommentInput.jsx`
   - 이유: “키보드에 하단 입력 가림” 이슈와 직접 연결, 수동 지연 스크롤 로직이 많아 표준화 효과 큼.

3. **채팅 B군**
   - 대상: `useChatScroll.js` → `ChatScreen.jsx` → `MessageInput.jsx`
   - 이유: 가장 복잡한 스크롤 앵커/프리페치 로직 보유, 단독 안정화 필요.

4. **단순 폼 A군**
   - 대상: `sendmailscreen.jsx`, `sendSchoolMailScreen.jsx`, `Login.jsx`, `boardWrite.jsx`, `mailreply.jsx`
   - 이유: 구조 단순, 후반에 일괄 적용해도 리스크 낮음.

5. **마무리: KeyboardContext 제거**
   - 대상: `App.js`, `KeyboardContext.jsx`
   - 이유: 모든 화면 교체 완료 후 제거해야 안전.

## 5) 주의사항 및 플랫폼 공통 방향

### 공통 리스크
- KAV 제거 시 기존 `keyboardVerticalOffset` 보정값이 사라져 헤더/입력창 겹침이 발생할 수 있음.
- 수동 `setTimeout` 기반 포커스/스크롤 로직을 한 번에 제거하면, 일부 화면에서 포커스 타이밍이 깨질 수 있음.
- 하단 고정 입력창은 safe-area bottom + 키보드 높이 합산 규칙이 일관돼야 함.

### iOS 주의사항
- `keyboardWillShow/Hide` 타이밍에 맞춘 기존 UX(부드러운 전환)를 `useKeyboardHandler` 애니메이션으로 동일하게 맞춰야 함.
- 헤더가 있는 화면은 top inset/offset 계산을 명확히 분리해야 “한 번 더 밀리는” 현상 방지 가능.

### Android 주의사항
- `windowSoftInputMode`(`adjustResize/adjustPan`)와 라이브러리 동작 충돌 여부를 먼저 점검 필요.
- 일부 기기에서 키보드 hide 후 inset 잔류가 생길 수 있으므로, 모달 close 시 레이아웃 복귀를 강제 검증해야 함.

### 양 플랫폼 모두 동작 가능한 방향성
- 전 화면에서 “키보드 회피 주체”를 keyboard-controller로 단일화.
- 화면별 수동 리스너(`Keyboard.addListener`)는 원칙적으로 제거.
- 하단 입력 공통 규칙을 정의:
  - 키보드 열림: 입력창은 키보드 상단에 고정.
  - 키보드 닫힘: safe-area 기준 원위치 복귀.
  - 스크롤 화면: 입력 포커스 시 대상 입력/댓글이 가려지지 않도록 자동 스크롤.
- 검증 시나리오를 iOS/Android 동일하게 유지:
  - 입력 포커스/전송/키보드 닫힘/모달 닫힘/회전(가능 시)까지 체크.

---

## 실행 요약
- 현재 구조는 “전역 컨텍스트 + 화면별 개별 처리”가 혼재되어 있고, 실제로는 개별 처리만 동작 중.
- 따라서 교체는 가능하며, 전략상 **C(Modal) → B(댓글/채팅) → A(단순 폼) → Context 제거** 순서가 가장 안전함.
- 스타일 변경 없이 키보드 동작 로직만 교체하려면, 먼저 공통 동작 규칙(입력 고정/복귀/스크롤)을 명문화한 뒤 단계적으로 적용하는 것이 적합.

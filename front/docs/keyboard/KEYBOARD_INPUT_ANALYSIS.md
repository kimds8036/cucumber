# 프론트 입력/키보드 동작 분석 요약

이 문서는 프론트 코드에서 텍스트 입력(`TextInput`)이 있는 화면 중, 키보드가 올라올 때의 동작을 파일별로 요약한 분석 자료입니다.

## 1) 전역 키보드 처리 (핵심)

### `front/context/KeyboardContext.jsx`

- **역할**: 앱 전역 키보드 높이를 `Animated.Value`로 관리.
- **키보드 이벤트**
  - iOS: `keyboardWillShow` / `keyboardWillHide`
  - Android: `keyboardDidShow` / `keyboardDidHide`
- **핵심 함수/핸들러**
  - `onShow(e)`: 키보드 높이(`e.endCoordinates.height`) 반영
  - `onHide(e)`: 높이 0으로 복귀
  - iOS는 `Animated.timing`, Android는 `setValue` 즉시 반영
- **사용 지점**
  - `front/App.js`에서 `KeyboardProvider`로 앱 전체 감쌈

### `front/App.js`

- **역할**: `KeyboardProvider`를 루트에 배치하여 하위 입력 컴포넌트들이 동일 키보드 상태를 공유하도록 구성.

---

## 2) 키보드 이벤트 리스너 직접 사용 화면 (핵심)

### `front/view/src/chat/hooks/useChatScroll.js`

- **역할**: 채팅 리스트 스크롤 + 키보드 연동의 핵심 훅.
- **키보드 이벤트**
  - show/hide 리스너 등록 후 `keyboardHeight` 상태 관리.
- **키보드 올라올 때 로직**
  - 현재 사용자가 하단 근처(`isNearBottomRef`)에 있고 prepend 보정 중이 아니면,
  - 지연 후 `listRef.current?.scrollToEnd()` 실행해 최신 메시지 가시성 유지.
- **핵심 함수/핸들러**
  - 키보드 show 콜백(리스너 내부)
  - 키보드 hide 콜백(리스너 내부)
  - `setKeyboardHeight(...)`

### `front/view/src/boardDetail.jsx`

- **역할**: 게시글 상세 + 댓글 입력.
- **키보드 올라올 때 로직**
  - 댓글/대댓글 포커스 대상이 있으면 해당 댓글로 스크롤, 없으면 맨 아래로 스크롤.
  - 포커스 타이밍 이슈 방지를 위해 `setTimeout` 지연 포커스(260ms, 520ms 백업 포커스).
- **핵심 함수/핸들러**
  - `onShow` (keyboard 리스너 내부)
  - `focusReplyInput(commentId)`
  - `scrollToComment(commentId)`

### `front/view/src/schoolMailDetail.jsx`

- **역할**: 학교 우편 상세 + 댓글 입력.
- **키보드 올라올 때 로직**
  - `scrollToCommentIdRef`가 있으면 해당 댓글 위치로, 없으면 하단으로 이동.
  - 포커스 지연(260ms) + 백업 포커스(520ms) 적용.
- **핵심 함수/핸들러**
  - `onShow` (keyboard 리스너 내부)
  - `focusReplyInput(commentId, authorLabel)`
  - `scrollToComment(commentId)`

---

## 3) 채팅 입력 컴포넌트 계층

### `front/view/src/chat/screens/ChatScreen.jsx`

- **역할**: 채팅 화면의 메인 컨테이너.
- **키보드 대응**
  - `KeyboardAvoidingView` 사용 (`iOS: padding`, `Android: height`)
  - `keyboardVerticalOffset`: iOS에서 `insets.top + normalize(48)` 적용.
  - `useChatScroll`이 제공하는 `keyboardHeight`를 입력 컴포넌트로 전달.
- **핵심 함수**
  - `handleSend()`

### `front/view/src/chat/components/MessageInput.jsx`

- **역할**: 채팅 입력 영역.
- **키보드 대응**
  - `keyboardHeight > 0`일 때 하단 패딩을 0으로 줄여 입력창 위치를 키보드에 맞춤.
  - 실제 입력 UI는 `CommentInput` 재사용.

### `front/components/CommentInput.jsx`

- **역할**: 공통 입력 컴포넌트(댓글/채팅 공용).
- **키보드 관련 포인트**
  - 멀티라인 `TextInput`.
  - `onSubmitEditing`에서 전송 트리거.
  - 직접 키보드 이벤트 리스너는 없음(상위 화면에서 제어).

### `front/view/src/chat/components/MessageList.jsx`

- **키보드 관련 포인트**
  - 리스트에 `keyboardShouldPersistTaps="handled"` 적용(입력 중 탭 처리 안정화).

---

## 4) 일반 폼 화면 (KeyboardAvoidingView 중심)

아래 파일들은 공통적으로 `KeyboardAvoidingView` + `ScrollView` + `keyboardShouldPersistTaps="handled"` 패턴을 사용하며, 대부분 `TouchableWithoutFeedback onPress={Keyboard.dismiss}`로 배경 탭 시 키보드 내림 처리합니다.

### 인증/로그인/회원가입

- `front/view/src/Login.jsx`
  - 배경 탭 `Keyboard.dismiss`, 기본 `KeyboardAvoidingView` 적용.
- `front/view/src/PWfind.jsx`
  - 단계형 비밀번호 찾기 폼, `KeyboardAvoidingView` 적용.
- `front/view/src/IDfind.jsx`
  - 입력 필드는 거의 없지만 폼 레이아웃 동일 패턴 적용.
- `front/view/src/signup/SignStep1.jsx`
  - PASS 인증 번호 입력 폼.
- `front/view/src/signup/SignStep1-2.jsx`
  - 보호자 인증 폼.
- `front/view/src/signup/SignStep2.jsx`
  - 계정 정보 입력 폼.
- `front/view/src/signup/SignStep4.jsx`
  - 이름/학교/학년/반 입력 폼.
- `front/view/src/signup/SignStepNumber.jsx`
  - 열람 주소/번호 입력 폼.

### 검색

- `front/view/src/searchscreen.jsx`
  - `searchInputRef.focus()`(route 파라미터 기반 자동 포커스).
  - `onSubmitEditing -> runSearch()`.
  - 배경 탭 dismiss + `KeyboardAvoidingView`.
- `front/view/src/SearchResult.jsx`
  - 결과 화면/확장 화면 모두 `KeyboardAvoidingView`.
  - `TextInput onFocus`에서 `SearchScreen`으로 이동해 포커스 UX 분리.
  - `onSubmitEditing`으로 검색 확정.
- `front/view/frame/SearchSubHeader.jsx`
  - 검색 입력 헤더 컴포넌트(`TextInput`)로 자동 포커스(`setTimeout + focus`)를 사용.
  - 개별 컴포넌트이므로 직접 키보드 회피는 없고, 포함된 화면이 키보드 컨테이너를 담당.

### 우편 작성

- `front/view/src/sendmailscreen.jsx`
  - 학교/사용자 검색 + 본문 입력 폼.
  - `KeyboardAvoidingView` 및 dismiss 패턴 적용.
- `front/view/src/sendSchoolMailScreen.jsx`
  - 학교 우편 작성 폼(본문 멀티라인).
  - `KeyboardAvoidingView` + dismiss 패턴 적용.

### 게시글 작성

- `front/view/src/boardWrite.jsx`
  - `KeyboardAvoidingView` + 최상위 배경 탭 dismiss.
  - `onScrollBeginDrag={Keyboard.dismiss}`로 스크롤 시작 시 키보드 내림.
  - 해시태그 입력 `onSubmitEditing={handleAddHashtag}`.
  - 주석상 의도: 태그 패널 열 때 자동 포커스 제거(키보드 자동 상승 방지).

### 기타

- `front/view/src/changepassword.jsx`
  - 단순 비밀번호 변경 폼, `KeyboardAvoidingView`.
- `front/view/src/changeschool.jsx`
  - 학교 검색 텍스트 입력, `KeyboardAvoidingView`.

---

## 5) 입력은 있지만 키보드 특화 로직이 약한 화면

아래 파일들은 `TextInput`이 있으나 키보드 show/hide 이벤트 리스너나 고급 보정 로직은 거의 없습니다.

- `front/components/timerFriendModals.jsx`
  - `AddFriendModal` 내부 친구 추가 입력(`TextInput`, `autoFocus`)에서 키보드를 사용함.
  - 현재는 모달에 `KeyboardAvoidingView` + 배경 탭 dismiss 보정 적용됨.
- `front/view/src/mailreply.jsx`
  - 답장 입력(`TextInput multiline`)은 있으나 `KeyboardAvoidingView`/dismiss 처리 없음.
- `front/view/src/edittimetable.jsx`
  - 과목 입력 모달 `TextInput`(`autoFocus`) 사용, 별도 키보드 보정 없음.
- `front/view/src/friendsscreen.jsx`
  - 친구 검색창 `TextInput`만 사용, 키보드 전용 처리 없음.
- `front/view/src/notificationsettings.jsx`
  - 아이디/비밀번호 입력 `TextInput` 있으나 키보드 이벤트 보정 없음.
- `front/view/src/timerModals.jsx`
  - 모달 내 과목/할일 입력 `TextInput` 사용, 키보드 전용 처리 없음.
- `front/view/src/mypage.jsx`
  - 현재 활성 UI에서는 입력 로직이 대부분 주석/비활성, 키보드 특화 처리 없음.

---

## 6) 키보드 동작 패턴 요약

프로젝트에서 반복되는 핵심 패턴은 아래 4가지입니다.

1. **레이아웃 회피**: `KeyboardAvoidingView` (`padding`/`height`)
2. **배경 탭 종료**: `TouchableWithoutFeedback + Keyboard.dismiss`
3. **입력 중 탭 안정화**: `ScrollView.keyboardShouldPersistTaps="handled"`
4. **고급 스크롤 보정**: 채팅/댓글 화면에서 `Keyboard.addListener`로 키보드 show 시 `scrollToEnd` 또는 특정 댓글 위치로 이동

---

## 7) "키보드 올라올 때" 실제 로직이 있는 대표 함수 목록

- `KeyboardProvider` 내부 `onShow`, `onHide` (`front/context/KeyboardContext.jsx`)
- 채팅 훅의 키보드 show/hide 리스너 콜백 (`front/view/src/chat/hooks/useChatScroll.js`)
- `focusReplyInput`, `scrollToComment`, keyboard show 콜백 (`front/view/src/boardDetail.jsx`)
- `focusReplyInput`, `scrollToComment`, keyboard show 콜백 (`front/view/src/schoolMailDetail.jsx`)
- `runSearch` (`front/view/src/searchscreen.jsx`, `onSubmitEditing` 연동)
- `handleAddHashtag` (`front/view/src/boardWrite.jsx`, `onSubmitEditing` 연동)

---

## 8) 점검 포인트 (후속 개선 후보)

- `mailreply.jsx`는 입력 화면 대비 키보드 회피/내림 처리가 없어 작은 화면에서 입력 가림 가능성 있음.
- `KeyboardAvoidingView`를 쓰는 화면마다 `keyboardVerticalOffset` 기준이 제각각이어서(일부 0 고정) 헤더 높이와 충돌 가능성이 있음.
- 댓글/채팅처럼 고급 스크롤 보정이 필요한 화면은 이미 잘 구성되어 있으나, 일반 입력 화면은 대부분 기본 패턴에 의존.

# 댓글·채팅 입력칸 iOS 네이티브 적용 체크리스트

> 대상: 댓글 입력칸 `components/CommentInput.jsx`, 채팅 입력칸 `components/ChatInput.jsx`.  
> iOS에서만 두 입력칸 전체를 네이티브 뷰 하나로 그린다. 들어가는 것은 답글 줄, 이미지 미리보기, 입력줄(사진 버튼·글 입력·전송 버튼)이다.  
> 모양은 iOS 26 유리(Liquid Glass) 스타일로 바꾼다.  
> 네이티브 코드는 기존 `modules/youth-paper-tab-bar` 모듈에 두 번째 모듈로 추가한다.  
> Android와 네이티브 모듈이 없는 빌드는 지금 JS 입력칸을 그대로 쓴다.  
> prebuild는 하지 않는다. 네이티브 수정 뒤에는 `ios/`에서 `pod install`, Xcode에서 개발 클라이언트를 다시 빌드한다.

## 지금 상태

- `CommentInput`을 쓰는 곳: `view/src/boardDetail.jsx`, `view/src/schoolMailDetail.jsx`
- `ChatInput`을 쓰는 곳: `view/src/chat/components/MessageInput.jsx` → `ChatScreen.jsx` → 쪽지 `ChatRoomScreen.jsx`, DM `DMChatScreen.jsx`
- 두 입력칸 모두 `styles/board.style.js`의 `bottomInputRow`·`bottomInputInner`·`bottomInput`·`sendButton` 스타일을 쓴다
- 키보드: 세 화면 모두 `react-native-keyboard-controller`의 `useKeyboardHandler`로 입력칸을 `translateY`로 올리고 목록 `paddingBottom`을 늘린다
- 아래 여백: 댓글은 감싸는 `Animated.View`가 `max(insets.bottom, 12)`, 채팅은 `MessageInput`이 `insets.bottom`(없으면 12). 안쪽 `bottomInputRow`에도 iOS 아래 패딩 14가 있어 여백이 두 겹이다
- 답글: 댓글은 `CommentInput` 안에 "OO에게 답글" 줄과 X 버튼이 있다. 채팅 답장 미리보기는 `ChatScreen`에 있고 입력 컴포넌트 밖이다
- 사진 버튼: 댓글은 `showImageAttach` 옵션(게시판은 `false`), 채팅은 항상 보인다. 사진 선택은 `expo-image-picker`, 최대 5장
- 답글 버튼이 `bottomInputRef.current.focus()`로 입력칸에 포커스를 준다
- DM의 `chatInputStyles`는 스타일 묶음 객체를 View `style`에 넣고 있어 실제로 적용되지 않는다
- iOS 배포 타깃은 16.4다. `UIGlassEffect`는 iOS 26부터라 그 아래 버전용 대체 모양이 필요하다

---



## 0. 작업 순서

- [x] 1단계: 네이티브 입력칸 뷰를 만든다 (입력줄만, 텍스트 동기화·높이·포커스). 모듈 타깃 시뮬레이터 컴파일까지 했다
- [x] 2단계: 답글 줄·이미지 미리보기를 네이티브 뷰에 넣는다. 모듈 타깃 시뮬레이터 컴파일까지 했다
- [x] 3단계: 유리 스타일을 입힌다 (iOS 26 이상 `UIGlassEffect`, 그 아래는 지금 흰 배경 모양). 모듈 타깃 시뮬레이터 컴파일까지 했다
- [x] 4단계: `pod install`, Xcode 재빌드. 임시로 게시글 상세에 붙여 동작을 봤다 (사용자 확인 완료)
- [x] 5단계: JS 래퍼를 만들고 `CommentInput`·`ChatInput`에서 iOS만 보낸다
- [x] 6단계: 세 화면(게시글 상세·학교 쪽지 상세·채팅)에 연결하고 여백·키보드를 맞춘다. Metro 번들 확인까지 했다
- [ ] 7단계: 기기에서 확인한다

---



## 1. 네이티브 입력칸 뷰 (입력줄)

경로: `modules/youth-paper-tab-bar/ios/`.

### 모듈 추가

- [x] `expo-module.config.json`의 `ios.modules`에 `"YouthPaperInputBarModule"`을 추가한다
- [x] 새 파일 `YouthPaperInputBarModule.swift`(`Name("YouthPaperInputBar")`), `YouthPaperInputBarView.swift`
- [x] podspec은 `ios/` 안 Swift 파일을 모두 잡으므로 바꾸지 않는다. `pod install` 뒤 `ExpoModulesProvider.swift`에 `YouthPaperInputBarModule`이 들어갔다
- [x] `src/index.js`에 `NativeInputBarView`를 탭 바와 같은 방식(`requireOptionalNativeModule` 확인 후 `requireNativeViewManager`)으로 내보낸다

### 뷰 구성

- [x] `ExpoView` 안 세로 `UIStackView`에 입력줄을 둔다. 2단계에서 답글 줄·이미지 미리보기를 같은 스택 위쪽에 넣는다
- [x] 입력줄: [사진 버튼 44] 간격 8 [캡슐: `UITextView` + 전송 버튼 36]. 좌우 여백 16, 위아래 8
- [x] 사진 버튼은 캡슐 밖에 따로 둔다. 3단계에서 사진 버튼만 따로 유리, 캡슐(입력칸+전송 버튼)은 유리 하나로 감싼다 (질문 5)
- [x] 사진 버튼·전송 버튼은 캡슐 아래쪽에 맞춘다. 여러 줄로 늘어나도 아래에 붙어 있다
- [x] 아이콘은 SF Symbols(`photo`, `arrow.up`)
- [x] 글꼴은 iOS 시스템 글꼴, 크기는 JS `fontSize` prop (질문 1)
- [x] `UITextView`에는 placeholder가 없어 라벨을 겹쳐 그리고, 글이 있으면 숨긴다
- [x] 캡슐 높이 44~80. 80을 넘으면 내부 스크롤로 바꾼다
- [x] 글자 수 제한 `maxLength` (`textView(_:shouldChangeTextIn:replacementText:)`)
- [x] 전송 버튼: 글도 사진도 없으면 이벤트를 보내지 않는다 (사진 조건은 2단계에서 넣었다)

### Props

- [x] `text`, `mostRecentEventCount`, `placeholder`, `maxLength`
- [x] `editable`: `false`면 키보드는 그대로 두고 입력·전송·사진 버튼만 막는다
- [x] `showAttach` (댓글 게시판 `false`, 채팅 `true`). 숨기면 캡슐이 왼쪽 여백까지 넓어진다
- [x] `fontSize`
- [x] 색: `textColor`, `placeholderColor`, `inputBackgroundColor`, `sendButtonColor`, `sendIconColor`, `attachIconColor`. JS가 `colors.js` 값을 넘긴다. 다크 모드가 생기면 JS에서 넘기는 값만 바꾸면 된다 (질문 6)

### Events

- [x] `onChangeText({ text, eventCount })`
- [x] `onSend`
- [x] `onPressAttach` (사진 선택은 JS의 `expo-image-picker`가 한다)
- [x] `onHeightChange({ height })`: 뷰 전체 높이가 바뀔 때만 보낸다 (탭 바의 `onPreferredHeightChange`와 같은 방식)
- [x] `onInputFocus`, `onInputBlur`. RN 기본 `onFocus`/`onBlur`와 이름이 겹치지 않게 했다

### ref 메서드

- [x] 뷰 안 `AsyncFunction`으로 `focus()`, `blur()`, `clear()`. 메인 스레드에서 돈다
- [ ] JS 래퍼에서 `useImperativeHandle`로 `focus()`를 노출해 기존 `bottomInputRef.current.focus()`가 그대로 동작하게 한다 (5단계)

### 텍스트 동기화

- [x] 입력 → 네이티브가 `onChangeText({ text, eventCount })`로 JS 상태를 갱신한다
- [x] JS는 받은 `eventCount`를 `mostRecentEventCount`로 `text`와 함께 돌려준다. 네이티브는 이 값이 자기 변경 횟수보다 작으면 옛 글로 보고 버린다. 빠르게 입력할 때 JS가 늦게 돌려준 글이 입력 중인 글을 덮어쓰지 않게 한다
- [x] 네이티브 현재 글과 다를 때만 덮어쓴다 (전송 후 비우기, 초안 복원)
- [x] 한글 조합 중(`markedTextRange != nil`)에는 prop으로 덮어쓰지 않는다
- [x] 조합 중에 전송을 누르면 조합만 끝낸다(`unmarkText`). 조합 중 글자도 `onChangeText`로 이미 JS에 가 있어 전송 내용은 같고, 전송 뒤 비우기가 적용된다

---


## 2. 답글 줄·이미지 미리보기



### 답글 줄

- [x] 파일: `YouthPaperInputBarAccessories.swift`의 `InputBarReplyRow`. 입력칸 스택의 맨 위
- [x] 제목 한 줄 + 아래 줄(선택) + X 버튼. 제목이 비면 숨긴다
- [x] Props: `reply` = `{ title, subtitle? }` (없거나 `title`이 비면 숨김). 댓글은 `{ title: "OO에게 답글" }`, 채팅은 `{ title: "나에게 답장 중", subtitle: 내용 }`
- [x] Props: `replyStyle` = `{ titleColor, titleFontSize, titleBold, subtitleColor, subtitleFontSize, cancelColor }`. 댓글·채팅이 지금 스타일 값을 JS에서 넘긴다
- [x] Events: `onCancelReply` (X 버튼). 채팅도 미리보기 전체 누르기 대신 X 버튼으로 취소한다 (질문 3)
- [x] 답글 중 placeholder(`OO에게 답글 입력...`)는 JS가 `placeholder` prop으로 정한다. 네이티브는 바꾸지 않는다

### 이미지 미리보기

- [x] 파일: 같은 파일의 `InputBarImageStrip`. 답글 줄과 입력줄 사이
- [x] 가로 `UIScrollView` + `UIStackView`. 썸네일 72×72, 모서리 8, 간격 8, 좌우 여백 16
- [x] 오른쪽 위 지우기 버튼(검은 원에 흰 X). 삐져나오는 만큼 위쪽에 여유를 둔다
- [x] Props: `images` (로컬 `file://` URI 배열). 배열이 비면 숨긴다. 같은 배열이면 다시 그리지 않는다
- [x] Events: `onRemoveImage({ index })`. 전송 중(`editable` false)에는 보내지 않는다
- [x] 원본을 통째로 읽지 않고 ImageIO로 썸네일 크기만큼 줄여 백그라운드에서 읽는다. URI별로 `NSCache`(30장)에 둔다
- [x] 전송 버튼: 글이 비어도 사진이 있으면 `onSend`를 보낸다 (지금 JS와 같게)

---


## 3. 유리 스타일

- [x] 판별: `inputBarUsesGlass` (`#available(iOS 26.0, *)`). 유리/대체 바탕은 `makeInputBarSurface` 한 곳에서 만든다
- [x] iOS 26 이상: 사진 버튼을 원형 유리 하나(`UIGlassEffect`, 누르면 반응하는 interactive), 캡슐(입력칸+전송 버튼)을 유리 하나로 감싼다. 캡슐 모서리는 22로 고정해 여러 줄이어도 둥근 사각형이 된다 (질문 5)
- [x] 전송 버튼은 유리 안에서도 primary 색 원형 버튼 (질문 8)
- [x] iOS 26 이상: 입력칸 뷰 바탕은 투명, 위쪽 테두리 없음
- [x] iOS 26 이상: 답글 줄은 모서리 18 유리 카드에 담는다. 목록이 뒤로 비쳐도 답글 글이 읽히게 한다
- [x] 이미지 미리보기는 썸네일이 불투명해 따로 바탕을 두지 않는다
- [x] iOS 26 미만: 지금처럼 흰 입력줄 바탕(`barBackgroundColor`), 위쪽 0.5 테두리(`barBorderColor`), 회색 둥근 입력칸(`inputBackgroundColor`). 이 세 prop은 유리일 때 쓰지 않는다 (질문 2)
- [x] `overrideUserInterfaceStyle`로 고정하지 않는다. 유리는 시스템 라이트/다크를 따르고, 글·버튼 색은 모두 JS prop이라 다크 모드가 생기면 JS만 바꾸면 된다 (질문 6)
- [x] 입력칸을 목록 위에 띄워 콘텐츠가 뒤로 비치게 하는 것은 6단계에서 했다 (질문 4)
- [x] 실제 모양 확인은 4단계에서 했다

---


## 4. 빌드·임시 확인

- [x] `cd ios && pod install`. `ExpoModulesProvider.swift`에 `YouthPaperInputBarModule`이 들어갔는지 본다
- [ ] Xcode에서 `⌘⇧K` 후 `⌘R`. 터미널 `xcodebuild`와 Xcode 빌드를 동시에 돌리지 않는다
- [x] 게시글 상세(`boardDetail.jsx`) 한 곳에만 임시로 붙였다. iOS이고 네이티브 모듈이 있으면 `CommentInput` 대신 `NativeInputBarIOS`를 그린다. `TODO(입력칸 4단계 임시)` 주석 자리이고 5단계에서 `CommentInput` 안으로 옮긴다
- [x] 래퍼 `components/NativeInputBarIOS.jsx`를 미리 만들었다 (5단계에서 그대로 쓴다): 높이 상태, `eventCount` 되돌려주기, ref `focus`/`blur`/`clear`, `colors.js` 색 전달, `USES_NATIVE_INPUT_BAR`
- [x] Metro iOS 번들 확인
- [x] Xcode `⌘⇧K` 후 `⌘R` (사용자)
- [x] 게시글 상세에서 확인: 한글 입력, 여러 줄 늘어나기·80 넘으면 내부 스크롤, 전송 후 비우기, 답글 버튼 → 답글 카드·포커스, X로 답글 취소, 키보드 따라 올라가기, 유리 모양 (사용자 확인: 모두 정상)

---



## 5. JS 래퍼

- [x] `components/NativeInputBarIOS.jsx`: 네이티브 뷰를 감싸고 높이 상태를 관리한다. 첫 높이 60 (4단계에서 만들었다)
- [x] `CommentInput.jsx`: iOS이고 네이티브 뷰가 있으면 `NativeInputBarIOS`, 아니면 지금 코드. 게시글 상세의 4단계 임시 분기는 걷어내 원래 코드로 되돌렸다
- [x] 사진 선택은 두 분기가 같은 `pickImages`를 쓴다 (`CommentInput`·`ChatInput` 각각)
- [x] `ChatInput.jsx`: 같은 방식. 답장 미리보기용 `replyToMessage`·`clearReplyTarget` props를 추가했다. 네이티브일 때만 `{ title: "나에게/상대방에게 답장 중", subtitle: 내용 }`으로 넘긴다. `MessageInput`이 이 props를 넘기는 것은 6단계
- [x] 판별 상수: `USES_NATIVE_INPUT_BAR = Platform.OS === 'ios' && !!NativeInputBarView` (`NativeInputBarIOS.jsx`에서 내보낸다)

---



## 6. 화면 연결

### 띄우기 (질문 4)

- [x] `NativeInputBarIOS.jsx`에 공통 도구를 둔다: `INPUT_BAR_OVERLAY_STYLE`(absolute, 아래·좌·우 0), `INPUT_BAR_WRAPPER_BACKGROUND`(iOS 26 이상 투명, 그 아래 흰색), `useInputBarOverlay()`(감싸는 뷰 `onLayout` 높이). JS 입력칸일 때는 각각 `null`·흰색·0이라 지금과 같다
- [x] `boardDetail.jsx`, `schoolMailDetail.jsx`: 입력칸을 감싸는 `Animated.View`를 띄우고, `FlatList` 아래 여백(`paddingBottom`)을 입력칸 높이로 둔다 (원래 0)
- [x] `ChatScreen.jsx`: 입력칸을 감싸는 `Animated.View`를 띄우고, `MessageList`에 `bottomSpacerHeight`로 높이를 넘긴다
- [x] `MessageList.jsx`: `ListFooterComponent`로 끝에 빈 칸을 둔다. FlashList 2.0.2는 `inverted`를 지원하지 않아 실제로는 일반 방향 목록이라 끝(footer)이 화면 아래다
- [x] 키보드 처리는 지금 `useKeyboardHandler`를 그대로 쓴다. 입력칸은 `translateY`로 올라가고, 목록은 키보드 높이만큼 `paddingBottom`이 늘어난 뒤 그 위에서 다시 입력칸 높이만큼 끝 여백을 둔다

### 여백

- [x] 네이티브일 때 감싸는 뷰 아래 여백은 `insets.bottom`만 둔다 (원래 `max(insets.bottom, 12)`). 네이티브 입력줄 위아래 8은 입력칸 디자인의 일부라 남긴다
- [x] JS 입력칸은 지금 여백 그대로

### 채팅 답장 미리보기 (질문 3)

- [x] `ChatScreen.jsx`: 네이티브일 때 바깥 답장 미리보기를 그리지 않는다
- [x] `MessageInput.jsx`: `replyToMessage`·`clearReplyTarget`을 `ChatInput`에 넘긴다. 네이티브 입력칸이 답장 카드(두 줄 + X)를 그린다

### DM `chatInputStyles` (질문 7)

- [x] `MessageInput.jsx`: 감싸는 View `style`에 넣던 것을 `ChatInput`의 `styles`에 합쳐 넘긴다. 지금 DM 값은 `createDetailStyles` 값과 같아 모양은 바뀌지 않는다
- [x] `MessageInput`이 `ChatInput`에 넘기는 `normalize`도 기본값이 적용된 함수로 넘긴다

### 확인

- [x] Metro iOS·Android 번들 확인
- [ ] 기기 확인은 7단계

---


## 6-1. 추가 변경 (6단계 뒤 요청)

- [x] 답글 줄을 입력 캡슐 안으로 옮겼다. 캡슐 하나(iOS 26 이상 유리, 그 아래 회색)가 [답글 줄 → 글 입력·전송]을 세로로 감싼다. 답글 줄 따로 쓰던 유리 카드는 없앴다
- [x] 답글 X 버튼은 전송 버튼과 세로 줄을 맞췄다. 답글 글 시작 위치는 아래 글 입력칸과 같다
- [x] 이미지 미리보기는 캡슐 밖 위쪽에 둔다 (이미지 → 캡슐 순서)
- [x] 쪽지·DM `ChatInput`: iOS·Android 모두 답장 중이면 사진 버튼을 숨기고 입력칸이 줄 전체를 쓴다
- [x] 전송 버튼 약 90%: 네이티브 36 → 32(화살표 16 → 14.5, 캡슐 안 가운데 유지), JS `board.style.js` `sendButton` 44 → 40(화살표 22 → 20)
- [x] 네이티브는 `swiftc -typecheck`로 확인했다. Xcode 재빌드 필요

---

## 7. 기기 확인

- [ ] 한글 입력·조합, 이모지, 붙여넣기
- [ ] 여러 줄로 늘어나기, 최대 높이 뒤 내부 스크롤
- [ ] 전송 후 비우기, 전송 중 입력·전송 막기, 빈 글 전송 막기
- [ ] 답글 버튼 → 답글 줄 표시와 포커스, X로 취소
- [ ] 사진 추가(최대 5장)·미리보기·삭제 (채팅)
- [ ] 키보드 올라올 때·내려갈 때 입력칸과 목록 위치
- [ ] 홈 인디케이터 위 여백
- [ ] 게시글 상세, 학교 쪽지 상세, 쪽지, DM 네 곳 모두
- [ ] iOS 26 미만 기기 또는 시뮬레이터에서 대체 모양
- [ ] Android는 바뀌지 않았다

---



## 질문 (답변을 적어 주세요)

1. **글꼴:** 앱 글꼴 `Baloo2-Regular`에는 한글이 없어 지금도 한글은 시스템 글꼴로 보입니다. 네이티브 입력칸은 iOS 시스템 글꼴(SF/애플 SD 산돌고딕)로 해도 될까요?
  - 답변: 응
2. **iOS 26 미만 모양:** 유리 효과가 없는 iOS 16.4~25에서는 블러(반투명 흐림)로 대체할까요, 지금처럼 흰 배경으로 둘까요?
  - 답변: 지금처럼 흰 배경
3. **채팅 답장 미리보기:** 지금은 제목(`나에게 답장 중`)과 내용 한 줄, 두 줄입니다. 댓글 답글 줄처럼 한 줄로 합칠까요, 두 줄 그대로 둘까요? 지금은 미리보기 전체를 누르면 취소되는데, 댓글처럼 X 버튼으로 바꿀까요?
  - 답변: 두 줄 그대로 두고, 댓글처럼 X 버튼으로 바꾸자
4. **콘텐츠 비치기:** 탭 바처럼 입력칸을 목록 위에 띄워 댓글·메시지가 입력칸 뒤로 비쳐 보이게 할까요? 아니면 지금처럼 목록 아래 자리를 차지하고 유리 모양만 입힐까요?
  - 답변: 탭 바처럼 입력칸을 목록 위에 띄워 댓글·메시지가 입력칸 뒤로 비쳐 보이게 해줘
5. **유리 모양 단위:** 입력줄 전체(사진 버튼·입력칸·전송 버튼)를 큰 유리 캡슐 하나로 감쌀까요, iMessage처럼 입력칸 캡슐과 버튼들을 각각 따로 유리로 할까요?
  - 답변: 사진만 따로 유리, 입력칸/전송 버튼은 유리 캡슐 하나로 감싸
6. **다크 모드:** 앱이 다크 모드를 지원하지 않는다면 입력칸도 라이트 모드로 고정할까요?
  - 답변: 다크모드 지원 예정이라서 라이트모드로 하되 고정하진 말아줘(추후에 유동적으로 변경할 수 있게 해줘)
7. **DM** `chatInputStyles`**:** 지금 적용되지 않는 이 prop을 이번 작업에서 지울까요, 손대지 말까요?
  - 답변: **DM** `chatInputStyles도 이번 작업에 적용해줘`
8. **전송 버튼 색:** 유리 스타일에서도 지금처럼 primary 색 원형 버튼을 유지할까요, 유리 버튼에 primary 색 화살표만 둘까요?
  - 답변: 유리 스타일에서도 지금처럼 primary 색 원형 버튼을 유지


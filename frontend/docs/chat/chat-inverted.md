# Inverted 채팅 리스트 리팩토링 체크리스트

> 목표: **현재 구조를 Inverted 리스트로 전환**해서 카카오톡 수준의 부드러운 스크롤/페이징을 구현하되,  
> **디자인(스타일·레이아웃)은 절대 변경하지 않고**, 오직 로직/구조만 수정한다.

---

## 0. 공통 원칙

- [x] **디자인 불변**  
  - `message.style`, `chatStyles`, `board.style`, 색상/폰트/마진/패딩 등 **UI 관련 코드는 변경 금지**  
  - 변경 가능한 것: 데이터 정렬, 리스트 방향, 스크롤/페이징 로직, 리듀서/훅 내부 로직

- [x] **정렬 기준 단일화**  
  - 모든 메시지는 내부적으로 **id (또는 createdAt)** 한 가지 기준으로만 정렬

- [ ] **중복 ID 금지**  
  - 하나의 `id`(또는 clientId/serverId)가 리스트에 **절대 두 번 이상 존재하지 않도록** 보장

---

## 1. 데이터 정렬 구조 리팩토링 (최신 → 과거)

### 1-1. `useChatCore` / `chatReducer`

- [x] `messages`를 **[최신 → 과거]** 순서로 유지하는 `selector` 또는 변환 로직 추가  
  - 예: `sortedMessages = [...Object.values(messagesById)].sort((a, b) => b.id - a.id)`

- [x] `SET_MESSAGES`, `MERGE_POLL_MESSAGES`, `ADD_MESSAGE`, `ADD_MESSAGES_PREPEND / fetchMore` 등  
  모든 진입 경로에서 **정렬 이후에만** `messageIds`를 확정하도록 수정

- [x] ID 기준 정렬과 createdAt 기준 정렬이 섞이지 않도록, 기준을 **한 가지로 고정**

### 1-2. 중복 방지

- [x] 리듀서에서 새 메시지 병합 시:
  - `if (messagesById[newMsg.id])` → 기존 항목 업데이트 / 교체
  - 새로 추가되는 메시지 배열에서 **이미 있는 ID 필터링** 후 push

- [x] `clientId` → `serverId` 교체(`REPLACE_TEMP_MESSAGE`) 시:
  - `clientId` 삭제 + `serverId` 삽입을 **원자적으로 처리** (둘 다 남지 않도록)

---

## 2. FlashList / `MessageList` Inverted 구조 전환

### 2-1. `MessageList.jsx` – FlashList 설정

- [x] `inverted` 속성 적용:

  ```jsx
  <FlashList
    inverted
    ...
  />
  ```

- [x] `data` 배열은 항상 **[최신 → 과거]** 로 내려가도록 구성  
  (`flatData` 생성 시 정렬 방향 고려)

### 2-2. `onEndReached` 기반 페이징

- [x] 기존 `onStartReached` 제거  
- [x] `onEndReached={handleEndReached}` / `onEndReachedThreshold` 설정  
  - Inverted 리스트에서 **위(과거)** 에 도달했을 때 `onEndReached`가 호출되도록 실제 동작 확인

- [x] `handleEndReached` → `loadMore` 호출 경로로 연결

### 2-3. 위치 튐 방지 (앵커링)

- [x] `useChatScroll` (또는 별도 훅)에서:
  - **현재 첫 번째 visible 아이템**(또는 화면 중앙 아이템)의 id/offset 기록
  - `loadMore`로 과거 데이터를 배열 뒤쪽에 append 후:
    - 해당 id를 새 `data`에서 찾아 index를 얻고,
    - `scrollToIndex({ index, animated:false, viewPosition:0 })` 로 **동일 위치로 복원**

- [x] FlashList의 `maintainVisibleContentPosition`는 inverted 조합에서 문제가 되면  
  **끄는 것도 고려** (앵커를 우리가 직접 관리)

---

## 3. `useChatScroll` / 스크롤 로직 재구성

### 3-1. 초기 진입 앵커링

- [x] 방 진입 후, 첫 로딩이 끝났을 때 **한 번만** `scrollToEnd(false)` 호출  
  - Inverted 리스트에서 `scrollToEnd`가 실제로 “최신 메시지 위치”를 가리키는지 기기별로 확인

- [x] roomId 변경 시:
  - 모든 ref 초기화 (`didInitialAnchorRef`, `isInitialLoadRef`, anchor refs 등)

### 3-2. 스크롤 이벤트 처리

- [x] `handleScroll`에서:
  - offset / viewport / contentHeight 계산
  - 사용자가 **위쪽 End 근처**로 왔는지 판단 (임계값은 반응 보며 조절)

- [x] 스크롤 속도/사용자 움직임과 무관하게:
  - “End 근처 진입 → `onEndReached`/`loadMore`” 패턴이  
    **최대 한 번씩만** 호출되도록 플래그/쿨다운 관리

### 3-3. 프리페치 (추후 단계)

- [ ] 기본 구조가 안정된 뒤, 필요하다면:
  - End보다 조금 아래(예: 1~1.5 화면 높이 전)에서  
    미리 `loadMore()` 트리거하는 **프리페치** 옵션을 다시 추가

---

## 4. 이미지/가변 높이 대응 (FlashList 튜닝 유지)

### 4-1. 레이아웃 튐 방지

- [x] `estimatedItemSize` 유지 또는 조정 (실제 평균 메시지 높이에 근접하게)
- [x] `overrideItemLayout` / `estimateRowHeight` 로:
  - 텍스트 + 이미지 + 답장 + 상태(실패/삭제) 조합별 **대략적 높이 추정** 계속 사용

- [ ] Inverted 전환 후에도:
  - 이미지 로딩 전/후 스크롤이 튀지 않는지 확인  
  (특히 상단 근처에서 페이징 직후 이미지가 로딩될 때)

### 4-2. 성능 옵션

- [x] 기존 FlashList 옵션 유지/검증:
  - `maxToRenderPerBatch`
  - `windowSize`
  - `initialNumToRender`
  - `removeClippedSubviews`
  - `disableAutoLayout`

- [ ] Inverted 상태에서 모든 옵션이 동일하게 안정적으로 동작하는지 확인

---

## 5. 테스트 & 오류 검사

### 5-1. 기능 테스트 시나리오

- [ ] **최신 메시지 하단 고정**  
  - 방 진입 → 스크롤 없이 → 항상 최신 메시지가 화면 하단에 위치

- [ ] **과거 페이징**  
  - 위로 천천히 스크롤 → 부드럽게 이전 메시지가 이어짐 (점프 없음)  
  - 매우 빠르게 위로 스크롤해도, 순서/위치가 틀어지지 않는지 확인

- [ ] **낙관적 전송(텍스트/이미지)**  
  - 보낸 직후 바로 말풍선이 추가되고,  
  - 서버 응답이 늦어도 순서/정렬이 유지되는지

- [ ] **재진입/리로드**  
  - 방을 나갔다 다시 들어와도  
    - 내/상대 메시지 구분,  
    - 순서,  
    - 하단 앵커링이 그대로 유지되는지

### 5-2. 오류 검사

- [ ] Metro/콘솔에 경고/에러 없는지 확인  
- [x] `useChatCore`, `MessageList`, `useChatScroll` 등 수정 파일에 대한 ESLint/TS 오류 확인  
- [ ] 실제 디바이스(Android/iOS)에서:
  - 스크롤 버벅임/프레임 드랍이 없는지  
  - “알 수 없는 점프”가 더 이상 발생하지 않는지 반복 검증


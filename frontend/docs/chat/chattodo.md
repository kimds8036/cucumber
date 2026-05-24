# 채팅 리팩토링 체크리스트 (chat.md v2 기준)

> 기준 문서: `chat.md` v2 — 원본 성능/UX 보존 + 구조 분리
> 비교 대상: 현재 `chat/*` 파일들의 실제 구현 상태
> 표기: ✅ 완료 / ⚠ 부분 / ❌ 미완료

---

## Phase 1: 데이터 레이어 완성

### 1-1. chatReducer.js (chat.md §3)

**상태 구조 (§3-1)**

- ✅ `messagesById`, `messageIds`, `isLoading`, `isLoadingMore`, `hasMore` 존재

**액션 구현 (§3-2)**

- ✅ `SET_MESSAGES` — 초기/완전 교체
- ✅ `ADD_MESSAGES_PREPEND` — 과거 데이터 앞에 prepend + dedupe
- ✅ `ADD_MESSAGE` — 단건 추가 + dedupe (`includes` 체크)
- ✅ `UPDATE_MESSAGE` — 부분 업데이트 (id 변경 로직 제거, REPLACE_TEMP_MESSAGE로 분리)
- ✅ `REPLACE_TEMP_MESSAGE` — clientId→serverId 교체 + reply 정보 보존
- ✅ `DELETE_MESSAGE` — id 기반 완전 제거
- ✅ `TRIM_MESSAGES` — 최신 N개 유지
- ✅ `MARK_ALL_READ` — 내가 아닌 메시지 isReadByMe: true
- ✅ `MARK_MY_READ` — 내 메시지 isReadByOther: true
- ✅ `SET_LOADING` / `SET_LOADING_MORE` / `SET_HAS_MORE`
- ✅ `RESET` — roomId 변경 시 전체 초기화 (isLoading: true)
- ✅ `MERGE_POLL_MESSAGES` — optimistic 보호하며 union

**useMemo→setState 패턴 제거 (§3-5)**

- ✅ `useEffect` + `dispatch(TRIM_MESSAGES)` 패턴 적용됨

### 1-2. normalizeMessage.js (chat.md §7)

- ✅ `parseUtcToLocal` / `formatChatTime` / `getDateKey` (export 추가됨)
- ✅ `id`, `clientId`, `senderId`, `isMe`, `senderName`
- ✅ `content`, `images` (JSON parse 포함)
- ✅ `parent_message_id`, `parent_content`, `parent_sender_name`
- ✅ `createdAt`, `dateKey`, `time`
- ✅ `is_deleted`, `status`, `isSending`, `isFailed`
- ✅ `isReadByOther` — `isMe ? Boolean(raw.is_read) : undefined`
- ✅ `isReadByMe` — `!isMe ? Boolean(raw.is_read) : undefined`

### 1-3. cacheManager.js (chat.md §4-8)

- ✅ `loadCache` / `saveCache` 기본 동작
- ✅ TTL 적용 (`CHAT_CACHE_TTL_MS`)
- ✅ `CACHE_SAVE_LIMIT` 슬라이싱
- ✅ scope 분리 (`${scope}_chat_cache_${roomId}`)
- ✅ 캐시 로드 시 `INITIAL_FETCH_LIMIT`으로 슬라이싱 적용
- ✅ `saveCache` 시그니처 변경: `(scope, roomId, messagesById, messageIds)` — debounce는 useChatCore에서 처리

### 1-4. messageUtils.js (chat.md §9-5)

- ✅ `sameMessageSender` — 원본 동일
- ✅ `withMessageGroupFlags` — showProfile/showTimestamp 계산
- ✅ `injectDateBanners` — dateKey 기반 배너 삽입

### 1-5. chatConfig.js (chat.md §1)

- ✅ `CHAT_MEMORY_LIMIT` (500)
- ✅ `CHAT_CACHE_TTL_MS` (5분)
- ✅ `CHAT_CACHE_SAVE_LIMIT` (200)
- ✅ `CHAT_INITIAL_FETCH_LIMIT` (30)
- ✅ `CHAT_PAGE_SIZE` (30)
- ✅ `CHAT_POLL_INTERVAL` (10000ms)
- ✅ `CHAT_CACHE_SAVE_DEBOUNCE` (500ms)
- ✅ `CHAT_TEMP_REPLACE_DELAY` (5000ms)

### 1-6. useChatCore.js (chat.md §4 — 핵심)

**기본 골격 (§4-1)**

- ✅ `useReducer(chatReducer, initialState)` 사용
- ✅ `messages` derived state (`useMemo`)
- ✅ config 구조: `{ roomId, meId, api, socket, cacheScope, refreshHasUnread }`
- ✅ return에 `meId` 포함

**메시지 정렬 (§4-2)**

- ✅ `getMessageSortValue` (ID 숫자 우선, fallback createdAt) — 원본 방식

**초기 로딩 (§4-3)**

- ✅ 캐시 → API → 읽음처리 순서 흐름
- ✅ `InteractionManager.runAfterInteractions()` 적용
- ✅ `AbortController` 적용 (roomId 변경/unmount 시 취소)
- ✅ roomId 변경 시 `dispatch({ type: 'RESET' })` + ref 초기화
- ✅ `oldestIdRef` 관리
- ✅ 읽음 처리 (`markRead` + `MARK_ALL_READ` + `markNotificationRead` + `refreshHasUnread`)
- ✅ 서버 DESC → 시간순 ASC reverse

**소켓 연결/해제 (§4-4)**

- ✅ `socket.connectSocket(roomId)` 호출
- ✅ `socket.disconnectSocket()` cleanup
- ✅ `connect`/`disconnect`/`connect_error`/`new_message`/`read_receipt` 이벤트 리스너
- ✅ 핸들러 cleanup (off) + pendingClientIdTimeouts 정리

**소켓 new_message (§4-5)**

- ✅ roomId 일치 확인
- ✅ clientId 기반 temp→server 교체 (`REPLACE_TEMP_MESSAGE`)
- ✅ `pendingClientIdTimeoutsRef` 타이머 정리
- ✅ 상대 메시지 수신 시 `markRead` 호출
- ✅ `meIdRef.current`로 normalize

**read_receipt (§4-6)**

- ✅ `read_receipt` 리스너
- ✅ `MARK_MY_READ` dispatch

**폴링 (§4-7)**

- ✅ `startPolling()` / `stopPolling()`
- ✅ 소켓 connect→폴링 중지, disconnect/connect_error→폴링 시작
- ✅ `MERGE_POLL_MESSAGES` (optimistic 보호 union)

**캐시 저장 debounce (§4-8)**

- ✅ `cacheSaveTimeoutRef`로 500ms debounce

**sendMessage (§4-9)**

- ✅ optimistic 메시지 전체 필드 (clientId, senderId, dateKey, time, isReadByOther 등)
- ✅ FormData에 `clientId` append
- ✅ 5초 딜레이 교체 전략 (`pendingClientIdTimeoutsRef` + `REPLACE_TEMP_MESSAGE`)
- ✅ 실패 시 `UPDATE_MESSAGE`로 failed 전환

**retryMessage (§4-10)**

- ✅ 같은 clientId 재사용 + status 토글
- ✅ FormData에 clientId append
- ✅ 5초 딜레이 교체 전략

**deleteMessage (§4-11)**

- ✅ `temp_` 접두사 방지 체크
- ✅ 실패 시 `Alert.alert`
- ✅ try/catch 포함

**loadMore (§4-12)**

- ✅ `oldestIdRef` 사용
- ✅ `ADD_MESSAGES_PREPEND` (앞에 prepend)
- ✅ 서버 DESC→ASC reverse
- ✅ 빈 응답 시 hasMore false + 즉시 return
- ✅ 가장 작은 ID 추적 (`Math.min(...)`)

---

## Phase 2: 어댑터 훅 → 원본 훅 교체

### 2-1. chat/hooks/useChat.js (chat.md §5-1)

- ✅ `useChatCore` 호출하는 래퍼 구조
- ✅ API 경로 `/api/messages/*` 올바름
- ✅ `useNotification()` → `refreshHasUnread` 전달
- ✅ meId 추출: `room.user1_id/user2_id/other_user_id`로 계산 + `useState`
- ✅ `signal` 파라미터 전달 (AbortController 지원)
- ✅ sendMessage: `(roomId, formData)` — FormData 직접 수신
- ✅ `markRead` / `markNotificationRead` 포함
- ✅ `fetchMore`: `(roomId, beforeId, limit)` 시그니처

### 2-2. chat/hooks/useDMChat.js (chat.md §5-2)

- ✅ `useChatCore` 호출하는 래퍼 구조
- ✅ API 경로 `/api/dm/*` 올바름
- ✅ `/api/auth/me` → `Promise.all`로 meId 획득 + `useState`
- ✅ `useNotification()` → `refreshHasUnread` 전달
- ✅ `signal` 파라미터 전달
- ✅ sendMessage: `(roomId, formData)` — FormData 직접 수신
- ✅ `markRead` / `markNotificationRead` 포함 (`.catch(() => {})` 포함)

### 2-3. 원본 훅 축소

- ✅ `hooks/useChat.js` — `export { default } from '../chat/hooks/useChat'` (1줄)
- ✅ `hooks/useDMChat.js` — `export { default } from '../chat/hooks/useDMChat'` (1줄)

---

## Phase 3: UI 레이어 이식

### 3-1. useChatScroll.js (chat.md §6 — 핵심)

**ref 관리 (§6-1)**

- ✅ `listRef`, `currentOffsetRef`, `contentHeightRef`, `isNearBottomRef`
- ✅ `isScrollingRef`, `scrollAnimationRef`, `prevNewestIdRef`
- ✅ `isLoadingMoreRef`, `loadOlderAllowedRef`, `didListShellLayoutRef`
- ✅ `didInitialAnchorRef`, `isInitialLoadRef`, `keyboardTimeoutRef`

**roomId 변경 시 ref 초기화 (§6-2)**

- ✅ 모든 ref 초기화 + `setListShellVisible(false)`

**스크롤 이벤트 핸들러 (§6-3)**

- ✅ `isScrollingRef` 150ms debounce
- ✅ `currentOffsetRef` / `contentHeightRef` 업데이트
- ✅ threshold: `Math.max(80, viewportH * 0.1)` 뷰포트 비례

**새 메시지 자동 스크롤 (§6-4)**

- ✅ `prevNewestIdRef` 기반 새 메시지 감지
- ✅ `isMe || isNearBottom` + `!isScrolling` 조건부 scrollToEnd

**키보드 이벤트 (§6-5)**

- ✅ `Keyboard.addListener` (iOS: keyboardWillShow/Hide, Android: keyboardDidShow/Hide)
- ✅ `keyboardHeight` 상태
- ✅ 키보드 show 시 isNearBottom이면 scrollToEnd

**초기 앵커링 + opacity (§6-6)**

- ✅ `listShellVisible` 상태 + `handleListShellLayout`
- ✅ `didInitialAnchorRef` 기반 scrollToEnd(animated:false)
- ✅ `loadOlderAllowedRef` 활성화

**과거 로딩 handleStartReached (§6-7)**

- ✅ `loadOlderAllowedRef` 기반 오호출 방지
- ✅ `isLoadingMoreRef` 기반 500ms 쿨다운

### 3-2. useChatUI.js (chat.md §6, §9)

- ✅ `replyToMessage` / `setReplyToMessage`
- ✅ `longPressMenu` / `setLongPressMenu` / `openLongPressMenu`
- ✅ `viewerUri` / `setViewerUri`
- ✅ `toastText` / `showChatToast` (2초 자동 소멸 타이머)

### 3-3. 컴포넌트들

**MessageList.jsx (chat.md §8)**

- ✅ FlashList 기본 구조 + `getItemType` / `keyExtractor` / `renderItem`
- ✅ `key={roomId}` — roomId 변경 시 리스트 리셋
- ✅ `extraData={messages.length}`
- ✅ `estimatedItemSize={90}`
- ✅ `drawDistance={1000}`
- ✅ `overrideItemLayout` + `estimateRowHeight` (정밀 높이 추정)
- ✅ `maxToRenderPerBatch={8}` / `windowSize={7}` / `initialNumToRender={20}`
- ✅ `removeClippedSubviews={true}` / `disableAutoLayout={true}`
- ✅ `initialScrollIndex` (맨 아래 시작)
- ✅ `maintainVisibleContentPosition={{ minIndexForVisible: 0 }}`
- ✅ `ListHeaderComponent` (isLoadingMore 스피너)
- ✅ `keyboardShouldPersistTaps="handled"` / `keyboardDismissMode="on-drag"`
- ✅ `onContentSizeChange` / `onScroll` / `showsVerticalScrollIndicator={false}`
- ✅ opacity 제어 (`listShellVisible`) + `onLayout={handleListShellLayout}` — MessageList 내부로 통합

**MessageItem.jsx (chat.md §8-3)**

- ✅ 원본 `components/chat/MessageItem` 래핑
- ✅ `React.memo` — 10개 필드 비교 (id, status, isSending, isFailed, is_deleted, content, isReadByOther, showProfile, showTimestamp, images.length)

**DateBanner.jsx (chat.md §12)**

- ✅ `formatBannerDate` — "오늘"/"어제"/"M월 D일"
- ✅ `normalize` 적용
- ✅ `fonts.regular` 적용

**MessageInput.jsx (chat.md §9-6, §9-8)**

- ✅ CommentInput 래핑
- ✅ 키보드 높이 연동 `paddingBottom`
- ✅ DM 전용 `mainPlaceholder` 지원
- ✅ DM 전용 `chatInputStyles` 지원
- ✅ 입력 영역 상단 구분선 (`borderTopWidth`)

**미생성 컴포넌트**

- ✅ `PostCard.jsx` — Phase 4에서 생성 완료
- ✅ `ChatToast.jsx` — ChatScreen 내 인라인 구현으로 대체 (별도 파일 불필요)

### 3-4. ChatScreen.jsx (chat.md §9)

**레이아웃 (§9-1)**

- ✅ SafeAreaView + SubHeader

**KeyboardAvoidingView (§9-2)**

- ✅ KAV + `behavior` + `keyboardVerticalOffset`

**로딩 화면 (§9-3)**

- ✅ `isLoading && messages.length === 0` → Loading 컴포넌트

**opacity 제어 (§9-4)**

- ✅ MessageList 내 `listShellVisible` 기반 `opacity: 0 → 1`

**flatData 생성 (§9-5)**

- ✅ `withMessageGroupFlags` → `injectDateBanners` (messageUtils.js에서 import, 중복 제거)

**답장 프리뷰 (§9-6)**

- ✅ `chatStyles.replyPreviewContainer` 기반 UI + Ionicons `close-circle`

**토스트 (§9-7)**

- ✅ `toastText` + 인라인 토스트 UI

**입력 paddingBottom (§9-8)**

- ✅ `keyboardHeight` / `insets.bottom` 기반 padding

**handlePressReplyTarget (§9-9)**

- ✅ flatData에서 인덱스 찾아 scrollToIndex + 토스트 fallback

**handleCopyMessage**

- ✅ `Clipboard.setStringAsync` + `showChatToast`

**useChatHook 호출 시그니처**

- ✅ `useChatHook(hookConfig.roomId, hookConfig.socket)` — 2개 인자 전달 (이전 버그 수정)

---

## Phase 4: 스크린 교체

### 4-1. ChatRoomScreen.jsx (chat.md §11)

- ✅ roomId 추출 + ChatScreen 호출
- ✅ headerConfig `title: '쪽지'` + `onBack`
- ✅ `chatType="room"` 전달
- ✅ `navigation` 전달
- ✅ PostCard — ChatScreen 내에서 `chatType === 'room'`일 때 자동 렌더링

### 4-2. DMChatScreen.jsx (chat.md §10)

**헤더 (§10-1)**

- ✅ `MessageTabIcon` SVG 아이콘 적용 (원본 완전 보존)
- ✅ `getFriendIconColorByIndex(friend.colorIndex)` 색상 분기
- ✅ normalize 적용된 크기/간격 (`36/18/22/10`)
- ✅ `fonts.bold` / `fonts.regular` 적용
- ✅ `friend.schoolName || friend.school` 조건부 표시
- ✅ `useMemo`로 titleElement 최적화

**DM 전용 props (§10-2)**

- ✅ `mainPlaceholder="메시지를 입력하세요"` → MessageInput에 전달

### 4-3. PostCard.jsx (chat.md §11-1, Chat.jsx에서 이식)

- ✅ 게시글 로드 API (`/api/messages/rooms/${roomId}?limit=1` → `room.post_id`)
- ✅ 게시글 상세 API (`/api/posts/${postId}`)
- ✅ `postCache` 캐싱
- ✅ 카드 UI (author, likes, comments, thumbnail, content)
- ✅ `FontAwesome` heart + `Ionicons` chatbubble
- ✅ `onPress` → `navigation.navigate('BoardDetail', ...)`

### 4-4. 원본 파일 껍데기화

- ✅ `Chat.jsx` — 6줄 (`return <ChatRoomScreen {...props} />`)
- ✅ `DMChat.jsx` — 6줄 (`return <DMChatScreen {...props} />`)

---

## 핵심 원칙 체크 (chat.md §0)

### 0-1. 디자인 보존

- ✅ `normalize`, `chatStyles`, `detailStyles` 전부 사용됨
- ✅ DM 헤더 아바타 + fonts 적용
- ✅ DateBanner `fonts.regular` + `normalize` 적용

### 0-2. 성능 코드 보존

- ✅ `maintainVisibleContentPosition` 적용
- ✅ `overrideItemLayout` + `estimateRowHeight` 적용
- ✅ `listShellVisible` opacity 패턴 적용
- ✅ `initialScrollIndex` 적용
- ✅ `loadOlderAllowedRef` 적용
- ✅ `drawDistance`, `maxToRenderPerBatch`, `windowSize` 적용
- ✅ `disableAutoLayout` 적용

### 0-3. 중복 제거

- ✅ `injectDateBanners` — `messageUtils.js` 단일 소스 (ChatScreen 중복 제거)
- ✅ 원본 hooks → re-export 1줄로 축소
- ✅ 원본 화면 → 껍데기화 완료 (Chat.jsx 6줄, DMChat.jsx 6줄)

### 0-4. 사이드 이펙트 규칙

- ✅ `useMemo` 안 `setState` 패턴 새 코드에서는 없음
- ✅ `useEffect` + `dispatch(TRIM_MESSAGES)` 패턴 적용됨

---

## 오류 최소화 (chat.md §13)

### 13-1. 위험 패턴 수정

- ✅ 새 구조에서 `useMemo` 안 `setState` 없음
- ✅ `setChatData` 연속 호출 → `useReducer` 단일 dispatch로 통합 완료
- ✅ `AbortController` 적용 (useChatCore)
- ✅ `useReducer` dispatch는 unmount 후에도 안전 + `isMounted` 체크 병용

### 13-2. import 경로

- ✅ `chat/hooks/ → ../../../../utils/api` 경로 수정됨 (이전 번들 에러 해결)
- ✅ `chat/screens/ → ../../../../styles/*` 경로 수정됨
- ✅ `chat/components/ → ../../../../components/*` 경로 수정됨

---

## 최종 요약

### Phase별 완성도

| Phase       | 항목               | ✅      | ⚠     | ❌    |
| ----------- | ------------------ | ------- | ----- | ----- |
| **Phase 1** | 데이터 레이어      | **53**  | **0** | **0** |
| **Phase 2** | 어댑터 + 원본 축소 | **16**  | **0** | **0** |
| **Phase 3** | UI 레이어          | **57**  | **0** | **0** |
| **Phase 4** | 스크린 교체        | **17**  | **0** | **0** |
| **원칙**    | §0 + §13           | **16**  | **0** | **0** |
| **합계**    |                    | **159** | **0** | **0** |

### 완성률: **100% (159/159)** ← 전체 리팩토링 완료

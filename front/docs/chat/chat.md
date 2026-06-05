# 채팅 시스템 리팩토링 가이드 (v2)

> 원본 코드의 정교한 성능/UX 코드를 보존하면서, 구조만 분리하여 유지보수성을 높인다.
> "동작하는 코드를 깨뜨리지 않으면서 구조를 개선한다"가 핵심 원칙이다.

---

## 0. 핵심 원칙

### 0-1. 디자인은 건드리지 않는다

- 색상, 폰트, 간격, 그림자, 아이콘 — 원본 그대로 이식
- `normalize()`, `chatStyles`, `detailStyles`, `fonts`, `colors` 전부 유지
- DM 헤더의 `MessageTabIcon` + `getFriendIconColorByIndex` 완전 보존

### 0-2. 성능 코드는 원본이 정답이다

- `maintainVisibleContentPosition`, `overrideItemLayout`, `estimateRowHeight` → 원본 그대로 이식
- `listShellVisible` opacity 패턴, `initialScrollIndex`, `loadOlderAllowedRef` → 삭제 금지
- `drawDistance`, `maxToRenderPerBatch`, `windowSize` → 원본 값 유지

### 0-3. 중복은 한쪽에서만 존재해야 한다

- 기능이 새 구조로 이식 완료되면, 원본에서 해당 코드를 반드시 제거
- 이식 전까지는 원본 코드를 건드리지 않는다 (점진적 교체)

### 0-4. 사이드 이펙트는 무조건 useEffect

- `useMemo` 안에서 `setState` 절대 금지
- `setTimeout`으로 상태 변경하는 패턴 → `useEffect` + `dispatch`로 교체

---

## 1. 폴더 구조

```
chat/
  components/
    MessageList.jsx       ← FlashList + 모든 튜닝 옵션
    MessageItem.jsx       ← 원본 MessageItem 래핑 + 정밀 memo
    MessageInput.jsx      ← CommentInput 래핑 + 답장 프리뷰
    MessageActions.jsx    ← MessageLongPressMenu 래핑
    DateBanner.jsx        ← 날짜 배너 (오늘/어제/M월 D일)
    ImageViewer.jsx       ← ImageViewer 래핑
    PostCard.jsx          ← Chat 전용 게시글 카드 (새로 분리)
    ChatToast.jsx         ← 2초 자동소멸 토스트

  hooks/
    useChatCore.js        ← 데이터 엔진 (reducer + 소켓 + 폴링 + 캐시 + 읽음)
    useChatScroll.js      ← 스크롤 시스템 (원본의 모든 ref 로직 이관)
    useChatUI.js          ← UI 상태 (reply, longPress, toast, viewer, input)
    chatReducer.js        ← 상태 리듀서
    useChat.js            ← Chat용 어댑터 (얇은 래퍼)
    useDMChat.js          ← DM용 어댑터 (얇은 래퍼)

  screens/
    ChatScreen.jsx        ← 공통 화면 (KAV + 레이아웃 + 로딩)
    ChatRoomScreen.jsx    ← Chat.jsx 대체
    DMChatScreen.jsx      ← DMChat.jsx 대체

  utils/
    normalizeMessage.js   ← 메시지 정규화
    messageUtils.js       ← 그룹핑 + 날짜배너 삽입
    cacheManager.js       ← AsyncStorage 캐시

  constants/
    chatConfig.js         ← 상수 (MEMORY_LIMIT, PAGE_SIZE 등)
```

---

## 2. 작업 순서 (점진적 교체 — 반드시 이 순서)

### Phase 1: 데이터 레이어 완성

1. `chatReducer.js` — 원본 상태 구조 완전 반영
2. `normalizeMessage.js` — `isReadByOther`/`isReadByMe` 포함
3. `cacheManager.js` — `INITIAL_FETCH_LIMIT` 슬라이싱 포함
4. `messageUtils.js` — 원본 `sameMessageSender` + `withMessageGroupFlags` + `injectDateBanners`
5. `useChatCore.js` — 원본 useChat/useDMChat의 모든 기능을 config 기반으로 통합

### Phase 2: 어댑터 훅 → 원본 훅 교체

6. `chat/hooks/useChat.js` — meId 추출, 소켓/읽음/알림 config 완성
7. `chat/hooks/useDMChat.js` — /api/auth/me, 소켓/읽음/알림 config 완성
8. `hooks/useChat.js` → `chat/hooks/useChat.js`를 re-export하는 한 줄로 축소
9. `hooks/useDMChat.js` → `chat/hooks/useDMChat.js`를 re-export하는 한 줄로 축소
10. 이 시점에서 앱 동작 검증 (데이터 레이어 교체 완료)

### Phase 3: UI 레이어 이식

11. `useChatScroll.js` — 원본의 모든 ref/스크롤 로직 이관
12. `useChatUI.js` — toast, reply, longPress, viewer, input 상태
13. 컴포넌트들 생성 (MessageList, MessageInput, PostCard, ChatToast 등)
14. `ChatScreen.jsx` — KAV + 전체 레이아웃 조립

### Phase 4: 스크린 교체

15. `ChatRoomScreen.jsx` — 게시글 카드 포함
16. `DMChatScreen.jsx` — 친구 헤더 포함
17. `Chat.jsx` → `return <ChatRoomScreen />`으로 축소
18. `DMChat.jsx` → `return <DMChatScreen />`으로 축소

---

## 3. chatReducer.js

### 3-1. 상태 구조

```js
export const initialState = {
  messagesById: {}, // { [id]: normalizedMessage }
  messageIds: [], // 시간순(ASC) 정렬된 id 배열
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
};
```

### 3-2. 액션 목록

| 액션                   | 용도                                                 |
| ---------------------- | ---------------------------------------------------- |
| `SET_MESSAGES`         | 초기 로딩 — 완전 교체                                |
| `ADD_MESSAGES_PREPEND` | 페이징(과거 로드) — 앞에 prepend                     |
| `ADD_MESSAGE`          | 소켓/optimistic — 뒤에 append (dedupe)               |
| `UPDATE_MESSAGE`       | 부분 업데이트 (status 변경 등)                       |
| `REPLACE_TEMP_MESSAGE` | clientId → serverId 교체 (id 변경 + 데이터 업데이트) |
| `DELETE_MESSAGE`       | 소프트 삭제 (is_deleted: true)                       |
| `REMOVE_MESSAGE`       | id 기반 완전 제거                                    |
| `TRIM_MESSAGES`        | MEMORY_LIMIT 초과 시 오래된 메시지 제거              |
| `MARK_ALL_READ`        | 내가 아닌 메시지 전부 isReadByMe: true               |
| `MARK_MY_READ`         | 내 메시지 전부 isReadByOther: true                   |
| `SET_LOADING`          | 초기 로딩 상태                                       |
| `SET_LOADING_MORE`     | 페이징 로딩 상태                                     |
| `SET_HAS_MORE`         | 더보기 가능 여부                                     |
| `RESET`                | roomId 변경 시 전체 초기화                           |

### 3-3. 핵심 구현 — REPLACE_TEMP_MESSAGE (원본 핵심 로직)

```js
case 'REPLACE_TEMP_MESSAGE': {
  const { tempId, serverMessage } = action.payload;
  if (!state.messagesById[tempId]) return state;

  const { [tempId]: removed, ...restById } = state.messagesById;
  const tempMsg = removed;

  return {
    ...state,
    messagesById: {
      ...restById,
      [serverMessage.id]: {
        ...serverMessage,
        // 원본의 reply 정보 보존 (서버 응답에 없을 수 있음)
        parent_message_id: serverMessage.parent_message_id ?? tempMsg.parent_message_id ?? null,
        parent_content: serverMessage.parent_content ?? tempMsg.parent_content ?? null,
        parent_sender_name: serverMessage.parent_sender_name ?? tempMsg.parent_sender_name ?? null,
        status: 'sent',
        isSending: false,
        isFailed: false,
      },
    },
    messageIds: state.messageIds.map(id => id === tempId ? serverMessage.id : id),
  };
}
```

### 3-4. 핵심 구현 — ADD_MESSAGES_PREPEND (페이징)

```js
case 'ADD_MESSAGES_PREPEND': {
  const { messages } = action.payload;
  const newById = { ...state.messagesById };
  const newIds = [];

  messages.forEach(msg => {
    if (!newById[msg.id]) {
      newById[msg.id] = msg;
      newIds.push(msg.id);
    }
  });

  // 과거 데이터를 앞에 prepend — 가시 영역 인덱스가 안 흔들림
  const newIdSet = new Set(newIds);
  const mergedIds = [
    ...newIds,
    ...state.messageIds.filter(id => !newIdSet.has(id)),
  ];

  return {
    ...state,
    messagesById: newById,
    messageIds: mergedIds,
    isLoadingMore: false,
  };
}
```

### 3-5. useMemo→setState 패턴 제거

원본의 `useMemo` 안 `setTimeout(() => setChatData(...))` → `useEffect` + `dispatch({ type: 'TRIM_MESSAGES' })`

```js
// useChatCore 내부
useEffect(() => {
  if (state.messageIds.length > MEMORY_LIMIT) {
    dispatch({ type: 'TRIM_MESSAGES', payload: MEMORY_LIMIT });
  }
}, [state.messageIds.length]);
```

---

## 4. useChatCore.js — 데이터 엔진

### 4-1. 인터페이스

```js
export default function useChatCore(config) {
  // config 구조:
  // {
  //   roomId,
  //   meId,              ← 어댑터에서 주입 (Chat: room에서 계산, DM: /api/auth/me)
  //   api: {
  //     fetchMessages(roomId, limit, signal),
  //     fetchMore(roomId, beforeId, limit, signal),
  //     sendMessage(roomId, formData),
  //     deleteMessage(messageId),
  //     markRead(roomId),
  //     markNotificationRead(relatedType, relatedId),
  //   },
  //   socket,            ← socketManager
  //   cacheScope,        ← 'chat' | 'dm' (캐시 키 분리)
  //   refreshHasUnread,  ← useNotification()에서 가져온 함수
  // }

  return {
    messages, // normalized array (시간순 ASC)
    isLoading,
    isLoadingMore,
    hasMore,
    meId,
    sendMessage,
    retryMessage,
    deleteMessage,
    loadMore,
  };
}
```

### 4-2. 메시지 정렬 — 원본 방식 유지 (ID 기반)

```js
const getMessageSortValue = (msg) => {
  if (!msg) return Number.MIN_SAFE_INTEGER;
  const idNum = Number(msg.id);
  if (!Number.isNaN(idNum)) return idNum;
  const t = Date.parse(msg.createdAt || '');
  if (!Number.isNaN(t)) return t;
  return Number.MIN_SAFE_INTEGER;
};

const messages = useMemo(() => {
  const arr = state.messageIds
    .map((id) => state.messagesById[id])
    .filter(Boolean);
  arr.sort((a, b) => getMessageSortValue(a) - getMessageSortValue(b));
  return arr;
}, [state.messageIds, state.messagesById]);
```

### 4-3. 초기 로딩 — InteractionManager + AbortController (원본 보존)

```js
useEffect(() => {
  if (!roomId) return;
  let isMounted = true;

  // roomId 변경 시 즉시 초기화
  dispatch({ type: 'RESET' });
  oldestIdRef.current = null;

  const controller = new AbortController();
  abortControllerRef.current = controller;

  InteractionManager.runAfterInteractions(() => {
    if (!isMounted || controller.signal.aborted) return;

    (async () => {
      try {
        // 1) 캐시 먼저 표시
        const cached = await loadCache(config.cacheScope, roomId);
        if (cached && isMounted && !controller.signal.aborted) {
          dispatch({ type: 'SET_MESSAGES', payload: { messages: cached.messages, hasMore: true } });
          oldestIdRef.current = cached.messages[0]?.id ?? null;
        }

        // 2) API 최신 데이터로 교체
        const res = await config.api.fetchMessages(roomId, INITIAL_FETCH_LIMIT, controller.signal);
        if (controller.signal.aborted || !isMounted) return;

        const meId = config.meId;  // 어댑터에서 이미 계산하여 전달
        const normalized = res.messages.map(m => normalizeMessage(m, meId));
        // 서버 DESC → 시간순 ASC
        normalized.reverse();

        dispatch({
          type: 'SET_MESSAGES',
          payload: { messages: normalized, hasMore: res.hasMore },
        });
        oldestIdRef.current = normalized[0]?.id ?? null;

        // 3) 읽음 처리
        try {
          await config.api.markRead(roomId);
          dispatch({ type: 'MARK_ALL_READ' });
          await config.api.markNotificationRead?.(...);
          config.refreshHasUnread?.();
        } catch { /* ignore */ }

      } catch (error) {
        if (isMounted) Alert.alert('오류', error?.response?.data?.message || '채팅 내역을 불러오는 중 오류가 발생했습니다.');
      } finally {
        if (isMounted) dispatch({ type: 'SET_LOADING', payload: false });
      }
    })();
  });

  return () => { isMounted = false; };
}, [roomId]);
```

### 4-4. 소켓 연결 — 원본 패턴 완전 보존

```js
useEffect(() => {
  if (!roomId || !config.socket) return;
  let isMounted = true;

  // 이벤트 핸들러 레퍼런스 (cleanup용)
  let handlers = {};

  const connect = async () => {
    await config.socket.connectSocket(roomId);
    if (!isMounted) return;

    handlers = {
      connect: () => stopPolling(),
      disconnect: () => { if (isMounted) startPolling(); },
      connect_error: () => { if (isMounted) startPolling(); },
      new_message: handleSocketNewMessage,
      read_receipt: handleSocketReadReceipt,
    };

    Object.entries(handlers).forEach(([event, fn]) => {
      config.socket.on(event, fn);
    });
  };

  connect();

  return () => {
    isMounted = false;
    Object.entries(handlers).forEach(([event, fn]) => {
      config.socket.off(event, fn);
    });
    // 대기 중인 clientId 타이머 정리
    pendingClientIdTimeoutsRef.current.forEach(t => clearTimeout(t));
    pendingClientIdTimeoutsRef.current.clear();
    config.socket.disconnectSocket?.();
    stopPolling();
  };
}, [roomId, config.socket, ...]);
```

### 4-5. 소켓 new_message 핸들러 — clientId 매칭 포함 (원본 핵심)

```js
const handleSocketNewMessage = useCallback(
  (payload) => {
    if (!payload?.message) return;
    if (String(payload.message.room_id) !== String(roomId)) return;

    const newMsg = normalizeMessage(payload.message, meIdRef.current);

    // clientId 기반 대기 타이머 정리
    if (newMsg.clientId) {
      const key = String(newMsg.clientId);
      const tid = pendingClientIdTimeoutsRef.current.get(key);
      if (tid) {
        clearTimeout(tid);
        pendingClientIdTimeoutsRef.current.delete(key);
      }
    }

    // temp→server 교체 or 신규 추가
    if (newMsg.clientId && state.messagesById[String(newMsg.clientId)]) {
      dispatch({
        type: 'REPLACE_TEMP_MESSAGE',
        payload: { tempId: String(newMsg.clientId), serverMessage: newMsg },
      });
    } else {
      dispatch({ type: 'ADD_MESSAGE', payload: newMsg });
    }

    // 상대 메시지 수신 시 읽음 처리
    if (!newMsg.isMe) {
      config.api.markRead(roomId).catch(() => {});
    }
  },
  [roomId],
);
```

### 4-6. read_receipt 핸들러

```js
const handleSocketReadReceipt = useCallback(
  (payload) => {
    if (String(payload.roomId) !== String(roomId)) return;
    dispatch({ type: 'MARK_MY_READ' });
  },
  [roomId],
);
```

### 4-7. 폴링 — 소켓 fallback (원본 보존)

```js
const startPolling = useCallback(() => {
  if (pollRef.current || !roomId) return;
  pollRef.current = setInterval(async () => {
    try {
      const res = await config.api.fetchMessages(roomId, PAGE_SIZE * 2);
      const meId = meIdRef.current;
      const mapped = res.messages.map((m) => normalizeMessage(m, meId));

      // optimistic 메시지 보호: isSending/isFailed는 서버 데이터로 덮지 않음
      dispatch({
        type: 'MERGE_POLL_MESSAGES', // 새 액션: 기존 optimistic 보호하면서 union
        payload: { messages: mapped },
      });
    } catch (e) {
      console.error('[Poll] 오류:', e);
    }
  }, 10000);
}, [roomId]);
```

### 4-8. 캐시 저장 debounce (원본 보존)

```js
useEffect(() => {
  if (!roomId) return;
  if (cacheSaveTimeoutRef.current) clearTimeout(cacheSaveTimeoutRef.current);

  cacheSaveTimeoutRef.current = setTimeout(() => {
    saveCache(config.cacheScope, roomId, state.messagesById, state.messageIds);
  }, 500);

  return () => {
    if (cacheSaveTimeoutRef.current) clearTimeout(cacheSaveTimeoutRef.current);
  };
}, [roomId, state.messagesById, state.messageIds]);
```

### 4-9. sendMessage — Optimistic UI + 5초 딜레이 교체 (원본 핵심)

```js
const sendMessage = useCallback(
  async ({ text, images, replyTo }) => {
    if (!roomId) return;
    const trimmed = (text ?? '').trim();
    const imgArr = Array.isArray(images) ? images : [];
    if (!trimmed && imgArr.length === 0) return;

    const clientId = `temp_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const d = parseUtcToLocal(nowIso);

    // 1) Optimistic 메시지 즉시 표시
    const optimisticMsg = {
      id: clientId,
      clientId,
      type: 'message',
      isMe: true,
      senderId: meIdRef.current != null ? Number(meIdRef.current) : null,
      content: trimmed || null,
      images: [...imgArr],
      is_deleted: false,
      createdAt: nowIso,
      dateKey: getDateKey(d),
      time: formatChatTime(nowIso),
      parent_message_id: replyTo?.id ? String(replyTo.id) : null,
      parent_content: replyTo?.content ?? null,
      parent_sender_name: replyTo?.senderName ?? null,
      isReadByOther: false,
      isReadByMe: undefined,
      isSending: true,
      isFailed: false,
      status: 'sending',
    };
    dispatch({ type: 'ADD_MESSAGE', payload: optimisticMsg });

    try {
      // 2) FormData에 clientId 포함 (서버→소켓 매칭용)
      const formData = new FormData();
      if (trimmed) formData.append('content', trimmed);
      imgArr.forEach((uri, i) => {
        formData.append('images', {
          uri,
          type: 'image/jpeg',
          name: `image_${i}.jpg`,
        });
      });
      formData.append('clientId', clientId);
      if (replyTo?.id) formData.append('parent_message_id', String(replyTo.id));

      const res = await config.api.sendMessage(roomId, formData);
      const serverMsg = normalizeMessage(res, meIdRef.current);

      // 3) 소켓으로 먼저 올 수 있으므로 5초 대기 후 교체
      const timeoutId = setTimeout(() => {
        dispatch({
          type: 'REPLACE_TEMP_MESSAGE',
          payload: { tempId: clientId, serverMessage: serverMsg },
        });
        pendingClientIdTimeoutsRef.current.delete(clientId);
      }, 5000);

      pendingClientIdTimeoutsRef.current.set(clientId, timeoutId);
    } catch (error) {
      // 4) 실패 → failed 상태로 전환
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          id: clientId,
          updates: { isSending: false, isFailed: true, status: 'failed' },
        },
      });
    }
  },
  [roomId],
);
```

### 4-10. retryMessage — 원본 동작 보존 (같은 clientId 재사용)

```js
const retryMessage = useCallback(
  async (failedMsg) => {
    if (!roomId) return;
    const clientId = String(failedMsg?.clientId ?? failedMsg?.id);
    const text = String(failedMsg?.content ?? '').trim();
    const images = Array.isArray(failedMsg?.images) ? failedMsg.images : [];
    if (!text && images.length === 0) return;

    // sending 상태로 복원
    dispatch({
      type: 'UPDATE_MESSAGE',
      payload: {
        id: clientId,
        updates: { isSending: true, isFailed: false, status: 'sending' },
      },
    });

    try {
      const formData = new FormData();
      if (text) formData.append('content', text);
      images.forEach((uri, i) => {
        formData.append('images', {
          uri,
          type: 'image/jpeg',
          name: `image_${i}.jpg`,
        });
      });
      formData.append('clientId', clientId);
      if (failedMsg?.parent_message_id) {
        formData.append(
          'parent_message_id',
          String(failedMsg.parent_message_id),
        );
      }

      const res = await config.api.sendMessage(roomId, formData);
      const serverMsg = normalizeMessage(res, meIdRef.current);

      const timeoutId = setTimeout(() => {
        dispatch({
          type: 'REPLACE_TEMP_MESSAGE',
          payload: { tempId: clientId, serverMessage: serverMsg },
        });
        pendingClientIdTimeoutsRef.current.delete(clientId);
      }, 5000);

      pendingClientIdTimeoutsRef.current.set(clientId, timeoutId);
    } catch {
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          id: clientId,
          updates: { isSending: false, isFailed: true, status: 'failed' },
        },
      });
    }
  },
  [roomId],
);
```

### 4-11. deleteMessage — temp 방지 + Alert (원본 보존)

```js
const deleteMessage = useCallback(async (messageId) => {
  if (String(messageId).startsWith('temp_')) return;
  try {
    await config.api.deleteMessage(String(messageId));
    dispatch({
      type: 'UPDATE_MESSAGE',
      payload: { id: String(messageId), updates: { is_deleted: true } },
    });
  } catch {
    Alert.alert('오류', '메시지 삭제에 실패했습니다.');
  }
}, []);
```

### 4-12. loadMore — oldestIdRef + prepend 방식 (원본 보존)

```js
const loadMore = useCallback(async () => {
  if (!roomId || !hasMore || isLoadingMore) return;
  if (!oldestIdRef.current) return;

  dispatch({ type: 'SET_LOADING_MORE', payload: true });

  try {
    const res = await config.api.fetchMore(
      roomId,
      oldestIdRef.current,
      PAGE_SIZE,
    );
    const msgs = res.messages;

    if (!msgs.length) {
      dispatch({ type: 'SET_HAS_MORE', payload: false });
      dispatch({ type: 'SET_LOADING_MORE', payload: false });
      return;
    }

    const meId = meIdRef.current;
    const mapped = msgs.map((m) => normalizeMessage(m, meId));
    const chronological = [...mapped].reverse(); // 서버 DESC → ASC

    dispatch({
      type: 'ADD_MESSAGES_PREPEND',
      payload: { messages: chronological },
    });

    // 가장 작은 ID 추적
    const minId = Math.min(...mapped.map((m) => Number(m.id)));
    if (minId && minId !== Infinity) oldestIdRef.current = minId.toString();

    dispatch({ type: 'SET_HAS_MORE', payload: Boolean(res.hasMore) });
  } catch (e) {
    console.error('[Pagination] 실패:', e);
  } finally {
    dispatch({ type: 'SET_LOADING_MORE', payload: false });
  }
}, [roomId, hasMore, isLoadingMore]);
```

---

## 5. useChat.js / useDMChat.js — 어댑터 (얇은 래퍼)

### 5-1. useChat.js

```js
export default function useChat(roomId, socket) {
  const { refreshHasUnread } = useNotification();
  const [meId, setMeId] = useState(null);

  // meId는 첫 API 응답에서 추출 (room.user1_id/user2_id/other_user_id)
  const apiAdapter = useMemo(
    () => ({
      fetchMessages: async (roomId, limit, signal) => {
        const res = await api.get(
          `/api/messages/rooms/${roomId}?limit=${limit}`,
          { signal },
        );
        const room = res.data?.room;
        const otherId = room?.other_user_id;
        const calculatedMeId =
          room?.user1_id === otherId
            ? room?.user2_id
            : room?.user2_id === otherId
              ? room?.user1_id
              : null;
        setMeId(calculatedMeId);
        return {
          messages: res.data?.data || [],
          hasMore: Boolean(res.data?.hasMore),
          room,
        };
      },
      fetchMore: async (roomId, beforeId, limit) => {
        const res = await api.get(
          `/api/messages/rooms/${roomId}?before=${beforeId}&limit=${limit}`,
        );
        return {
          messages: res.data?.data || [],
          hasMore: Boolean(res.data?.hasMore),
        };
      },
      sendMessage: async (roomId, formData) => {
        const res = await api.post(
          `/api/messages/rooms/${roomId}/messages`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          },
        );
        return res.data?.data;
      },
      deleteMessage: (id) => api.delete(`/api/messages/${id}`),
      markRead: (roomId) => api.put(`/api/messages/rooms/${roomId}/read`),
      markNotificationRead: () =>
        api
          .post('/api/notifications/read-by-related', {
            relatedType: 'message_room',
            relatedId: roomId,
          })
          .catch(() => {}),
    }),
    [roomId],
  );

  return useChatCore({
    roomId,
    meId,
    api: apiAdapter,
    socket,
    cacheScope: 'chat',
    refreshHasUnread,
  });
}
```

### 5-2. useDMChat.js

```js
export default function useDMChat(roomId, socket) {
  const { refreshHasUnread } = useNotification();
  const [meId, setMeId] = useState(null);

  const apiAdapter = useMemo(
    () => ({
      fetchMessages: async (roomId, limit, signal) => {
        const [res, meRes] = await Promise.all([
          api.get(`/api/dm/rooms/${roomId}?limit=${limit}`, { signal }),
          api.get('/api/auth/me', { signal }),
        ]);
        const mePayload = meRes.data?.data;
        const calculatedMeId = Number(mePayload?.id ?? mePayload?.userId);
        if (!Number.isNaN(calculatedMeId)) setMeId(calculatedMeId);
        return {
          messages: res.data?.data || [],
          hasMore: Boolean(res.data?.hasMore),
          room: res.data?.room,
        };
      },
      fetchMore: async (roomId, beforeId, limit) => {
        const res = await api.get(
          `/api/dm/rooms/${roomId}?before=${beforeId}&limit=${limit}`,
        );
        return {
          messages: res.data?.data || [],
          hasMore: Boolean(res.data?.hasMore),
        };
      },
      sendMessage: async (roomId, formData) => {
        const res = await api.post(
          `/api/dm/rooms/${roomId}/messages`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          },
        );
        return res.data?.data;
      },
      deleteMessage: (id) => api.delete(`/api/dm/messages/${id}`),
      markRead: (roomId) =>
        api.put(`/api/dm/rooms/${roomId}/read`).catch(() => {}),
      markNotificationRead: () =>
        api
          .post('/api/notifications/read-by-related', {
            relatedType: 'dm_room',
            relatedId: roomId,
          })
          .catch(() => {}),
    }),
    [roomId],
  );

  return useChatCore({
    roomId,
    meId,
    api: apiAdapter,
    socket,
    cacheScope: 'dm',
    refreshHasUnread,
  });
}
```

---

## 6. useChatScroll.js — 스크롤 시스템 (원본 완전 이식)

### 6-1. 관리해야 할 ref (원본 전부 보존)

```js
const listRef = useRef(null);
const currentOffsetRef = useRef(0);
const contentHeightRef = useRef(0);
const isNearBottomRef = useRef(true);
const isScrollingRef = useRef(false);
const scrollAnimationRef = useRef(null);
const prevNewestIdRef = useRef(null);
const isLoadingMoreRef = useRef(false);
const loadOlderAllowedRef = useRef(false);
const didListShellLayoutRef = useRef(false);
const didInitialAnchorRef = useRef(false);
const isInitialLoadRef = useRef(true);
const keyboardTimeoutRef = useRef(null);
```

### 6-2. roomId 변경 시 ref 초기화 (원본 보존)

```js
useEffect(() => {
  isLoadingMoreRef.current = false;
  loadOlderAllowedRef.current = false;
  didListShellLayoutRef.current = false;
  isNearBottomRef.current = true;
  prevNewestIdRef.current = null;
  isScrollingRef.current = false;
  contentHeightRef.current = 0;
  currentOffsetRef.current = 0;
  didInitialAnchorRef.current = false;
  isInitialLoadRef.current = true;
  setListShellVisible(false);
}, [roomId]);
```

### 6-3. 스크롤 이벤트 핸들러 (원본 보존)

```js
const handleScroll = useCallback((e) => {
  const offsetY = e?.nativeEvent?.contentOffset?.y ?? 0;
  const viewportH = e?.nativeEvent?.layoutMeasurement?.height ?? 0;
  const contentH = e?.nativeEvent?.contentSize?.height ?? 0;
  contentHeightRef.current = contentH;
  currentOffsetRef.current = offsetY;

  // 스크롤 중 감지 (150ms debounce)
  isScrollingRef.current = true;
  if (scrollAnimationRef.current) clearTimeout(scrollAnimationRef.current);
  scrollAnimationRef.current = setTimeout(() => {
    isScrollingRef.current = false;
  }, 150);

  // 하단 근접: 뷰포트 비례 threshold (원본 방식)
  const threshold = Math.max(80, viewportH * 0.1);
  isNearBottomRef.current = offsetY + viewportH >= contentH - threshold;
}, []);
```

### 6-4. 새 메시지 자동 스크롤 (원본 보존)

```js
// messages 변경 시 자동 스크롤 판단
useEffect(() => {
  if (!messages?.length) return;
  const newest = messages[messages.length - 1];
  const newestId = newest?.id;
  if (!newestId || prevNewestIdRef.current === newestId) return;

  const shouldAutoscroll = newest?.isMe || isNearBottomRef.current;
  if (shouldAutoscroll && !isScrollingRef.current) {
    if (scrollAnimationRef.current) clearTimeout(scrollAnimationRef.current);
    scrollAnimationRef.current = setTimeout(() => {
      listRef.current?.scrollToEnd?.({ animated: true });
    }, 100);
  }

  prevNewestIdRef.current = newestId;
}, [messages]);
```

### 6-5. 키보드 이벤트 → 자동 스크롤 (원본 Chat.jsx 보존)

```js
useEffect(() => {
  const show = Keyboard.addListener(
    Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
    (e) => {
      setKeyboardHeight(e?.endCoordinates?.height ?? 0);
      if (messages?.length > 0 && isNearBottomRef.current) {
        keyboardTimeoutRef.current = setTimeout(
          () => {
            listRef.current?.scrollToEnd?.({ animated: true });
          },
          Platform.OS === 'ios' ? 100 : 200,
        );
      }
    },
  );
  const hide = Keyboard.addListener(
    Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
    () => {
      setKeyboardHeight(0);
      if (keyboardTimeoutRef.current) clearTimeout(keyboardTimeoutRef.current);
    },
  );
  return () => {
    show.remove();
    hide.remove();
    if (keyboardTimeoutRef.current) clearTimeout(keyboardTimeoutRef.current);
  };
}, [messages?.length]);
```

### 6-6. 초기 앵커링 + opacity 제어 (원본 보존 — 스크롤 튐 방지의 핵심)

```js
const [listShellVisible, setListShellVisible] = useState(false);

const handleListShellLayout = useCallback(() => {
  if (didListShellLayoutRef.current) return;
  didListShellLayoutRef.current = true;
  requestAnimationFrame(() => {
    setListShellVisible(true);
    if (flatData.length > 0) loadOlderAllowedRef.current = true;
  });
}, [flatData.length]);

useEffect(() => {
  if (didInitialAnchorRef.current) return;
  if (isLoading) return;
  if (flatData.length === 0) {
    didInitialAnchorRef.current = true;
    setListShellVisible(true);
    loadOlderAllowedRef.current = true;
    isInitialLoadRef.current = false;
    return;
  }
  if (!didListShellLayoutRef.current) return;

  requestAnimationFrame(() => {
    listRef.current?.scrollToEnd?.({ animated: false });
    didInitialAnchorRef.current = true;
    setListShellVisible(true);
    loadOlderAllowedRef.current = true;
    isInitialLoadRef.current = false;
  });
}, [flatData.length, isLoading]);
```

### 6-7. 과거 로딩 (handleStartReached) — 오호출 방지 (원본 보존)

```js
const handleStartReached = useCallback(() => {
  if (!loadOlderAllowedRef.current) return;
  if (isLoading || isLoadingMore) return;
  if (isLoadingMoreRef.current) return;

  isLoadingMoreRef.current = true;
  loadMore().finally(() => {
    setTimeout(() => {
      isLoadingMoreRef.current = false;
    }, 500); // 500ms 쿨다운
  });
}, [isLoading, isLoadingMore, loadMore]);
```

### 6-8. return

```js
return {
  listRef,
  listShellVisible,
  keyboardHeight,
  handleScroll,
  handleListShellLayout,
  handleStartReached,
  isNearBottomRef,
  currentOffsetRef,
  contentHeightRef,
};
```

---

## 7. normalizeMessage.js — 필드 완전 포함

### 7-1. 반드시 포함할 필드 (원본 기준)

```js
return {
  id: String(m.id),
  clientId: m.client_id ?? m.clientId ?? null,
  senderId: m.sender_id != null ? Number(m.sender_id) : null,
  isMe,
  senderName,
  content: m.content,
  parent_message_id: m.parent_message_id ?? m.parentMessageId ?? null,
  parent_content: m.parent_content ?? null,
  parent_sender_name: m.parent_sender_name ?? null,
  images: /* Array 파싱 로직 (원본 그대로) */,
  is_deleted: Boolean(m.is_deleted),
  createdAt,
  dateKey: getDateKey(d),
  time: formatChatTime(createdAt),
  isReadByOther: isMe ? Boolean(m.is_read) : undefined,   // ← 필수
  isReadByMe: !isMe ? Boolean(m.is_read) : undefined,     // ← 필수
  isSending,
  isFailed,
  status: m.status ?? (isFailed ? 'failed' : isSending ? 'sending' : 'sent'),
};
```

---

## 8. MessageList.jsx — FlashList 전체 튜닝 보존

### 8-1. 절대 생략하면 안 되는 props

```jsx
<FlashList
  ref={listRef}
  key={roomId} // roomId 변경 시 리스트 리셋
  data={flatData}
  extraData={messages.length} // 메시지 수 변경 감지
  keyExtractor={keyExtractor}
  getItemType={getFlashListItemType}
  renderItem={renderItem}
  // ===== 성능 핵심 (원본 값 보존) =====
  estimatedItemSize={90}
  drawDistance={1000}
  overrideItemLayout={overrideItemLayout} // item별 정밀 높이
  maxToRenderPerBatch={8}
  windowSize={7}
  initialNumToRender={20}
  removeClippedSubviews={true}
  disableAutoLayout={true} // 안드로이드 레이아웃 안정화
  // ===== 스크롤 안정화 핵심 (삭제 금지) =====
  initialScrollIndex={initialScrollIndex} // 맨 아래부터 시작
  maintainVisibleContentPosition={{ minIndexForVisible: 0 }} // 페이징 시 위치 고정
  // ===== 과거 로딩 =====
  onStartReached={handleStartReached}
  onStartReachedThreshold={0.01}
  ListHeaderComponent={isLoadingMore ? <Loading /> : null}
  // ===== 키보드 =====
  keyboardShouldPersistTaps="handled"
  keyboardDismissMode="on-drag"
  // ===== 기타 =====
  showsVerticalScrollIndicator={false}
  scrollEventThrottle={16}
  decelerationRate="normal"
  onContentSizeChange={(_, h) => {
    contentHeightRef.current = h;
  }}
  onScroll={handleScroll}
/>
```

### 8-2. overrideItemLayout — 원본의 정밀 추정 보존

```js
const estimateRowHeight = useCallback((item, index, totalCount) => {
  if (!item || item.type === 'dateBanner') return 78;
  const showTs = item.showTimestamp !== false;
  let h = item.isMe ? 76 : 102;
  if (!item.isMe && item.showProfile === false) h -= 28;
  if (!showTs) h -= item.isMe ? 18 : 20;
  if (item.parent_content) h += 58;
  const n = Array.isArray(item.images) ? item.images.length : 0;
  if (n > 0) h += n * 204;
  const hasText = Boolean(
    (item.content && String(item.content).trim()) || item.is_deleted,
  );
  if (hasText) h += 46;
  if (item.isFailed || item.status === 'failed') h += 6;
  if (index === totalCount - 1) h += 0;
  return Math.max(120, Math.min(h, 2400));
}, []);
```

### 8-3. MessageItem memo — 원본 수준의 비교 함수

```js
export default React.memo(MessageItem, (prev, next) => {
  const a = prev.msg;
  const b = next.msg;
  return (
    a.id === b.id &&
    a.status === b.status &&
    a.isSending === b.isSending &&
    a.isFailed === b.isFailed &&
    a.is_deleted === b.is_deleted &&
    a.content === b.content &&
    a.isReadByOther === b.isReadByOther &&
    a.showProfile === b.showProfile &&
    a.showTimestamp === b.showTimestamp &&
    a.images?.length === b.images?.length
  );
});
```

---

## 9. ChatScreen.jsx — 공통 화면

### 9-1. 필수 포함 요소

```
SafeAreaView
  ├─ SubHeader (headerConfig로 Chat/DM 분기)
  ├─ KeyboardAvoidingView ← 필수 (원본 둘 다 사용)
  │   ├─ [PostCard] (Chat 전용, type==='room'일 때만)
  │   ├─ View (opacity: listShellVisible → 스크롤 튐 방지)
  │   │   └─ MessageList (FlashList)
  │   ├─ [ChatToast] (toastText 있을 때)
  │   ├─ MessageActions (롱프레스 메뉴)
  │   ├─ ImageViewer
  │   ├─ [답장 프리뷰] (replyToMessage 있을 때)
  │   └─ MessageInput (CommentInput 래핑)
```

### 9-2. KeyboardAvoidingView (필수)

```jsx
<KeyboardAvoidingView
  style={{ flex: 1, backgroundColor: colors.background }}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + normalize(48) : 0}
>
```

### 9-3. 로딩 화면 (원본 보존)

```jsx
if (isLoading && messages.length === 0) {
  return (
    <SafeAreaView>
      <SubHeader ... />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Loading size="large" />
      </View>
    </SafeAreaView>
  );
}
```

### 9-4. opacity 제어 (원본 보존)

```jsx
<View
  style={{ flex: 1, opacity: listShellVisible ? 1 : 0 }}
  onLayout={handleListShellLayout}
>
  <MessageList ... />
</View>
```

### 9-5. flatData 생성 — withMessageGroupFlags 필수

```js
const flatData = useMemo(
  () => injectDateBanners(withMessageGroupFlags(messages)),
  [messages],
);
```

### 9-6. 답장 프리뷰 UI (원본 Chat.jsx 보존)

```jsx
{
  replyToMessage && (
    <TouchableOpacity
      onPress={() => setReplyToMessage(null)}
      style={chatStyles.replyPreviewContainer}
    >
      <View style={chatStyles.replyPreviewMeta}>
        <Text style={chatStyles.replyPreviewTitle}>
          {replyToMessage.isMe ? '내' : '상대방에게'} 답장 중
        </Text>
        <Text style={chatStyles.replyPreviewContent} numberOfLines={1}>
          {replyToMessage.content || '(이미지 메시지)'}
        </Text>
      </View>
      <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}
```

### 9-7. 토스트 UI (원본 Chat.jsx 보존)

```jsx
{toastText && (
  <View pointerEvents="none" style={{ position: 'absolute', ... }}>
    <View style={{ backgroundColor: 'rgba(255,255,255,0.97)', borderWidth: 1, borderColor: '#E0E0E0', ... }}>
      <Text>{toastText}</Text>
    </View>
  </View>
)}
```

### 9-8. 입력 paddingBottom (원본 보존)

```jsx
<View style={{
  paddingBottom: keyboardHeight > 0 ? 0
    : insets.bottom > 0 ? insets.bottom : normalize(12),
}}>
  <MessageInput ... />
</View>
```

### 9-9. handlePressReplyTarget (원본 보존)

```js
const handlePressReplyTarget = useCallback(
  (parentMessageId) => {
    const targetId = parentMessageId != null ? String(parentMessageId) : null;
    if (!targetId) return;
    const targetIndex = flatData.findIndex(
      (item) => item?.type !== 'dateBanner' && String(item?.id) === targetId,
    );
    if (targetIndex < 0) {
      showChatToast('상단으로 더 올려서 과거 메시지를 확인해 주세요');
      return;
    }
    listRef.current?.scrollToIndex?.({
      index: targetIndex,
      animated: true,
      viewPosition: 0.5,
    });
  },
  [flatData, showChatToast],
);
```

---

## 10. DMChatScreen.jsx — DM 전용

### 10-1. 헤더 (원본 완전 보존)

```jsx
const titleElement = useMemo(
  () => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginLeft: 20,
        minWidth: 0,
      }}
    >
      <View
        style={{
          width: normalize(36),
          height: normalize(36),
          borderRadius: normalize(18),
          backgroundColor: colors.primaryLight30,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: normalize(10),
        }}
      >
        <MessageTabIcon
          width={normalize(22)}
          height={normalize(22)}
          color={getFriendIconColorByIndex(friend.colorIndex ?? 0)}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: normalize(16),
            fontWeight: '700',
            fontFamily: fonts.bold,
            color: colors.textPrimary,
          }}
        >
          {friendName}
        </Text>
        {friendSchool ? (
          <Text
            numberOfLines={1}
            style={{
              fontSize: normalize(11),
              fontFamily: fonts.regular,
              color: colors.textSecondary,
            }}
          >
            {friendSchool}
          </Text>
        ) : null}
      </View>
    </View>
  ),
  [normalize, friendName, friendSchool, friend.colorIndex],
);
```

### 10-2. DM 전용 props

- `opponentName={friendName}` → MessageItem에 전달
- `mainPlaceholder="메시지를 입력하세요"` → MessageInput에 전달
- `chatInputStyles` → DM 전용 입력 스타일

---

## 11. ChatRoomScreen.jsx — Chat 전용

### 11-1. 게시글 카드 (PostCard)

- 원본 Chat.jsx의 게시글 로드 + 카드 UI를 `PostCard.jsx`로 분리
- roomId 변경 시 게시글 재로드
- 카드 클릭 → `navigation.navigate('BoardDetail', ...)`

---

## 12. DateBanner.jsx — 날짜 포맷

### 12-1. 포맷 규칙 (chat.md 4-8)

```js
function formatBannerDate(dateKey) {
  // dateKey: "2026-3-31" 형식
  const [y, m, d] = dateKey.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - target) / 86400000);

  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  return `${m}월 ${d}일`;
}
```

---

## 13. 오류 최소화 전략

### 13-1. 원본에서 확인된 위험 패턴 & 수정 방향

| 위험 패턴                                          | 위치                | 수정 방향                                           |
| -------------------------------------------------- | ------------------- | --------------------------------------------------- |
| `useMemo` 안 `setTimeout(() => setChatData(...))`  | useChat/useDMChat   | `useEffect` + `dispatch({ type: 'TRIM_MESSAGES' })` |
| `setChatData` 연속 호출 (배치 불보장)              | 소켓/폴링 핸들러    | 단일 `dispatch`로 통합                              |
| `abortController` 없는 fetch                       | 초기 로딩           | `AbortController` 필수 적용                         |
| unmount 후 setState                                | 소켓 핸들러         | `isMounted` 체크 + `useReducer` (setState 대신)     |
| `String(roomId) === String(roomId)` 의미 없는 비교 | useDMChat 초기 로딩 | 제거                                                |

### 13-2. 테스트 시나리오 (Phase별 검증)

| Phase        | 검증 항목                                      |
| ------------ | ---------------------------------------------- |
| Phase 1 완료 | 채팅방 진입 → 메시지 로드 → 전송 → 수신 → 삭제 |
| Phase 2 완료 | 원본 훅 축소 후 동일 동작 확인                 |
| Phase 3 완료 | 스크롤 튐 없음, 페이징 시 위치 고정, 키보드 UX |
| Phase 4 완료 | Chat.jsx/DMChat.jsx 껍데기화 후 전체 동작      |

### 13-3. import 경로 주의

새 구조(`chat/hooks/`, `chat/screens/`)에서 기존 유틸/컴포넌트 참조 시:

```
chat/hooks/      → ../../../../utils/api (4단계 위)
chat/screens/    → ../../../../styles/colors (4단계 위)
chat/components/ → ../../../../components/CommentInput (4단계 위)
```

---

## 14. 최종 결과물

```
ChatRoomScreen / DMChatScreen
  └─ ChatScreen (공통 화면)
       ├─ useChatCore (데이터: reducer + 소켓 + 폴링 + 캐시 + 읽음)
       ├─ useChatScroll (스크롤: 원본의 모든 ref 보존)
       ├─ useChatUI (UI 상태: reply, toast, viewer, longPress)
       ├─ PostCard (Chat 전용)
       ├─ MessageList (FlashList + 전체 튜닝)
       │    └─ MessageItem (정밀 memo)
       │    └─ DateBanner (오늘/어제/M월 D일)
       ├─ MessageInput (답장 프리뷰 포함)
       ├─ MessageActions (롱프레스 메뉴)
       ├─ ImageViewer
       └─ ChatToast
```

**한 줄 요약**: 원본의 모든 기능/성능/UX를 1:1 보존하되, 구조만 분리하여 유지보수성과 확장성을 확보한다.

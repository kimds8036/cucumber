import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { Alert, InteractionManager } from 'react-native';
import { chatReducer, initialState } from './chatReducer';
import {
  CHAT_MEMORY_LIMIT,
  CHAT_INITIAL_FETCH_LIMIT,
  CHAT_PAGE_SIZE,
  CHAT_POLL_INTERVAL,
  CHAT_CACHE_SAVE_DEBOUNCE,
  CHAT_TEMP_REPLACE_DELAY,
} from '../constants/chatConfig';
import normalizeMessage, {
  parseUtcToLocal,
  formatChatTime,
  getDateKey,
} from '../utils/normalizeMessage';
import { loadCache, saveCache } from '../utils/cacheManager';

const getMessageSortValue = (msg) => {
  if (!msg) return Number.MIN_SAFE_INTEGER;
  const idNum = Number(msg.id);
  if (!Number.isNaN(idNum)) return idNum;
  const t = Date.parse(msg.createdAt || '');
  if (!Number.isNaN(t)) return t;
  return Number.MIN_SAFE_INTEGER;
};

/**
 * @param {Object} config
 * @param {string|number} config.roomId
 * @param {number|null}   config.meId
 * @param {Object}        config.api
 * @param {Object|null}   config.socket
 * @param {string}        config.cacheScope - 'chat' | 'dm'
 * @param {Function}      config.refreshHasUnread
 */
export default function useChatCore(config) {
  const {
    roomId,
    meId,
    api,
    socket,
    cacheScope = 'chat',
    refreshHasUnread,
  } = config;

  const [state, dispatch] = useReducer(chatReducer, initialState);

  const meIdRef = useRef(meId);
  const oldestIdRef = useRef(null);
  const pollRef = useRef(null);
  const abortControllerRef = useRef(null);
  const cacheSaveTimeoutRef = useRef(null);
  const pendingClientIdTimeoutsRef = useRef(new Map());

  useEffect(() => {
    meIdRef.current = meId;
  }, [meId]);

  // ─── derived messages (ID 기반 정렬 — 원본 방식) ───
  const messages = useMemo(() => {
    const arr = state.messageIds
      .map((id) => state.messagesById[id])
      .filter(Boolean);
    arr.sort((a, b) => getMessageSortValue(a) - getMessageSortValue(b));
    return arr;
  }, [state.messageIds, state.messagesById]);

  const hasMore = state.hasMore;
  const isLoading = state.isLoading;
  const isLoadingMore = state.isLoadingMore;

  // ─── 메모리 trim (useEffect — useMemo 안 setState 금지) ───
  useEffect(() => {
    if (state.messageIds.length > CHAT_MEMORY_LIMIT) {
      dispatch({ type: 'TRIM_MESSAGES', payload: CHAT_MEMORY_LIMIT });
    }
  }, [state.messageIds.length]);

  // ─── roomId 변경 시 상태 초기화 + 이전 요청 취소 ───
  useEffect(() => {
    if (!roomId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    dispatch({ type: 'RESET' });
    oldestIdRef.current = null;

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [roomId]);

  // unmount 시 AbortController 정리
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // ─── 폴링 (소켓 fallback) ───
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current || !roomId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.fetchMessages(roomId, CHAT_PAGE_SIZE * 2);
        const currentMeId = res.meId ?? meIdRef.current;
        const mapped = (res.messages || []).map((m) =>
          normalizeMessage(m, currentMeId),
        );
        dispatch({ type: 'MERGE_POLL_MESSAGES', payload: { messages: mapped } });
      } catch (e) {
        console.error('[useChatCore][Poll] 오류:', e);
      }
    }, CHAT_POLL_INTERVAL);
  }, [roomId, api]);

  // ─── 소켓 new_message 핸들러 ───
  const handleSocketNewMessage = useCallback(
    (payload) => {
      if (!payload?.message) return;
      if (String(payload.message.room_id) !== String(roomId)) return;

      const newMsg = normalizeMessage(payload.message, meIdRef.current);

      if (newMsg.clientId) {
        const key = String(newMsg.clientId);
        const tid = pendingClientIdTimeoutsRef.current.get(key);
        if (tid) {
          clearTimeout(tid);
          pendingClientIdTimeoutsRef.current.delete(key);
        }
      }

      if (newMsg.clientId && state.messagesById[String(newMsg.clientId)]) {
        dispatch({
          type: 'REPLACE_TEMP_MESSAGE',
          payload: { tempId: String(newMsg.clientId), serverMessage: newMsg },
        });
      } else {
        dispatch({ type: 'ADD_MESSAGE', payload: newMsg });
      }

      if (!newMsg.isMe) {
        api.markRead?.(roomId)?.catch?.(() => {});
      }
    },
    [roomId, api, state.messagesById],
  );

  // ─── 소켓 read_receipt 핸들러 ───
  const handleSocketReadReceipt = useCallback(
    (payload) => {
      if (String(payload.roomId) !== String(roomId)) return;
      dispatch({ type: 'MARK_MY_READ' });
    },
    [roomId],
  );

  // ─── 소켓 연결/해제 ───
  useEffect(() => {
    if (!roomId || !socket) return;
    let isMounted = true;

    let handlers = {};

    const connect = async () => {
      await socket.connectSocket?.(roomId);
      if (!isMounted) return;

      handlers = {
        connect: () => stopPolling(),
        disconnect: () => {
          if (isMounted) startPolling();
        },
        connect_error: () => {
          if (isMounted) startPolling();
        },
        new_message: handleSocketNewMessage,
        read_receipt: handleSocketReadReceipt,
      };

      Object.entries(handlers).forEach(([event, fn]) => {
        socket.on(event, fn);
      });
    };

    connect();

    return () => {
      isMounted = false;
      Object.entries(handlers).forEach(([event, fn]) => {
        socket.off?.(event, fn);
      });
      pendingClientIdTimeoutsRef.current.forEach((t) => clearTimeout(t));
      pendingClientIdTimeoutsRef.current.clear();
      socket.disconnectSocket?.();
      stopPolling();
    };
  }, [
    roomId,
    socket,
    handleSocketNewMessage,
    handleSocketReadReceipt,
    startPolling,
    stopPolling,
  ]);

  // ─── 초기 로딩 (InteractionManager + AbortController) ───
  useEffect(() => {
    if (!roomId) return;
    let isMounted = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    InteractionManager.runAfterInteractions(() => {
      if (!isMounted || controller.signal.aborted) return;

      (async () => {
        try {
          const cached = await loadCache(cacheScope, roomId);
          if (cached && isMounted && !controller.signal.aborted) {
            const cachedMsgs = cached.messageIds
              .map((id) => cached.messagesById[id])
              .filter(Boolean);
            if (cachedMsgs.length) {
              dispatch({
                type: 'SET_MESSAGES',
                payload: { messages: cachedMsgs, hasMore: true },
              });
              oldestIdRef.current = cached.messageIds[0] ?? null;
            }
          }

          const res = await api.fetchMessages(
            roomId,
            CHAT_INITIAL_FETCH_LIMIT,
            controller.signal,
          );
          if (controller.signal.aborted || !isMounted) return;

          const currentMeId = res.meId ?? meIdRef.current;
          const msgs = res.messages || [];

          msgs.sort((a, b) => {
            const ad = parseUtcToLocal(a.created_at || '');
            const bd = parseUtcToLocal(b.created_at || '');
            return !ad || !bd ? 0 : bd - ad;
          });

          const normalized = [];
          for (let i = msgs.length - 1; i >= 0; i--) {
            normalized.push(normalizeMessage(msgs[i], currentMeId));
          }

          if (!controller.signal.aborted && isMounted) {
            dispatch({
              type: 'SET_MESSAGES',
              payload: {
                messages: normalized,
                hasMore: Boolean(res.hasMore),
              },
            });
            oldestIdRef.current = normalized[0]?.id ?? null;
          }

          try {
            await api.markRead?.(roomId);
            dispatch({ type: 'MARK_ALL_READ' });
            await api.markNotificationRead?.();
            refreshHasUnread?.();
          } catch {
            /* ignore */
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          console.error('[useChatCore] 메시지 로드 실패:', error);
          if (isMounted) {
            Alert.alert(
              '오류',
              error?.response?.data?.message ||
                '채팅 내역을 불러오는 중 오류가 발생했습니다.',
            );
          }
        } finally {
          if (isMounted) {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        }
      })();
    });

    return () => {
      isMounted = false;
    };
  }, [roomId, api, cacheScope, refreshHasUnread]);

  // ─── 캐시 저장 (debounce) ───
  useEffect(() => {
    if (!roomId) return;
    if (cacheSaveTimeoutRef.current)
      clearTimeout(cacheSaveTimeoutRef.current);

    cacheSaveTimeoutRef.current = setTimeout(() => {
      saveCache(
        cacheScope,
        roomId,
        state.messagesById,
        state.messageIds,
      );
    }, CHAT_CACHE_SAVE_DEBOUNCE);

    return () => {
      if (cacheSaveTimeoutRef.current)
        clearTimeout(cacheSaveTimeoutRef.current);
    };
  }, [roomId, cacheScope, state.messagesById, state.messageIds]);

  // ─── sendMessage (Optimistic + 5초 딜레이 교체) ───
  const sendMessage = useCallback(
    async ({ text, images, replyTo }) => {
      if (!roomId) return;
      const trimmed = (text ?? '').trim();
      const imgArr = Array.isArray(images) ? images : [];
      if (!trimmed && imgArr.length === 0) return;

      const clientId = `temp_${Date.now()}`;
      const nowIso = new Date().toISOString();
      const d = parseUtcToLocal(nowIso);
      const parentId = replyTo?.id ? String(replyTo.id) : null;
      const parentContent = replyTo?.content ?? null;
      const parentSenderName = replyTo?.senderName ?? null;

      const optimisticMsg = {
        id: clientId,
        clientId,
        type: 'message',
        isMe: true,
        senderId:
          meIdRef.current != null ? Number(meIdRef.current) : null,
        content: trimmed || null,
        images: [...imgArr],
        is_deleted: false,
        createdAt: nowIso,
        dateKey: getDateKey(d),
        time: formatChatTime(nowIso),
        parent_message_id: parentId,
        parent_content: parentContent,
        parent_sender_name: parentSenderName,
        isReadByOther: false,
        isReadByMe: undefined,
        isSending: true,
        isFailed: false,
        status: 'sending',
      };

      dispatch({ type: 'ADD_MESSAGE', payload: optimisticMsg });

      if (__DEV__) {
        console.log('[ChatDebug] SendOptimistic', {
          roomId,
          clientId,
          meId: meIdRef.current,
          hasText: !!trimmed,
          imageCount: imgArr.length,
        });
      }

      try {
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
        if (parentId) formData.append('parent_message_id', parentId);

        const serverRaw = await api.sendMessage(roomId, formData);
        const serverMsg = normalizeMessage(serverRaw, meIdRef.current);

        const timeoutId = setTimeout(() => {
          dispatch({
            type: 'REPLACE_TEMP_MESSAGE',
            payload: { tempId: clientId, serverMessage: serverMsg },
          });
          pendingClientIdTimeoutsRef.current.delete(clientId);

          if (__DEV__) {
            console.log('[ChatDebug] SendReplace', {
              roomId,
              clientId,
              serverId: serverMsg.id,
            });
          }
        }, CHAT_TEMP_REPLACE_DELAY);

        pendingClientIdTimeoutsRef.current.set(clientId, timeoutId);
      } catch (error) {
        console.error('[useChatCore] 전송 실패:', error);
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            id: clientId,
            updates: { isSending: false, isFailed: true, status: 'failed' },
          },
        });
      }
    },
    [roomId, api],
  );

  // ─── retryMessage (같은 clientId 재사용 — 원본 동작) ───
  const retryMessage = useCallback(
    async (failedMsg) => {
      if (!roomId) return;
      const clientId = String(failedMsg?.clientId ?? failedMsg?.id);
      const text = String(failedMsg?.content ?? '').trim();
      const imgs = Array.isArray(failedMsg?.images) ? failedMsg.images : [];
      const parentId = failedMsg?.parent_message_id
        ? String(failedMsg.parent_message_id)
        : null;

      if (!text && imgs.length === 0) return;

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
        imgs.forEach((uri, i) => {
          formData.append('images', {
            uri,
            type: 'image/jpeg',
            name: `image_${i}.jpg`,
          });
        });
        formData.append('clientId', clientId);
        if (parentId) formData.append('parent_message_id', parentId);

        const serverRaw = await api.sendMessage(roomId, formData);
        const serverMsg = normalizeMessage(serverRaw, meIdRef.current);

        const timeoutId = setTimeout(() => {
          dispatch({
            type: 'REPLACE_TEMP_MESSAGE',
            payload: { tempId: clientId, serverMessage: serverMsg },
          });
          pendingClientIdTimeoutsRef.current.delete(clientId);
        }, CHAT_TEMP_REPLACE_DELAY);

        pendingClientIdTimeoutsRef.current.set(clientId, timeoutId);
      } catch (error) {
        console.error('[useChatCore] 재전송 실패:', error);
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            id: clientId,
            updates: { isSending: false, isFailed: true, status: 'failed' },
          },
        });
      }
    },
    [roomId, api],
  );

  // ─── deleteMessage (temp 방지 + Alert) ───
  const deleteMessage = useCallback(
    async (messageId) => {
      if (String(messageId).startsWith('temp_')) return;
      try {
        await api.deleteMessage(String(messageId));
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            id: String(messageId),
            updates: { is_deleted: true },
          },
        });
      } catch (e) {
        console.error('[useChatCore] 삭제 실패:', e);
        Alert.alert('오류', '메시지 삭제에 실패했습니다.');
      }
    },
    [api],
  );

  // ─── loadMore (oldestIdRef + prepend) ───
  const loadMore = useCallback(async () => {
    if (!roomId || !hasMore || isLoadingMore) return;
    if (!oldestIdRef.current) return;

    dispatch({ type: 'SET_LOADING_MORE', payload: true });

    try {
      const res = await api.fetchMore(
        roomId,
        oldestIdRef.current,
        CHAT_PAGE_SIZE,
      );
      const msgs = res.messages || [];

      if (msgs.length === 0) {
        dispatch({ type: 'SET_HAS_MORE', payload: false });
        dispatch({ type: 'SET_LOADING_MORE', payload: false });
        return;
      }

      const currentMeId = meIdRef.current;
      const mapped = msgs.map((m) => normalizeMessage(m, currentMeId));
      const chronological = [...mapped].reverse();

      dispatch({
        type: 'ADD_MESSAGES_PREPEND',
        payload: { messages: chronological },
      });

      const minId = Math.min(
        ...mapped.map((m) => Number(m.id)).filter((n) => !Number.isNaN(n)),
      );
      if (minId && minId !== Infinity) {
        oldestIdRef.current = minId.toString();
      }

      dispatch({ type: 'SET_HAS_MORE', payload: Boolean(res.hasMore) });
    } catch (e) {
      console.error('[useChatCore][Pagination] 실패:', e);
    } finally {
      dispatch({ type: 'SET_LOADING_MORE', payload: false });
    }
  }, [roomId, hasMore, isLoadingMore, api]);

  // unmount 시 폴링 정리
  useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    messages,
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

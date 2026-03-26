import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { api } from '../../../utils/api';
import { useNotification } from '../../../context/NotificationContext';

const getCacheKey = (roomId) => `chat_cache_${roomId}`;

// 초기 진입 시 최신 몇 개만 우선 로드할지
const INITIAL_FETCH_LIMIT = 25;
// 캐시에 저장할 최대 메시지 수 (과거까지 전부 저장하면 초기 진입이 무거워짐)
const CACHE_SAVE_LIMIT = 60;

const getMessageSortValue = (msg) => {
  if (!msg) return Number.MIN_SAFE_INTEGER;
  const idNum = Number(msg.id);
  if (!Number.isNaN(idNum)) return idNum;
  const t = Date.parse(msg.createdAt || '');
  if (!Number.isNaN(t)) return t;
  return Number.MIN_SAFE_INTEGER;
};

function parseUtcToLocal(createdAt) {
  if (!createdAt) return null;
  let s = String(createdAt).trim();
  if (!s) return null;
  if (
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s) &&
    !/[Z+-]\d{2}:?\d{2}$/.test(s) &&
    !/Z$/.test(s)
  ) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatChatTime(createdAt) {
  const d = parseUtcToLocal(createdAt);
  if (!d) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

function getDateKey(d) {
  if (!d) return '';
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function normalizeMessage(m, meId) {
  const createdAt = m.created_at || '';
  const d = parseUtcToLocal(createdAt);
  const isMe = meId != null && m.sender_id === meId;
  const isSending = Boolean(m.isSending);
  const isFailed = Boolean(m.isFailed);
  const senderName = m.sender_name ?? m.senderName ?? (isMe ? '나' : '익명');

  return {
    id: String(m.id),
    clientId: m.client_id ?? m.clientId ?? null,
    isMe,
    senderName,
    content: m.content,
    parent_message_id: m.parent_message_id ?? m.parentMessageId ?? null,
    parent_content: m.parent_content ?? null,
    parent_sender_name: m.parent_sender_name ?? null,
    images: (() => {
      const raw = m.images;
      if (Array.isArray(raw)) return raw.filter((u) => typeof u === 'string');
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed)
            ? parsed.filter((u) => typeof u === 'string')
            : [];
        } catch {
          return [raw].filter((u) => typeof u === 'string');
        }
      }
      return [];
    })(),
    is_deleted: Boolean(m.is_deleted),
    createdAt,
    dateKey: getDateKey(d),
    time: formatChatTime(createdAt),
    isReadByOther: isMe ? Boolean(m.is_read) : undefined,
    isReadByMe: !isMe ? Boolean(m.is_read) : undefined,
    isSending,
    isFailed,
    status: m.status ?? (isFailed ? 'failed' : isSending ? 'sending' : 'sent'),
  };
}

async function loadCachedMessages(roomId) {
  if (!roomId) return null;
  try {
    const raw = await AsyncStorage.getItem(getCacheKey(roomId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const allIds = Array.isArray(parsed.messageIds) ? parsed.messageIds : [];
    const allById = parsed.messagesById || {};

    // 캐시가 과도하게 크면 초기 진입이 무거워지므로 최신 INITIAL_FETCH_LIMIT만 사용
    const slicedIds =
      allIds.length > INITIAL_FETCH_LIMIT ? allIds.slice(-INITIAL_FETCH_LIMIT) : allIds;
    const slicedById = {};
    slicedIds.forEach((id) => {
      if (allById[id]) slicedById[id] = allById[id];
    });

    return {
      messagesById: slicedById,
      messageIds: slicedIds,
    };
  } catch (error) {
    console.error('[useChat] 캐시 로드 오류', error);
    return null;
  }
}

async function saveCachedMessages(roomId, data) {
  if (!roomId || !data) return;
  try {
    const ids = Array.isArray(data.messageIds) ? data.messageIds : [];
    const byId = data.messagesById || {};

    // 캐시에 저장할 때도 과도하게 쌓이는 것을 방지
    const slicedIds = ids.length > CACHE_SAVE_LIMIT ? ids.slice(-CACHE_SAVE_LIMIT) : ids;
    const slicedById = {};
    slicedIds.forEach((id) => {
      if (byId[id]) slicedById[id] = byId[id];
    });

    await AsyncStorage.setItem(
      getCacheKey(roomId),
      JSON.stringify({ messagesById: slicedById, messageIds: slicedIds }),
    );
  } catch (error) {
    console.error('[useChat] 캐시 저장 오류', error);
  }
}

/**
 * @param {string|number|null|undefined} roomId
 * @param {Object} socket - socketManager 모듈 전체 또는 { connectSocket, disconnectSocket, emit, on, off } 형태
 */
export default function useChat(roomId, socket) {
  const { refreshHasUnread } = useNotification();

  const [messagesById, setMessagesById] = useState({});
  const [messageIds, setMessageIds] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const [myId, setMyId] = useState(null);

  const pollRef = useRef(null);
  const oldestIdRef = useRef(null);
  const cacheSaveTimeoutRef = useRef(null);

  const currentUserIdRef = useRef(null); // 소켓/타이머 클로저 방지
  const pendingClientIdTimeoutsRef = useRef(new Map());

  const messages = useMemo(() => {
    // 항상 과거 -> 최신 순서(오름차순)로 고정
    const arr = messageIds.map((id) => messagesById[id]).filter(Boolean);
    arr.sort((a, b) => getMessageSortValue(a) - getMessageSortValue(b));
    return arr;
  }, [messageIds, messagesById]);

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
        const res = await api.get(`/api/messages/rooms/${roomId}?limit=50`);
        const room = res.data?.room;
        const msgs = res.data?.data || [];
        if (!room || !Array.isArray(msgs)) return;

        const otherId = room.other_user_id;
        const meId =
          room.user1_id === otherId
            ? room.user2_id
            : room.user2_id === otherId
              ? room.user1_id
              : null;

        msgs.sort((a, b) => {
          const ad = parseUtcToLocal(a.created_at || '');
          const bd = parseUtcToLocal(b.created_at || '');
          return !ad || !bd ? 0 : ad - bd;
        });

        const mapped = msgs.map((m) => normalizeMessage(m, meId));
        const mappedById = {};
        const mappedIds = [];

        mapped.forEach((m) => {
          mappedById[m.id] = m;
          mappedIds.push(m.id);
        });

        // 폴링은 "서버에서 새로 생긴 메시지만" union 반영
        setMessagesById((prevById) => {
          const next = { ...prevById, ...mappedById };
          // optimistic/pending 덮지 않음
          Object.keys(prevById).forEach((id) => {
            const msg = prevById[id];
            if (msg && (msg.isSending || msg.isFailed)) next[id] = msg;
          });
          return next;
        });

        setMessageIds((prevIds) => {
          const newIds = mappedIds.filter((id) => !prevIds.includes(id));
          return newIds.length ? [...prevIds, ...newIds] : prevIds;
        });
      } catch (e) {
        console.error('[useChat][Poll] 폴링 오류:', e);
      }
    }, 8000);
  }, [roomId]);

  // ─────────────────────────────────────────────
  // 1) 메시지 로드 + 캐시 (최초 1회)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;
    setTypingUsers({});
    setIsLoading(true);

    const init = async () => {
      try {
        const cached = await loadCachedMessages(roomId);
        if (cached && isMounted) {
          setMessagesById(cached.messagesById);
          setMessageIds(cached.messageIds);
          setHasMore(true);
          oldestIdRef.current = cached.messageIds[0] ?? null;
        }

        const res = await api.get(
          `/api/messages/rooms/${roomId}?limit=${INITIAL_FETCH_LIMIT}`,
        );
        const room = res.data?.room;
        const msgs = res.data?.data || [];
        const hasMoreRes = Boolean(res.data?.hasMore);

        if (!room || !Array.isArray(msgs)) return;

        const otherId = room.other_user_id;
        const meId =
          room.user1_id === otherId
            ? room.user2_id
            : room.user2_id === otherId
              ? room.user1_id
              : null;

        currentUserIdRef.current = meId;
        setMyId(meId);

        msgs.sort((a, b) => {
          const ad = parseUtcToLocal(a.created_at || '');
          const bd = parseUtcToLocal(b.created_at || '');
          return !ad || !bd ? 0 : ad - bd;
        });

        const normalized = {};
        const ids = [];
        msgs.forEach((m) => {
          const nm = normalizeMessage(m, meId);
          normalized[nm.id] = nm;
          ids.push(nm.id);
        });

        if (!isMounted) return;
        setMessagesById(normalized);
        setMessageIds(ids);
        setHasMore(hasMoreRes);
        oldestIdRef.current = ids[0] ?? null;

        // 읽음 처리
        try {
          await api.put(`/api/messages/rooms/${roomId}/read`);
          setMessagesById((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((id) => {
              if (next[id] && !next[id].isMe) {
                next[id] = { ...next[id], isReadByMe: true };
              }
            });
            return next;
          });

          await api
            .post('/api/notifications/read-by-related', {
              relatedType: 'message_room',
              relatedId: roomId,
            })
            .catch(() => {});
          refreshHasUnread();
        } catch {
          /* ignore */
        }
      } catch (error) {
        console.error('[useChat] 메시지 로드 실패:', error);
        Alert.alert(
          '오류',
          error?.response?.data?.message ||
            '채팅 내역을 불러오는 중 오류가 발생했습니다.',
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [roomId, refreshHasUnread]);

  // ─────────────────────────────────────────────
  // 2) 캐시 저장 (debounce)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    if (cacheSaveTimeoutRef.current) {
      clearTimeout(cacheSaveTimeoutRef.current);
    }

    cacheSaveTimeoutRef.current = setTimeout(() => {
      saveCachedMessages(roomId, { messagesById, messageIds });
    }, 300);

    return () => {
      if (cacheSaveTimeoutRef.current) {
        clearTimeout(cacheSaveTimeoutRef.current);
      }
    };
  }, [roomId, messagesById, messageIds]);

  // ─────────────────────────────────────────────
  // 3) Socket.io 연결
  // ─────────────────────────────────────────────
  const handleSocketUserTyping = useCallback(({ userId, userName }) => {
    if (!userId) return;
    setTypingUsers((prev) => ({ ...prev, [userId]: userName ?? '익명' }));
  }, []);

  const handleSocketUserStopTyping = useCallback(({ userId }) => {
    if (!userId) return;
    setTypingUsers((prev) => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
  }, []);

  const handleSocketReadReceipt = useCallback(
    (payload) => {
      if (String(payload.roomId) !== String(roomId)) return;
      setMessagesById((prevById) => {
        const next = { ...prevById };
        Object.keys(next).forEach((id) => {
          const msg = next[id];
          if (msg?.isMe) next[id] = { ...msg, isReadByOther: true };
        });
        return next;
      });
    },
    [roomId],
  );

  const handleSocketNewMessage = useCallback(
    (payload) => {
      if (!payload?.message) return;

      const newMsg = normalizeMessage(
        payload.message,
        currentUserIdRef.current,
      );

      // API success 대비 pending timeout clear
      if (newMsg.clientId) {
        const tempKey = String(newMsg.clientId);
        const timeoutId = pendingClientIdTimeoutsRef.current.get(tempKey);
        if (timeoutId) {
          clearTimeout(timeoutId);
          pendingClientIdTimeoutsRef.current.delete(tempKey);
        }
      }

      setMessagesById((prevById) => {
        const next = { ...prevById };
        const tempKeyForFallback = newMsg.clientId ? String(newMsg.clientId) : null;
        const tempMsg = tempKeyForFallback ? next[tempKeyForFallback] : null;

        // optimistic temp 메시지 매칭: clientId로 temp 제거
        if (newMsg.clientId) {
          const tempKey = String(newMsg.clientId);
          if (next[tempKey]) delete next[tempKey];
        }

        const shouldUpsert = !next[newMsg.id];
        next[newMsg.id] = {
          ...newMsg,
          parent_message_id:
            newMsg.parent_message_id ?? tempMsg?.parent_message_id ?? null,
          parent_content:
            newMsg.parent_content ?? tempMsg?.parent_content ?? null,
          parent_sender_name:
            newMsg.parent_sender_name ?? tempMsg?.parent_sender_name ?? null,
          status: 'sent',
          isSending: false,
          isFailed: false,
        };

        if (shouldUpsert) {
          setMessageIds((prevIds) => {
            const tempKey = newMsg.clientId
              ? String(newMsg.clientId)
              : null;
            const idx = tempKey ? prevIds.indexOf(tempKey) : -1;
            const filtered = tempKey
              ? prevIds.filter((id) => id !== tempKey)
              : prevIds;
            if (filtered.includes(newMsg.id)) return filtered;
            if (idx >= 0) {
              filtered.splice(idx, 0, newMsg.id);
              return filtered;
            }
            return [...filtered, newMsg.id];
          });
        } else if (newMsg.clientId) {
          const tempKey = String(newMsg.clientId);
          setMessageIds((prevIds) => prevIds.filter((id) => id !== tempKey));
        }

        return next;
      });

      if (!newMsg.isMe) {
        api.put(`/api/messages/rooms/${roomId}/read`).catch(() => {});
      }
    },
    [roomId],
  );

  useEffect(() => {
    if (!roomId) return;
    if (!socket) return;

    let isMounted = true;

    let handleConnectRef = null;
    let handleNewMessageRef = null;
    let handleReadReceiptRef = null;
    let handleDisconnectRef = null;
    let handleConnectErrorRef = null;
    let handleUserTypingRef = null;
    let handleUserStopTypingRef = null;

    const connect = async () => {
      await socket.connectSocket(roomId);
      if (!isMounted) return;

      const handleNewMessage = handleSocketNewMessage;
      const handleReadReceipt = handleSocketReadReceipt;
      const handleUserTyping = handleSocketUserTyping;
      const handleUserStopTyping = handleSocketUserStopTyping;

      const handleConnect = () => {
        stopPolling();
      };
      const handleDisconnect = () => {
        if (isMounted) startPolling();
      };
      const handleConnectError = () => {
        if (isMounted) startPolling();
      };

      handleConnectRef = handleConnect;
      handleNewMessageRef = handleNewMessage;
      handleReadReceiptRef = handleReadReceipt;
      handleUserTypingRef = handleUserTyping;
      handleUserStopTypingRef = handleUserStopTyping;
      handleDisconnectRef = handleDisconnect;
      handleConnectErrorRef = handleConnectError;

      socket.on('connect', handleConnect);
      socket.on('new_message', handleNewMessage);
      socket.on('read_receipt', handleReadReceipt);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError);
      socket.on('user_typing', handleUserTyping);
      socket.on('user_stop_typing', handleUserStopTyping);
    };

    connect();

    return () => {
      isMounted = false;

      if (handleConnectRef) socket.off('connect', handleConnectRef);
      if (handleNewMessageRef) socket.off('new_message', handleNewMessageRef);
      if (handleReadReceiptRef) socket.off('read_receipt', handleReadReceiptRef);
      if (handleDisconnectRef) socket.off('disconnect', handleDisconnectRef);
      if (handleConnectErrorRef) socket.off('connect_error', handleConnectErrorRef);
      if (handleUserTypingRef) socket.off('user_typing', handleUserTypingRef);
      if (handleUserStopTypingRef)
        socket.off('user_stop_typing', handleUserStopTypingRef);

      Array.from(pendingClientIdTimeoutsRef.current.values()).forEach((t) =>
        clearTimeout(t),
      );
      pendingClientIdTimeoutsRef.current.clear();

      socket.disconnectSocket?.();
      stopPolling();
    };
  }, [
    roomId,
    socket,
    handleSocketNewMessage,
    handleSocketReadReceipt,
    handleSocketUserTyping,
    handleSocketUserStopTyping,
    startPolling,
    stopPolling,
  ]);

  // ─────────────────────────────────────────────
  // 4) 페이징 (위로 로딩)
  // ─────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!roomId) return;
    if (!hasMore) return;
    if (isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      if (!oldestIdRef.current) return;

      const res = await api.get(
        `/api/messages/rooms/${roomId}?before=${oldestIdRef.current}&limit=30`,
      );

      const msgs = res.data?.data || [];
      if (!Array.isArray(msgs) || msgs.length === 0) {
        setHasMore(false);
        return;
      }

      const meId = currentUserIdRef.current;
      const mapped = msgs.map((m) => normalizeMessage(m, meId));
      const newIds = mapped.map((m) => m.id);

      setMessagesById((prevById) => {
        const next = { ...prevById };
        mapped.forEach((m) => {
          next[m.id] = m;
        });
        return next;
      });

      // 오름차순 유지: 더 과거(더 작은 id)가 들어오면 앞(prepend)
      setMessageIds((prevIds) => {
        const uniqueNewIds = newIds.filter((id) => !prevIds.includes(id));
        if (uniqueNewIds.length === 0) return prevIds;
        return [...uniqueNewIds, ...prevIds];
      });

      oldestIdRef.current = mapped[0]?.id ?? oldestIdRef.current;
      setHasMore(Boolean(res.data?.hasMore));
    } catch (e) {
      console.error('[useChat][Pagination] 로딩 실패:', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [roomId, hasMore, isLoadingMore]);

  // ─────────────────────────────────────────────
  // 5) 전송 (Optimistic UI 포함)
  // ─────────────────────────────────────────────
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

      setMessagesById((prevById) => ({
        ...prevById,
        [clientId]: optimisticMsg,
      }));

      setMessageIds((prevIds) => {
        if (prevIds.includes(clientId)) return prevIds;
        return [...prevIds, clientId];
      });

      try {
        const formData = new FormData();
        if (trimmed) formData.append('content', trimmed);
        imgArr.forEach((uri, index) => {
          formData.append('images', {
            uri,
            type: 'image/jpeg',
            name: `image_${index}.jpg`,
          });
        });
        formData.append('clientId', clientId);
        if (parentId) formData.append('parent_message_id', parentId);

        await api.post(
          `/api/messages/rooms/${roomId}/messages`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        ).then((res) => {
          const m = res.data?.data;
          if (!m) return;

          const serverMsg = normalizeMessage(m, currentUserIdRef.current);
          const serverId = String(serverMsg.id);
          serverMsg.isSending = false;
          serverMsg.isFailed = false;
          serverMsg.status = 'sent';

          // 소켓 미도착 대비로 5초 뒤에만 교체
          const timeoutId = setTimeout(() => {
            setMessagesById((prevById) => {
              if (!prevById[clientId]) return prevById;
              const tempMsg = prevById[clientId];
              const { [clientId]: temp, ...rest } = prevById;
              return {
                ...rest,
                [serverId]: {
                  ...serverMsg,
                  parent_message_id:
                    serverMsg.parent_message_id ?? tempMsg?.parent_message_id ?? null,
                  parent_content:
                    serverMsg.parent_content ?? tempMsg?.parent_content ?? null,
                  parent_sender_name:
                    serverMsg.parent_sender_name ?? tempMsg?.parent_sender_name ?? null,
                  status: 'sent',
                  isSending: false,
                  isFailed: false,
                },
              };
            });

            setMessageIds((prevIds) => {
              const idx = prevIds.indexOf(clientId);
              const filtered = prevIds.filter((id) => id !== clientId);
              if (filtered.includes(serverId)) return filtered;
              if (idx >= 0) {
                filtered.splice(idx, 0, serverId);
                return filtered;
              }
              return [...filtered, serverId];
            });

            pendingClientIdTimeoutsRef.current.delete(clientId);
          }, 5000);

          pendingClientIdTimeoutsRef.current.set(clientId, timeoutId);
        });
      } catch (error) {
        console.error('[useChat] 쪽지 전송 실패:', error);
        setMessagesById((prevById) => {
          const target = prevById[clientId];
          if (!target) return prevById;
          return {
            ...prevById,
            [clientId]: {
              ...target,
              isSending: false,
              isFailed: true,
              status: 'failed',
            },
          };
        });
      }
    },
    [roomId],
  );

  // ─────────────────────────────────────────────
  // 6) 재전송
  // ─────────────────────────────────────────────
  const retryMessage = useCallback(
    async (failedMsg) => {
      if (!roomId) return;
      const clientId = String(failedMsg?.clientId ?? failedMsg?.id);
      const text = String(failedMsg?.content ?? '').trim();
      const images = Array.isArray(failedMsg?.images) ? failedMsg.images : [];
      const parentId = failedMsg?.parent_message_id
        ? String(failedMsg.parent_message_id)
        : null;

      if (!text && images.length === 0) return;

      setMessagesById((prevById) => {
        const target = prevById[clientId];
        if (!target) return prevById;
        return {
          ...prevById,
          [clientId]: {
            ...target,
            isSending: true,
            isFailed: false,
            status: 'sending',
          },
        };
      });

      try {
        const formData = new FormData();
        if (text) formData.append('content', text);
        images.forEach((uri, index) => {
          formData.append('images', {
            uri,
            type: 'image/jpeg',
            name: `image_${index}.jpg`,
          });
        });
        formData.append('clientId', clientId);
        if (parentId) formData.append('parent_message_id', parentId);

        const res = await api.post(
          `/api/messages/rooms/${roomId}/messages`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        );

        const m = res.data?.data;
        if (m) {
          const serverMsg = normalizeMessage(m, currentUserIdRef.current);
          const serverId = String(serverMsg.id);
          serverMsg.isSending = false;
          serverMsg.isFailed = false;
          serverMsg.status = 'sent';

          const timeoutId = setTimeout(() => {
            setMessagesById((prevById) => {
              if (!prevById[clientId]) return prevById;
              const tempMsg = prevById[clientId];
              const { [clientId]: temp, ...rest } = prevById;
              return {
                ...rest,
                [serverId]: {
                  ...serverMsg,
                  parent_message_id:
                    serverMsg.parent_message_id ?? tempMsg?.parent_message_id ?? null,
                  parent_content:
                    serverMsg.parent_content ?? tempMsg?.parent_content ?? null,
                  parent_sender_name:
                    serverMsg.parent_sender_name ?? tempMsg?.parent_sender_name ?? null,
                  status: 'sent',
                  isSending: false,
                  isFailed: false,
                },
              };
            });

            setMessageIds((prevIds) => {
              const idx = prevIds.indexOf(clientId);
              const filtered = prevIds.filter((id) => id !== clientId);
              if (filtered.includes(serverId)) return filtered;
              if (idx >= 0) {
                filtered.splice(idx, 0, serverId);
                return filtered;
              }
              return [...filtered, serverId];
            });

            pendingClientIdTimeoutsRef.current.delete(clientId);
          }, 5000);

          pendingClientIdTimeoutsRef.current.set(clientId, timeoutId);
        }
      } catch (error) {
        console.error('[useChat] 재전송 실패:', error);
        setMessagesById((prevById) => {
          const target = prevById[clientId];
          if (!target) return prevById;
          return {
            ...prevById,
            [clientId]: {
              ...target,
              isSending: false,
              isFailed: true,
              status: 'failed',
            },
          };
        });
      }
    },
    [roomId],
  );

  // ─────────────────────────────────────────────
  // 7) 메시지 삭제 (소프트) - 롱프레스 메뉴
  // ─────────────────────────────────────────────
  const deleteMessage = useCallback(
    async (messageId) => {
      if (String(messageId).startsWith('temp_')) return;
      try {
        const targetId = String(messageId);
        await api.delete(`/api/messages/${targetId}`);
        setMessagesById((prevById) => {
          const target = prevById[targetId];
          if (!target) return prevById;
          return { ...prevById, [targetId]: { ...target, is_deleted: true } };
        });
      } catch (e) {
        console.error('[useChat] 메시지 삭제 실패:', e);
        Alert.alert('오류', '메시지 삭제에 실패했습니다.');
      }
    },
    [],
  );

  // 단순 안전장치: unmount 시 폴링 중지
  useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    messages, // normalized array (time asc)
    isLoading,
    hasMore,
    isLoadingMore,
    sendMessage,
    loadMore,
    retryMessage,
    typingUsers,
    myId,
    deleteMessage,
  };
}


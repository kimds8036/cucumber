import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, InteractionManager } from 'react-native';
import { api } from '../../../utils/api';
import { useNotification } from '../../../context/NotificationContext';

const getCacheKey = (roomId) => `dm_chat_cache_${roomId}`;

// 초기 진입 시 최신 몇 개만 우선 로드할지
const INITIAL_FETCH_LIMIT = 30;
// 캐시에 저장할 최대 메시지 수 (과거까지 전부 저장하면 초기 진입이 무거워짐)
const CACHE_SAVE_LIMIT = 200;
// 메모리에 보관할 최대 메시지 수
const MEMORY_LIMIT = 500;
// 페이징 사이즈
const PAGE_SIZE = 30;

const getMessageSortValue = (msg) => {
  if (!msg) return Number.MIN_SAFE_INTEGER;
  // ID 기준 정렬: 더 큰 ID가 더 최신 메시지
  const idNum = Number(msg.id);
  if (!Number.isNaN(idNum)) return idNum;
  // ID가 없을 경우 생성시간 기준
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
  const isMe = meId != null && Number(m.sender_id) === Number(meId);
  const isSending = Boolean(m.isSending);
  const isFailed = Boolean(m.isFailed);
  const senderName = m.sender_name ?? m.senderName ?? (isMe ? '나' : '익명');

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
      allIds.length > INITIAL_FETCH_LIMIT
        ? allIds.slice(-INITIAL_FETCH_LIMIT) // 최신 메시지만 유지
        : allIds;
    const slicedById = {};
    slicedIds.forEach((id) => {
      if (allById[id]) slicedById[id] = allById[id];
    });

    return {
      messagesById: slicedById,
      messageIds: slicedIds,
    };
  } catch (error) {
    console.error('[useDMChat] 캐시 로드 오류', error);
    return null;
  }
}

async function saveCachedMessages(roomId, data) {
  if (!roomId || !data) return;
  try {
    const ids = Array.isArray(data.messageIds) ? data.messageIds : [];
    const byId = data.messagesById || {};

    // 캐시에 저장할 때도 과도하게 쌓이는 것을 방지 - 최신 메시지 위주로 캐시
    const slicedIds =
      ids.length > CACHE_SAVE_LIMIT ? ids.slice(-CACHE_SAVE_LIMIT) : ids; // 최신 메시지만 유지
    const slicedById = {};
    slicedIds.forEach((id) => {
      if (byId[id]) slicedById[id] = byId[id];
    });

    await AsyncStorage.setItem(
      getCacheKey(roomId),
      JSON.stringify({ messagesById: slicedById, messageIds: slicedIds }),
    );
  } catch (error) {
    console.error('[useDMChat] 캐시 저장 오류', error);
  }
}

/**
 * @param {string|number|null|undefined} roomId
 * @param {Object} socket - socketManager (`connectSocket`, `disconnectSocket`, `emit`, `on`, `off`)
 */
export default function useDMChat(roomId, socket) {
  const { refreshHasUnread } = useNotification();

  // 원자적 상태 관리 - 단일 객체로 묶어서 렌더링 최적화
  const [chatData, setChatData] = useState({
    messagesById: {},
    messageIds: [],
    hasMore: true,
    isLoadingMore: false,
    isLoading: false,
  });

  const [myId, setMyId] = useState(null);

  // 개별 상태 추출을 위한 getter
  const messagesById = chatData.messagesById;
  const messageIds = chatData.messageIds;
  const hasMore = chatData.hasMore;
  const isLoadingMore = chatData.isLoadingMore;
  const isLoading = chatData.isLoading;

  const pollRef = useRef(null);
  const oldestIdRef = useRef(null);
  const cacheSaveTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  const currentUserIdRef = useRef(null); // 소켓/타이머 클로저 방지
  const pendingClientIdTimeoutsRef = useRef(new Map());

  // roomId 변경 시 상태 즉시 초기화 및 이전 요청 취소
  useEffect(() => {
    if (!roomId) return;

    // 이전 API 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 즉시 상태 초기화 - 잔상 방지 (원자적 업데이트)
    setChatData({
      messagesById: {},
      messageIds: [],
      hasMore: true,
      isLoadingMore: false,
      isLoading: true,
    });

    // Ref 초기화
    oldestIdRef.current = null;
    currentUserIdRef.current = null;

    // 기존 타이머 정리
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [roomId]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const messages = useMemo(() => {
    // 항상 과거 -> 최신 순서(오름차순)로 고정
    const arr = messageIds.map((id) => messagesById[id]).filter(Boolean);
    arr.sort((a, b) => getMessageSortValue(a) - getMessageSortValue(b));

    // 디버그: 메시지 순서 확인
    if (arr.length > 0) {
      console.log('[useDMChat] Message order debug:', {
        totalCount: arr.length,
        firstMessage: arr[0]?.id,
        firstMessageTime: arr[0]?.createdAt,
        lastMessage: arr[arr.length - 1]?.id,
        lastMessageTime: arr[arr.length - 1]?.createdAt,
        messageIdsOrder: messageIds.slice(0, 3), // 처음 3개만 확인
      });
    }

    // 메모리 사용량 제한: 너무 많은 메시지는 메모리에서 제거
    if (arr.length > MEMORY_LIMIT) {
      const excessCount = arr.length - MEMORY_LIMIT;
      const oldestIds = arr.slice(0, excessCount).map((msg) => msg.id);

      // 상태 업데이트는 useEffect에서 처리하여 무한 루프 방지
      setTimeout(() => {
        setChatData((prev) => {
          const next = { ...prev, messagesById: { ...prev.messagesById } };
          const nextIds = prev.messageIds.filter(
            (id) => !oldestIds.includes(id),
          );
          oldestIds.forEach((id) => delete next.messagesById[id]);
          return { ...prev, messagesById: next, messageIds: nextIds };
        });
      }, 0);
    }

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
        const res = await api.get(
          `/api/dm/rooms/${roomId}?limit=${PAGE_SIZE * 2}`,
        );
        const room = res.data?.room;
        const msgs = res.data?.data || [];
        if (!room || !Array.isArray(msgs)) return;

        const meId = currentUserIdRef.current;

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
        setChatData((prev) => {
          const next = {
            ...prev,
            messagesById: { ...prev.messagesById, ...mappedById },
          };
          // optimistic/pending 덮지 않음
          Object.keys(prev.messagesById).forEach((id) => {
            const msg = prev.messagesById[id];
            if (msg && (msg.isSending || msg.isFailed)) {
              next.messagesById[id] = msg;
            }
          });
          return next;
        });

        setChatData((prev) => {
          const newIds = mappedIds.filter(
            (id) => !prev.messageIds.includes(id),
          );
          // 중복 방지를 위해 Set 사용
          const uniqueIds = [...new Set([...prev.messageIds, ...newIds])];
          return newIds.length ? { ...prev, messageIds: uniqueIds } : prev;
        });
      } catch (e) {
        console.error('[useDMChat][Poll] 폴링 오류:', e);
      }
    }, 10000); // 폴링 간격 증가로 성능 최적화
  }, [roomId]);

  // 무거운 작업을 InteractionManager로 우선순위 조정
  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;

    const init = async () => {
      // AbortController 생성
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // 화면 전환 애니메이션이 끝난 후 무거운 작업 실행
      InteractionManager.runAfterInteractions(() => {
        if (!isMounted || controller.signal.aborted) return;

        // 여기서 초기 데이터 가공 등 무거운 작업 수행
        (async () => {
          try {
            const cached = await loadCachedMessages(roomId);
            if (cached && isMounted && !controller.signal.aborted) {
              // roomId 일치 확인
              if (String(roomId) === String(roomId)) {
                setChatData((prev) => ({
                  ...prev,
                  messagesById: cached.messagesById,
                  messageIds: cached.messageIds,
                  hasMore: true,
                }));
                oldestIdRef.current = cached.messageIds[0] ?? null;
              }
            }

            const [res, meRes] = await Promise.all([
              api.get(`/api/dm/rooms/${roomId}?limit=${INITIAL_FETCH_LIMIT}`, {
                signal: controller.signal,
              }),
              api.get('/api/auth/me', { signal: controller.signal }),
            ]);

            if (controller.signal.aborted || !isMounted) return;
            const room = res.data?.room;
            const msgs = res.data?.data || [];
            const hasMoreRes = Boolean(res.data?.hasMore);

            const mePayload = meRes.data?.data;
            const meId = Number(
              mePayload?.id != null ? mePayload.id : mePayload?.userId,
            );

            // 디버그: API 응답 데이터 확인
            console.log('[useDMChat] API Response debug:', {
              roomId,
              apiEndpoint: `/api/dm/rooms/${roomId}?limit=${INITIAL_FETCH_LIMIT}`,
              responseCount: msgs.length,
              hasMore: hasMoreRes,
              meId,
              firstMessageId: msgs[0]?.id,
              firstMessageTime: msgs[0]?.created_at,
              lastMessageId: msgs[msgs.length - 1]?.id,
              lastMessageTime: msgs[msgs.length - 1]?.created_at,
            });

            if (!room || !Array.isArray(msgs) || !isMounted) return;

            if (Number.isNaN(meId)) {
              if (isMounted) {
                Alert.alert('오류', '로그인 정보를 확인할 수 없습니다.');
              }
              return;
            }

            currentUserIdRef.current = meId;
            setMyId(meId);

            msgs.sort((a, b) => {
              const ad = parseUtcToLocal(a.created_at || '');
              const bd = parseUtcToLocal(b.created_at || '');
              // 최신순(DESC)으로 정렬: 최신 메시지가 앞에 오도록
              return !ad || !bd ? 0 : bd - ad;
            });

            const normalized = {};
            // 최신순으로 정렬된 데이터를 시간순(ASC)으로 배열에 담기
            const ids = [];
            for (let i = msgs.length - 1; i >= 0; i--) {
              const m = msgs[i];
              const nm = normalizeMessage(m, meId);
              normalized[nm.id] = nm;
              ids.push(nm.id);
            }

            // 디버그: 초기 로딩 데이터 순서 확인
            console.log('[useDMChat] Initial load debug:', {
              roomId,
              messageCount: ids.length,
              oldestId: ids[0],
              newestId: ids[ids.length - 1],
              oldestTime: normalized[ids[0]]?.createdAt,
              newestTime: normalized[ids[ids.length - 1]]?.createdAt,
            });

            // roomId 일치 확인 후 상태 업데이트 (완전 교체)
            if (
              String(roomId) === String(roomId) &&
              !controller.signal.aborted
            ) {
              // 기존 데이터를 완전히 밀어내고 새 데이터로 교체
              setChatData((prev) => ({
                ...prev,
                messagesById: normalized,
                messageIds: ids,
                hasMore: hasMoreRes,
                isLoading: false,
              }));
              oldestIdRef.current = ids[0] ?? null;
            }

            try {
              await api.put(`/api/dm/rooms/${roomId}/read`);
            } catch {
              /* DM 읽음 API 미구현·오류 시 무시 */
            }

            setChatData((prev) => {
              const next = {
                ...prev,
                messagesById: { ...prev.messagesById },
              };
              Object.keys(next.messagesById).forEach((id) => {
                if (next.messagesById[id] && !next.messagesById[id].isMe) {
                  next.messagesById[id] = {
                    ...next.messagesById[id],
                    isReadByMe: true,
                  };
                }
              });
              return next;
            });

            try {
              await api.post('/api/notifications/read-by-related', {
                relatedType: 'dm_room',
                relatedId: roomId,
              });
            } catch {
              /* 알림 연동 없으면 무시 */
            }
            refreshHasUnread();
          } catch (error) {
            console.error('[useDMChat] 메시지 로드 실패:', error);
            if (isMounted) {
              Alert.alert(
                '오류',
                error?.response?.data?.message ||
                  '채팅 내역을 불러오는 중 오류가 발생했습니다.',
              );
            }
          } finally {
            if (isMounted) {
              setChatData((prev) => ({ ...prev, isLoading: false }));
            }
          }
        })();
      });
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
    }, 500); // 디바운스 시간 증가

    return () => {
      if (cacheSaveTimeoutRef.current) {
        clearTimeout(cacheSaveTimeoutRef.current);
      }
    };
  }, [roomId, messagesById, messageIds]);

  // ─────────────────────────────────────────────
  // 3) Socket.io 연결
  // ─────────────────────────────────────────────
  const handleSocketReadReceipt = useCallback(
    (payload) => {
      // roomId 일치 확인
      if (String(payload.roomId) !== String(roomId)) return;

      setChatData((prev) => {
        const next = { ...prev, messagesById: { ...prev.messagesById } };
        Object.keys(next.messagesById).forEach((id) => {
          const msg = next.messagesById[id];
          if (msg?.isMe)
            next.messagesById[id] = { ...msg, isReadByOther: true };
        });
        return next;
      });
    },
    [roomId],
  );

  const handleSocketNewMessage = useCallback(
    (payload) => {
      if (!payload?.message) return;

      // roomId 일치 확인
      if (String(payload.message.room_id) !== String(roomId)) return;

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

      setChatData((prev) => {
        const next = { ...prev, messagesById: { ...prev.messagesById } };
        const shouldUpsert = !next.messagesById[newMsg.id];
        const tempKeyForFallback = newMsg.clientId
          ? String(newMsg.clientId)
          : null;
        const tempMsg = tempKeyForFallback
          ? next.messagesById[tempKeyForFallback]
          : null;

        // optimistic temp 메시지 매칭: clientId로 temp 제거
        if (newMsg.clientId) {
          const tempKey = String(newMsg.clientId);
          if (next.messagesById[tempKey]) delete next.messagesById[tempKey];
        }

        next.messagesById[newMsg.id] = {
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
          const tempKey = newMsg.clientId ? String(newMsg.clientId) : null;
          const idx = tempKey ? prev.messageIds.indexOf(tempKey) : -1;
          const filtered = tempKey
            ? prev.messageIds.filter((id) => id !== tempKey)
            : prev.messageIds;

          if (filtered.includes(newMsg.id)) {
            return { ...prev, messagesById: next.messagesById };
          }

          if (idx >= 0) {
            filtered.splice(idx, 0, newMsg.id);
            return {
              ...prev,
              messagesById: next.messagesById,
              messageIds: filtered,
            };
          }

          // 중복 방지를 위해 Set 사용
          const uniqueIds = [...new Set([...filtered, newMsg.id])];
          return {
            ...prev,
            messagesById: next.messagesById,
            messageIds: uniqueIds,
          };
        } else if (newMsg.clientId) {
          const tempKey = String(newMsg.clientId);
          return {
            ...prev,
            messagesById: next.messagesById,
            messageIds: prev.messageIds.filter((id) => id !== tempKey),
          };
        }

        return { ...prev, messagesById: next.messagesById };
      });

      if (!newMsg.isMe) {
        api.put(`/api/dm/rooms/${roomId}/read`).catch(() => {});
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

    const connect = async () => {
      await socket.connectSocket(roomId);
      if (!isMounted) return;

      const handleNewMessage = handleSocketNewMessage;
      const handleReadReceipt = handleSocketReadReceipt;

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
      handleDisconnectRef = handleDisconnect;
      handleConnectErrorRef = handleConnectError;

      socket.on('connect', handleConnect);
      socket.on('new_message', handleNewMessage);
      socket.on('read_receipt', handleReadReceipt);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError);
    };

    connect();

    return () => {
      isMounted = false;

      if (handleConnectRef) socket.off('connect', handleConnectRef);
      if (handleNewMessageRef) socket.off('new_message', handleNewMessageRef);
      if (handleReadReceiptRef)
        socket.off('read_receipt', handleReadReceiptRef);
      if (handleDisconnectRef) socket.off('disconnect', handleDisconnectRef);
      if (handleConnectErrorRef)
        socket.off('connect_error', handleConnectErrorRef);

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

    setChatData((prev) => ({ ...prev, isLoadingMore: true }));

    try {
      if (!oldestIdRef.current) {
        setChatData((prev) => ({ ...prev, isLoadingMore: false }));
        return;
      }

      const res = await api.get(
        `/api/dm/rooms/${roomId}?before=${oldestIdRef.current}&limit=${PAGE_SIZE}`,
      );

      const msgs = res.data?.data || [];
      if (!Array.isArray(msgs) || msgs.length === 0) {
        setChatData((prev) => ({
          ...prev,
          isLoadingMore: false,
          hasMore: false,
        }));
        return;
      }

      const meId = currentUserIdRef.current;
      const mapped = msgs.map((m) => normalizeMessage(m, meId));
      const chronological = [...mapped].reverse(); // 서버 DESC → 클라이언트 ASC
      const newIds = chronological.map((m) => m.id);

      setChatData((prev) => {
        // 1. messagesById 객체를 먼저 복사
        const nextMessagesById = { ...prev.messagesById };

        // 2. 새로운 메시지들을 복사된 객체에 하나씩 추가
        chronological.forEach((m) => {
          nextMessagesById[m.id] = m;
        });

        // 페이징은 "과거 데이터 prepend" 형태로 병합해야
        // 유지 중인 가시 영역 인덱스가 흔들리지 않는다.
        const newIdSet = new Set(newIds);
        const mergedIds = [
          ...newIds,
          ...prev.messageIds.filter((id) => !newIdSet.has(id)),
        ];
        // 데이터 제한: 페이징 중에는 제한을 풀고, 앱 새로고침/방 이동 시에만 적용
        const finalIds =
          !isLoadingMore && mergedIds.length > MEMORY_LIMIT
            ? mergedIds.slice(-MEMORY_LIMIT)
            : mergedIds;

        // 3. 상태 리턴 시 구조가 중첩되지 않도록 주의
        return {
          ...prev,
          messagesById: nextMessagesById, // ✅ 정확히 객체만 교체
          messageIds: finalIds,
        };
      });

      // 인덱스 0이 항상 과거라는 보장이 없으므로, ID 숫자 중 가장 작은 값을 찾음
      const minId = Math.min(...mapped.map((m) => Number(m.id)));
      if (minId && minId !== Infinity) {
        oldestIdRef.current = minId.toString();
      }
      setChatData((prev) => ({ ...prev, hasMore: Boolean(res.data?.hasMore) }));
    } catch (e) {
      console.error('[useDMChat][Pagination] 로딩 실패:', e);
    } finally {
      setChatData((prev) => ({ ...prev, isLoadingMore: false }));
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
        senderId:
          currentUserIdRef.current != null
            ? Number(currentUserIdRef.current)
            : null,
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

      setChatData((prev) => ({
        ...prev,
        messagesById: { ...prev.messagesById, [clientId]: optimisticMsg },
        messageIds: [...prev.messageIds, clientId],
      }));

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

        await api
          .post(`/api/dm/rooms/${roomId}/messages`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          .then((res) => {
            const m = res.data?.data;
            if (!m) return;

            const serverMsg = normalizeMessage(m, currentUserIdRef.current);
            const serverId = String(serverMsg.id);
            serverMsg.isSending = false;
            serverMsg.isFailed = false;
            serverMsg.status = 'sent';

            // 소켓 미도착 대비로 5초 뒤에만 교체
            const timeoutId = setTimeout(() => {
              setChatData((prev) => {
                if (!prev.messagesById[clientId]) return prev;
                const tempMsg = prev.messagesById[clientId];
                const { [clientId]: temp, ...rest } = prev.messagesById;
                return {
                  ...prev,
                  messagesById: {
                    ...rest,
                    [serverId]: {
                      ...serverMsg,
                      parent_message_id:
                        serverMsg.parent_message_id ??
                        tempMsg?.parent_message_id ??
                        null,
                      parent_content:
                        serverMsg.parent_content ??
                        tempMsg?.parent_content ??
                        null,
                      parent_sender_name:
                        serverMsg.parent_sender_name ??
                        tempMsg?.parent_sender_name ??
                        null,
                      status: 'sent',
                      isSending: false,
                      isFailed: false,
                    },
                  },
                  messageIds: prev.messageIds.map((id) =>
                    id === clientId ? serverId : id,
                  ),
                };
              });

              pendingClientIdTimeoutsRef.current.delete(clientId);
            }, 5000);

            pendingClientIdTimeoutsRef.current.set(clientId, timeoutId);
          });
      } catch (error) {
        console.error('[useDMChat] 쪽지 전송 실패:', error);
        setChatData((prev) => {
          const target = prev.messagesById[clientId];
          if (!target) return prev;
          return {
            ...prev,
            messagesById: {
              ...prev.messagesById,
              [clientId]: {
                ...target,
                isSending: false,
                isFailed: true,
                status: 'failed',
              },
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

      setChatData((prev) => {
        const target = prev.messagesById[clientId];
        if (!target) return prev;
        return {
          ...prev,
          messagesById: {
            ...prev.messagesById,
            [clientId]: {
              ...target,
              isSending: true,
              isFailed: false,
              status: 'sending',
            },
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
          `/api/dm/rooms/${roomId}/messages`,
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
            setChatData((prev) => {
              if (!prev.messagesById[clientId]) return prev;
              const tempMsg = prev.messagesById[clientId];
              const { [clientId]: temp, ...rest } = prev.messagesById;
              return {
                ...prev,
                messagesById: {
                  ...rest,
                  [serverId]: {
                    ...serverMsg,
                    parent_message_id:
                      serverMsg.parent_message_id ??
                      tempMsg?.parent_message_id ??
                      null,
                    parent_content:
                      serverMsg.parent_content ??
                      tempMsg?.parent_content ??
                      null,
                    parent_sender_name:
                      serverMsg.parent_sender_name ??
                      tempMsg?.parent_sender_name ??
                      null,
                    status: 'sent',
                    isSending: false,
                    isFailed: false,
                  },
                },
                messageIds: prev.messageIds.map((id) =>
                  id === clientId ? serverId : id,
                ),
              };
            });

            pendingClientIdTimeoutsRef.current.delete(clientId);
          }, 5000);

          pendingClientIdTimeoutsRef.current.set(clientId, timeoutId);
        }
      } catch (error) {
        console.error('[useDMChat] 재전송 실패:', error);
        setChatData((prev) => {
          const target = prev.messagesById[clientId];
          if (!target) return prev;
          return {
            ...prev,
            messagesById: {
              ...prev.messagesById,
              [clientId]: {
                ...target,
                isSending: false,
                isFailed: true,
                status: 'failed',
              },
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
  const deleteMessage = useCallback(async (messageId) => {
    if (String(messageId).startsWith('temp_')) return;
    try {
      const targetId = String(messageId);
      await api.delete(`/api/dm/messages/${targetId}`);
      setChatData((prev) => {
        const target = prev.messagesById[targetId];
        if (!target) return prev;
        return {
          ...prev,
          messagesById: {
            ...prev.messagesById,
            [targetId]: { ...target, is_deleted: true },
          },
        };
      });
    } catch (e) {
      console.error('[useDMChat] 메시지 삭제 실패:', e);
      Alert.alert('오류', '메시지 삭제에 실패했습니다.');
    }
  }, []);

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
    myId,
    deleteMessage,
  };
}

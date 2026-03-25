import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Entypo } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import SubHeader from '../frame/subHeader';
import CommentInput from '../../components/CommentInput.jsx';
import { colors } from '../../styles/colors';
import { createDetailStyles, getNormalize as getBoardNormalize } from '../../styles/board.style';
import { createChatStyles } from '../../styles/message.style';
import MessageTabIcon from '../../assets/Group 166.svg';
import { api } from '../../utils/api';
import { useNotification } from '../../context/NotificationContext';
import { connectSocket, disconnectSocket, emit as socketEmit, on as socketOn, off as socketOff } from './socketManager';
import ImageViewer from './ImageViewer';

// ─────────────────────────────────────────────
// 1. 게시글 캐시
// ─────────────────────────────────────────────
const postCache = {};

// ─────────────────────────────────────────────
// 2. 날짜 유틸
// ─────────────────────────────────────────────
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
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatChatDateBanner(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime())
    ? ''
    : dt.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getDateKey(d) {
  if (!d) return '';
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// ─────────────────────────────────────────────
// 3. 메시지 정규화 (raw API 응답 → UI 모델)
// ─────────────────────────────────────────────
function normalizeMessage(m, meId) {
  const createdAt = m.created_at || '';
  const d = parseUtcToLocal(createdAt);
  const isMe = meId != null && m.sender_id === meId;
  const isSending = Boolean(m.isSending);
  const isFailed = Boolean(m.isFailed);
  return {
    id: String(m.id),
    clientId: m.client_id ?? m.clientId ?? null,
    isMe,
    content: m.content,
    images: (() => {
      const raw = m.images;
      if (Array.isArray(raw)) return raw.filter((u) => typeof u === 'string');
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed.filter((u) => typeof u === 'string') : [];
        } catch {
          return [];
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

// ─────────────────────────────────────────────
// 4. 날짜 배너를 배열 중간에 미리 삽입
//    → 렌더 시점에 prev 비교 없이 타입으로 분기
// ─────────────────────────────────────────────
function injectDateBanners(msgs) {
  // msgs: 시간순(오름차순) 정렬된 배열 가정
  const result = [];
  let lastDateKey = null;
  for (const msg of msgs) {
    if (msg.dateKey && msg.dateKey !== lastDateKey) {
      result.push({ id: `banner-${msg.dateKey}`, type: 'dateBanner', dateKey: msg.dateKey });
      lastDateKey = msg.dateKey;
    }
    result.push({ ...msg, type: 'message' });
  }
  return result;
}

function getMsgTimeMs(msg) {
  if (!msg) return Number.MAX_SAFE_INTEGER;
  const c = msg.createdAt;
  if (c instanceof Date) return c.getTime();
  if (typeof c === 'string') {
    const d = parseUtcToLocal(c);
    return d ? d.getTime() : Number.MAX_SAFE_INTEGER;
  }
  return Number.MAX_SAFE_INTEGER;
}

// ─────────────────────────────────────────────
// 5. 개별 메시지 컴포넌트 (React.memo로 리렌더 방지)
// ─────────────────────────────────────────────
const areImagesEqual = (a, b) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const MessageItem = React.memo(
  ({ msg, chatStyles, normalize, onRetry, onDeleteMessage, onImagePress }) => {
  if (msg.type === 'dateBanner') {
    return (
      <View style={{ alignItems: 'center', marginVertical: normalize(8) }}>
        <View
          style={{
            paddingHorizontal: normalize(10),
            paddingVertical: normalize(4),
            borderRadius: normalize(10),
            backgroundColor: '#EEE',
          }}
        >
          <Text style={{ fontSize: normalize(11), color: colors.textSecondary }}>
            {formatChatDateBanner(msg.dateKey)}
          </Text>
        </View>
      </View>
    );
  }

  const isImageOnly = msg.images && msg.images.length > 0 && !msg.content && !msg.is_deleted;

  if (msg.isMe) {
    return (
      <View style={chatStyles.chatRowUser}>
        <View style={chatStyles.userBubbleAndTime}>
          <View style={chatStyles.userTimeColumn}>
            {msg.status === 'failed' || msg.isFailed ? (
              <TouchableOpacity
                onPress={() => onRetry(msg)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}
              >
                <Text style={{ color: colors.alert, fontSize: normalize(14), fontWeight: '700' }}>!</Text>
              </TouchableOpacity>
            ) : (
              <>
                {msg.isReadByOther === false && !msg.isSending && (
                  <Text style={chatStyles.chatUnreadCount}>1</Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                  {(msg.status === 'sending' || msg.isSending) && <ActivityIndicator size="small" color="#999" />}
                  <Text style={chatStyles.chatTimeUser}>
                    {msg.status === 'sending' || msg.isSending ? '...' : msg.time}
                  </Text>
                </View>
              </>
            )}
          </View>
          <TouchableOpacity
            style={[
              !isImageOnly
                ? chatStyles.userBubble
                : { backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0 },
              msg.isFailed && { borderWidth: 1, borderColor: colors.alert },
              msg.is_deleted && { backgroundColor: colors.disabled },
            ]}
            onLongPress={() => {
              if (msg.is_deleted || msg.isSending) return;
              Alert.alert(
                '메시지 삭제',
                '이 메시지를 삭제하시겠어요?\n상대방 화면에서도 삭제됩니다.',
                [
                  { text: '취소', style: 'cancel' },
                  {
                    text: '삭제',
                    style: 'destructive',
                    onPress: () => onDeleteMessage?.(msg.id),
                  },
                ]
              );
            }}
            activeOpacity={0.8}
          >
            {msg.images && msg.images.length > 0 && !msg.is_deleted && (
              msg.images.map((uri, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.9}
                  onPress={() => onImagePress?.(uri)}
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 12,
                    marginBottom: 4,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={{ uri: uri }}
                    style={{ width: 200, height: 200, borderRadius: 12 }}
                    contentFit="cover"
                    placeholder={{ blurhash: 'LGFFaXYk^6#M@-5c,1J5@[or[Q6.' }}
                    transition={200}
                  />
                  {msg.isSending && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                      }}
                    >
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
            {msg.is_deleted ? (
              <Text style={chatStyles.userBubbleText}>삭제된 메시지입니다.</Text>
            ) : msg.content ? (
              <Text style={chatStyles.userBubbleText}>{msg.content}</Text>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[chatStyles.chatRowOpponent, { flexDirection: 'row', alignItems: 'flex-start' }]}>
      {/* 프로필 아이콘 */}
      <View style={chatStyles.chatProfileCircle}>
        <MessageTabIcon width={normalize(28)} height={normalize(28)} color={colors.green} />
      </View>

      {/* 오른쪽 영역(익명 -> 이미지 -> 시간) */}
      <View style={chatStyles.opponentNameAndBubble}>
        <Text style={chatStyles.opponentName}>익명</Text>

        {/* 이미지 전용(말풍선 없음) */}
        {isImageOnly ? (
          <View style={{ alignItems: 'flex-start' }}>
            {msg.images &&
              msg.images.length > 0 &&
              !msg.is_deleted &&
              msg.images.map((uri, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.9}
                  onPress={() => onImagePress?.(uri)}
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 12,
                    marginBottom: 4,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={{ uri: uri }}
                    style={{ width: 200, height: 200, borderRadius: 12 }}
                    contentFit="cover"
                    placeholder={{ blurhash: 'LGFFaXYk^6#M@-5c,1J5@[or[Q6.' }}
                    transition={200}
                  />
                  {msg.isSending && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                      }}
                    >
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
          </View>
        ) : (
          // 텍스트(또는 삭제 메시지)인 경우: 기존 말풍선 구조 유지
          <>
            {(msg.content || msg.is_deleted) ? (
              <View style={chatStyles.opponentBubble}>
                {msg.images && msg.images.length > 0 && !msg.is_deleted && (
                  msg.images.map((uri, index) => (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.9}
                      onPress={() => onImagePress?.(uri)}
                      style={{
                        width: 200,
                        height: 200,
                        borderRadius: 12,
                        marginBottom: 4,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <Image
                        source={{ uri: uri }}
                        style={{ width: 200, height: 200, borderRadius: 12 }}
                        contentFit="cover"
                        placeholder={{ blurhash: 'LGFFaXYk^6#M@-5c,1J5@[or[Q6.' }}
                        transition={200}
                      />
                      {msg.isSending && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                          }}
                        >
                          <ActivityIndicator color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                )}
                {msg.is_deleted ? (
                  <Text
                    style={[
                      chatStyles.opponentBubbleText,
                      { color: colors.textSecondary, fontStyle: 'italic' },
                    ]}
                  >
                    삭제된 메시지입니다.
                  </Text>
                ) : msg.content ? (
                  <Text style={chatStyles.opponentBubbleText}>{msg.content}</Text>
                ) : null}
              </View>
            ) : null}
          </>
        )}

        {/* 시간 표시는 이미지/말풍선 아래쪽 */}
        <View style={chatStyles.opponentTimeRow}>
          <Text style={chatStyles.chatTimeOpponent}>{msg.time}</Text>
        </View>
      </View>
    </View>
  );
  },
  (prevProps, nextProps) => {
    const pm = prevProps.msg;
    const nm = nextProps.msg;

    return (
      String(pm.id) === String(nm.id) &&
      pm.content === nm.content &&
      pm.is_deleted === nm.is_deleted &&
      pm.isSending === nm.isSending &&
      pm.isReadByOther === nm.isReadByOther &&
      pm.isReadByMe === nm.isReadByMe &&
      areImagesEqual(pm.images, nm.images)
    );
  }
);

// ─────────────────────────────────────────────
// 6. 메인 Chat 컴포넌트
// ─────────────────────────────────────────────
export default function Chat({ navigation, route }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getBoardNormalize(width), [width]);
  const detailStyles = useMemo(() => createDetailStyles(width, normalize), [width, normalize]);
  const chatStyles = useMemo(() => createChatStyles(width, normalize), [width, normalize]);

  const roomId = route?.params?.roomId;
  const { refreshHasUnread } = useNotification();

  const [post, setPost] = useState(null);
  const [messagesById, setMessagesById] = useState({});
  const [messageIds, setMessageIds] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [chatImages, setChatImages] = useState([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewerUri, setViewerUri] = useState(null);
  const [typingUsers, setTypingUsers] = useState({}); // { [userId]: userName }

  const handleImagePress = useCallback((uri) => {
    setViewerUri(uri);
  }, []);

  const handleInputChange = useCallback(
    (text) => {
      setInputText(text);

      // 소켓 연결 전이면 타이핑 표시만 스킵
      if (!roomId) return;
      const myId = currentUserIdRef.current;
      if (myId == null) return;

      const userName = '익명';

      // 입력이 비면 즉시 타이핑 종료
      if (!text?.trim()) {
        if (isTypingRef.current) {
          socketEmit('typing_stop', { roomId, userId: myId });
          isTypingRef.current = false;
        }
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        return;
      }

      // 타이핑 시작(연속 타이핑 중에는 1회만 emit)
      if (!isTypingRef.current) {
        socketEmit('typing_start', { roomId, userId: myId, userName });
        isTypingRef.current = true;
      }

      // 1.5초 후 자동으로 타이핑 종료
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketEmit('typing_stop', { roomId, userId: myId });
        isTypingRef.current = false;
        typingTimeoutRef.current = null;
      }, 1500);
    },
    [roomId]
  );

  const insets = useSafeAreaInsets();
  const pollRef = useRef(null);
  const oldestIdRef = useRef(null);
  const currentUserIdRef = useRef(null);           // 클로저 문제 방지용 ref
  const pendingClientIdTimeoutsRef = useRef(new Map()); // clientId별 소켓 대기 타임아웃
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // currentUserId 변경 시 ref도 동기화
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // 방이 바뀌면 타이핑 표시 초기화
  useEffect(() => {
    setTypingUsers({});
    isTypingRef.current = false;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [roomId]);

  // 키보드 높이 추적 (Android/iOS 공통)
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e?.endCoordinates?.height ?? 0),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // ── 메시지 목록 로드 (최초 1회) ──
  useEffect(() => {
    if (!roomId) return;

    const fetchRoom = async () => {
      try {
        const res = await api.get(`/api/messages/rooms/${roomId}?limit=30`);
        const room = res.data?.room;
        const msgs = res.data?.data || [];
        const hasMoreRes = Boolean(res.data?.hasMore);
        if (!room || !Array.isArray(msgs)) return;

        const otherId = room.other_user_id;
        const meId =
          room.user1_id === otherId ? room.user2_id :
          room.user2_id === otherId ? room.user1_id : null;
        setCurrentUserId(meId);

        // 게시글 정보
        const postId = room.post_id;
        let initialPost = {
          id: postId,
          author: '익명',
          time: '',
          location: '',
          content: room.post_content || '',
          likes: 0,
          comments: 0,
          isLiked: false,
        };
        if (postId && postCache[postId]) {
          initialPost = { ...initialPost, ...postCache[postId] };
        } else if (postId) {
          try {
            const postRes = await api.get(`/api/posts/${postId}`);
            const pd = postRes.data?.data;
            if (pd) {
              const cached = { likes: pd.like_count, comments: pd.comment_count, isLiked: Boolean(pd.isLiked) };
              postCache[postId] = cached;
              initialPost = { ...initialPost, ...cached };
            }
          } catch (e) {
            console.error('채팅 내 게시글 정보 로드 실패:', e);
          }
        }
        setPost(initialPost);

        // 메시지 정렬 & 정규화
        msgs.sort((a, b) => {
          const ad = parseUtcToLocal(a.created_at || '');
          const bd = parseUtcToLocal(b.created_at || '');
          return (!ad || !bd) ? 0 : ad - bd;
        });
        const normalized = {};
        const ids = [];
        msgs.forEach((m) => {
          const nm = normalizeMessage(m, meId);
          normalized[nm.id] = nm;
          ids.push(nm.id);
        });
        setMessagesById(normalized);
        setMessageIds(ids);
        setHasMore(hasMoreRes);
        oldestIdRef.current = ids[0] ?? null; // 오름차순 기준: 첫 id가 가장 오래된 id

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
          await api.post('/api/notifications/read-by-related', {
            relatedType: 'message_room',
            relatedId: roomId,
          }).catch(() => {});
          refreshHasUnread();
        } catch { /* ignore */ }

      } catch (error) {
        console.error('채팅 내역 로드 실패:', error);
        Alert.alert('오류', error.response?.data?.message || '채팅 내역을 불러오는 중 오류가 발생했습니다.');
      }
    };

    fetchRoom();
  }, [roomId]);

  // ─────────────────────────────────────────────
  // 7. Socket.io 연결 (socketManager 싱글톤 사용)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;

    const connect = async () => {
      const socket = await connectSocket(roomId);
      if (!isMounted) return;

      // 연결 성공 시 폴링 중지
      socketOn('connect', () => {
        console.log('[Socket.io] 연결 성공');
        stopPolling();
      });

      socketOn('new_message', (payload) => {
        console.log('소켓 payload images:', JSON.stringify(payload?.message?.images));
        if (!payload?.message) return;

        const meId = currentUserIdRef.current;
        const newMsg = normalizeMessage(payload.message, meId);

        // 소켓이 clientId 매칭을 처리하면, API 성공 타임아웃도 함께 clear
        if (newMsg.clientId) {
          const tempKey = String(newMsg.clientId);
          const timeoutId = pendingClientIdTimeoutsRef.current.get(tempKey);
          if (timeoutId) {
            clearTimeout(timeoutId);
            pendingClientIdTimeoutsRef.current.delete(tempKey);
          }
        }

        // messagesById 기반 중복 체크
        setMessagesById((prevById) => {
          const next = { ...prevById };

          // optimistic temp 메시지 매칭: clientId로 temp 제거
          if (newMsg.clientId) {
            const tempKey = String(newMsg.clientId);
            if (next[tempKey]) delete next[tempKey];
          }

          const shouldUpsert = !next[newMsg.id];
          next[newMsg.id] = {
            ...newMsg,
            status: 'sent',
            isSending: false,
            isFailed: false,
          };

          // id가 새로 추가되었을 때만 ids 반영(중복 방지)
          if (shouldUpsert) {
            setMessageIds((prevIds) => {
              // temp가 있던 위치에 실제 id 치환
              const tempKey = newMsg.clientId ? String(newMsg.clientId) : null;
              const idx = tempKey ? prevIds.indexOf(tempKey) : -1;
              const filtered = tempKey ? prevIds.filter((id) => id !== tempKey) : prevIds;
              if (filtered.includes(newMsg.id)) return filtered;
              if (idx >= 0) {
                filtered.splice(idx, 0, newMsg.id);
                return filtered;
              }
              return [...filtered, newMsg.id];
            });
          } else {
            // temp만 제거된 케이스도 있으니 ids는 안전하게 유지(필요시 제거만)
            if (newMsg.clientId) {
              const tempKey = String(newMsg.clientId);
              setMessageIds((prevIds) => prevIds.filter((id) => id !== tempKey));
            }
          }

          return next;
        });

        if (!newMsg.isMe) {
          api.put(`/api/messages/rooms/${roomId}/read`).catch(() => {});
        }
      });

      socketOn('read_receipt', (payload) => {
        if (String(payload.roomId) !== String(roomId)) return;
        setMessagesById((prevById) => {
          const next = { ...prevById };
          Object.keys(next).forEach((id) => {
            const msg = next[id];
            if (msg?.isMe) next[id] = { ...msg, isReadByOther: true };
          });
          return next;
        });
      });

      socketOn('disconnect', () => {
        console.warn('[Socket.io] 연결 종료');
        if (isMounted) startPolling();
      });

      socketOn('connect_error', (err) => {
        console.error('[Socket.io] 연결 오류:', err.message);
        if (isMounted) startPolling();
      });

      socketOn('user_typing', ({ userId, userName }) => {
        if (!userId) return;
        setTypingUsers((prev) => ({ ...prev, [userId]: userName ?? '익명' }));
      });

      socketOn('user_stop_typing', ({ userId }) => {
        if (!userId) return;
        setTypingUsers((prev) => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      });
    };

    connect();

    return () => {
      isMounted = false;
      // 등록된 socket.on 이벤트 전부 off
      socketOff('connect');
      socketOff('new_message');
      socketOff('read_receipt');
      socketOff('disconnect');
      socketOff('connect_error');
      socketOff('user_typing');
      socketOff('user_stop_typing');
      disconnectSocket();
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ─────────────────────────────────────────────
  // 8. 폴링 (소켓 연결 전/실패 시 fallback)
  // ─────────────────────────────────────────────
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
          room.user1_id === otherId ? room.user2_id :
          room.user2_id === otherId ? room.user1_id : null;

        msgs.sort((a, b) => {
          const ad = parseUtcToLocal(a.created_at || '');
          const bd = parseUtcToLocal(b.created_at || '');
          return (!ad || !bd) ? 0 : ad - bd;
        });

        const mapped = msgs.map((m) => normalizeMessage(m, meId));
        const mappedById = {};
        const mappedIds = [];
        mapped.forEach((m) => {
          mappedById[m.id] = m;
          mappedIds.push(m.id);
        });

        // 폴링은 "서버에서 새로 생긴 메시지만" union으로 반영하고,
        // 이미 pagination으로 받아온 과거 메시지(존재하는 id)는 유지한다.
        setMessagesById((prevById) => {
          const next = { ...prevById, ...mappedById };
          // optimistic/pending는 덮지 않음(소켓이 해결할 때까지 유지)
          Object.keys(prevById).forEach((id) => {
            const msg = prevById[id];
            if (msg && (msg.isSending || msg.isFailed)) next[id] = msg;
          });
          return next;
        });

        setMessageIds((prevIds) => {
          const newIds = mappedIds.filter((id) => !prevIds.includes(id));
          // 서버 최신 fetch는 대체로 prevIds 뒤(더 큰 id)에 붙는다.
          return newIds.length ? [...prevIds, ...newIds] : prevIds;
        });
      } catch (e) {
        console.error('[Poll] 폴링 오류:', e);
      }
    }, 8000);
  }, [roomId]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ── 언마운트 시 폴링 정리 ──
  useEffect(() => () => stopPolling(), [stopPolling]);

  // ─────────────────────────────────────────────
  // 8-1. 위로 로딩(페이징: 더 과거 메시지)
  // ─────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!roomId) return;
    if (!hasMore) return;
    if (isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      if (!oldestIdRef.current) return;

      const res = await api.get(
        `/api/messages/rooms/${roomId}?before=${oldestIdRef.current}&limit=30`
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
      console.error('[Pagination] 로딩 실패:', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [roomId, hasMore, isLoadingMore]);

  // ─────────────────────────────────────────────
  // 9. 메시지 전송
  // ─────────────────────────────────────────────
  const handleSendMessage = useCallback(async (content) => {
    const text = (content || inputText).trim();
    if (!text && chatImages.length === 0) return;
    if (!roomId) return;

    const clientId = `temp_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const d = parseUtcToLocal(nowIso);

    const optimisticMsg = {
      id: clientId,
      clientId,
      type: 'message',
      isMe: true,
      content: text || null,
      images: [...chatImages],
      is_deleted: false,
      createdAt: nowIso,
      dateKey: getDateKey(d),
      time: formatChatTime(nowIso),
      isReadByOther: false,
      isReadByMe: undefined,
      isSending: true,
      isFailed: false,
      status: 'sending',
    };

    setMessagesById((prevById) => ({ ...prevById, [clientId]: optimisticMsg }));
    setMessageIds((prevIds) => {
      if (prevIds.includes(clientId)) return prevIds;
      return [...prevIds, clientId];
    });
    setInputText('');

    try {
      const formData = new FormData();
      if (text) formData.append('content', text);
      chatImages.forEach((uri, index) => {
        formData.append('images', {
          uri,
          type: 'image/jpeg',
          name: `image_${index}.jpg`,
        });
      });
      formData.append('clientId', clientId);
      const res = await api.post(`/api/messages/rooms/${roomId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setChatImages([]);
      const m = res.data?.data;
      if (m) {
        const serverMsg = normalizeMessage(m, currentUserIdRef.current);
        const serverId = String(serverMsg.id);
        serverMsg.isSending = false;
        serverMsg.isFailed = false;
        serverMsg.status = 'sent';

        // API는 temp 교체를 하지 않고, 소켓 미도착 대비로 5초 뒤에만 교체
        const timeoutId = setTimeout(() => {
          setMessagesById((prevById) => {
            if (!prevById[clientId]) return prevById; // 이미 소켓이 처리했으면 스킵
            const { [clientId]: temp, ...rest } = prevById;
            return { ...rest, [serverId]: { ...serverMsg, status: 'sent', isSending: false, isFailed: false } };
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
      console.error('쪽지 전송 실패:', error);
      // 전송 실패 → isFailed 플래그 설정 (재전송 버튼 노출)
      setMessagesById((prevById) => {
        const target = prevById[clientId];
        if (!target) return prevById;
        return {
          ...prevById,
          [clientId]: { ...target, isSending: false, isFailed: true, status: 'failed' },
        };
      });
    }
  }, [inputText, roomId, chatImages]);

  // end

  // ─────────────────────────────────────────────
  // 10. 재전송 핸들러
  // ─────────────────────────────────────────────
  const handleRetry = useCallback(
    async (failedMsg) => {
      if (!roomId) return;
      const clientId = String(failedMsg.clientId ?? failedMsg.id);
      const text = String(failedMsg.content ?? '').trim();
      const images = Array.isArray(failedMsg.images) ? failedMsg.images : [];

      if (!text && images.length === 0) return;

      // 실패한 temp 메시지를 다시 sending으로 전환
      setMessagesById((prevById) => {
        const target = prevById[clientId];
        if (!target) return prevById;
        return {
          ...prevById,
          [clientId]: { ...target, isSending: true, isFailed: false, status: 'sending' },
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

        const res = await api.post(`/api/messages/rooms/${roomId}/messages`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

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
              const { [clientId]: temp, ...rest } = prevById;
              return { ...rest, [serverId]: { ...serverMsg, status: 'sent', isSending: false, isFailed: false } };
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
        console.error('재전송 실패:', error);
        setMessagesById((prevById) => {
          const target = prevById[clientId];
          if (!target) return prevById;
          return {
            ...prevById,
            [clientId]: { ...target, isSending: false, isFailed: true, status: 'failed' },
          };
        });
      }
    },
    [roomId]
  );

  const handleDeleteMessage = useCallback(async (messageId) => {
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
      Alert.alert('오류', '메시지 삭제에 실패했습니다.');
    }
  }, []);

  // ─────────────────────────────────────────────
  // 11. 날짜 배너가 삽입된 역순 배열 (FlatList inverted용)
  //     - injectDateBanners는 순방향에서 수행 후 reverse
  //     - 메모이제이션으로 messages 변경 시에만 재계산
  // ─────────────────────────────────────────────
  const flatData = useMemo(() => {
    const msgs = messageIds.map((id) => messagesById[id]).filter(Boolean); // 시간순
    return injectDateBanners(msgs);
  }, [messageIds, messagesById]);

  // ─────────────────────────────────────────────
  // 12. renderItem (useCallback으로 참조 안정화)
  // ─────────────────────────────────────────────
  const renderItem = useCallback(({ item }) => (
    <MessageItem
      msg={item}
      chatStyles={chatStyles}
      normalize={normalize}
      onRetry={handleRetry}
      onDeleteMessage={handleDeleteMessage}
      onImagePress={handleImagePress}
    />
  ), [chatStyles, normalize, handleRetry, handleDeleteMessage, handleImagePress]);

  const keyExtractor = useCallback((item) => String(item.id), []);
  const keyboardVerticalOffset = insets.top + normalize(48);

  const handleBack = () => navigation.goBack();
  const handleOpenPost = () => {
    if (!post?.id) return;
    navigation.navigate('BoardDetail', { post: { id: post.id }, isMyPost: false });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView
        style={[detailStyles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        {/* 헤더 */}
        <View style={{ zIndex: 1, elevation: 0, backgroundColor: colors.background }}>
          <SubHeader title="쪽지" onBack={handleBack} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#F8F9FA' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardVerticalOffset : 0}
        >
          <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
          {/* 게시글 카드 */}
          {post && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenPost}
              style={{
                backgroundColor: colors.background,
                marginHorizontal: normalize(12),
                marginTop: normalize(12),
                marginBottom: normalize(8),
                borderRadius: normalize(12),
                padding: normalize(16),
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View style={detailStyles.detailHeader}>
                <View style={detailStyles.detailAuthorRow}>
                  <Text style={detailStyles.detailAuthorAnonymous}>{post.author}</Text>
                </View>
                {post.location ? (
                  <View style={detailStyles.detailLocation}>
                    <Ionicons name="location-sharp" size={normalize(12)} color={colors.textSecondary} />
                    <Text style={detailStyles.detailLocationText}>{post.location}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[detailStyles.detailBody, { marginVertical: normalize(12) }]}>
                {post.content}
              </Text>
              <View style={{ height: 1, backgroundColor: '#F0F0F0', marginVertical: normalize(8) }} />
              <View style={detailStyles.detailFooter}>
                <View style={detailStyles.detailStats}>
                  <View style={detailStyles.detailStatItem}>
                    <FontAwesome
                      name={post?.isLiked ? 'heart' : 'heart-o'}
                      size={normalize(14)}
                      color={colors.alert}
                    />
                    <Text style={detailStyles.detailStatText}>{post.likes}</Text>
                  </View>
                  <View style={detailStyles.detailStatItem}>
                    <Ionicons name="chatbubble-outline" size={normalize(15)} color={colors.primary} />
                    <Text style={detailStyles.detailStatText}>{post.comments}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* 타이핑 인디케이터(상대 입력 중) */}
          {Object.values(typingUsers).length > 0 && (
            <View
              style={{
                paddingHorizontal: normalize(16),
                paddingVertical: normalize(6),
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#999', fontSize: 12 }}>
                {Object.values(typingUsers)[0]}이(가) 입력 중...
              </Text>
              <ActivityIndicator size="small" color="#999" style={{ marginLeft: 4 }} />
            </View>
          )}

          {/* 채팅 FlatList */}
          <FlashList
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: normalize(12),
              paddingBottom: normalize(10),
              paddingTop: normalize(8),
            }}
            data={flatData}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            inverted
            estimatedItemSize={120}
            onEndReached={loadMore}
            onEndReachedThreshold={0.2}
            ListFooterComponent={
              isLoadingMore ? (
                <View style={{ paddingVertical: normalize(12) }}>
                  <ActivityIndicator color={colors.textSecondary} />
                </View>
              ) : null
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            removeClippedSubviews={false}
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={15}
            maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
          />

          {/* 이미지 뷰어(전체화면 + pinch zoom) */}
          <ImageViewer
            visible={Boolean(viewerUri)}
            uri={viewerUri}
            onClose={() => setViewerUri(null)}
          />

          {/* 입력창 */}
          <View
            style={{
              backgroundColor: colors.background,
              paddingBottom:
                keyboardHeight > 0
                  ? 0
                  : insets.bottom > 0
                    ? insets.bottom
                    : normalize(12),
              borderTopWidth: 1,
              borderTopColor: '#E8E8E8',
            }}
          >
            <CommentInput
              bottomInputRef={null}
              bottomComment={inputText}
              selectedImages={chatImages}
              onImagesChange={setChatImages}
              showImageAttach={true}
              replyToCommentId={null}
              replyToAuthorLabel=""
              clearReplyTarget={() => {}}
              handleSendComment={() => handleSendMessage()}
              styles={detailStyles}
              normalize={normalize}
              setBottomComment={handleInputChange}
            />
          </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
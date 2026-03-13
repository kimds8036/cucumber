import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  Keyboard,
  Alert,
} from 'react-native';
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
  return {
    id: String(m.id),
    isMe,
    content: m.content,
    createdAt,
    dateKey: getDateKey(d),
    time: formatChatTime(createdAt),
    isReadByOther: isMe ? Boolean(m.is_read) : undefined,
    isReadByMe: !isMe ? Boolean(m.is_read) : undefined,
    isSending: false,
    isFailed: false,
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

// ─────────────────────────────────────────────
// 5. 개별 메시지 컴포넌트 (React.memo로 리렌더 방지)
// ─────────────────────────────────────────────
const MessageItem = memo(({ msg, chatStyles, normalize, onRetry }) => {
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

  if (msg.isMe) {
    return (
      <View style={chatStyles.chatRowUser}>
        <View style={chatStyles.userBubbleAndTime}>
          <View style={chatStyles.userTimeColumn}>
            {/* 전송 실패 시 재전송 버튼 */}
            {msg.isFailed ? (
              <TouchableOpacity onPress={() => onRetry(msg)} style={{ alignItems: 'flex-end' }}>
                <Ionicons name="refresh-circle" size={normalize(20)} color={colors.alert} />
                <Text style={{ fontSize: normalize(10), color: colors.alert }}>재전송</Text>
              </TouchableOpacity>
            ) : (
              <Text style={chatStyles.chatTimeUser}>
                {msg.isReadByOther === false && !msg.isSending ? '1 ' : ''}
                {msg.isSending ? '...' : msg.time}
              </Text>
            )}
          </View>
          <View
            style={[
              chatStyles.userBubble,
              msg.isFailed && { borderWidth: 1, borderColor: colors.alert },
            ]}
          >
            <Text style={chatStyles.userBubbleText}>{msg.content}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={chatStyles.chatRowOpponent}>
      <View style={chatStyles.chatProfileCircle}>
        <MessageTabIcon width={normalize(28)} height={normalize(28)} color={colors.green} />
      </View>
      <View style={chatStyles.opponentBody}>
        <View style={chatStyles.opponentNameAndBubble}>
          <Text style={chatStyles.opponentName}>익명</Text>
          <View style={chatStyles.opponentBubble}>
            <Text style={chatStyles.opponentBubbleText}>{msg.content}</Text>
          </View>
        </View>
        <View style={chatStyles.opponentTimeRow}>
          {!msg.isReadByMe && <Text style={chatStyles.chatUnreadCount}>●</Text>}
          <Text style={chatStyles.chatTimeOpponent}>{msg.time}</Text>
        </View>
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────
// 6. 메인 Chat 컴포넌트
// ─────────────────────────────────────────────
export default function Chat({ navigation, route }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getBoardNormalize(width), [width]);
  const detailStyles = useMemo(() => createDetailStyles(width, normalize), [width, normalize]);
  const chatStyles = useMemo(() => createChatStyles(width, normalize), [width, normalize]);

  const roomId = route?.params?.roomId;

  const [post, setPost] = useState(null);
  const [messages, setMessages] = useState([]);    // 시간순(오름차순) 정렬된 UI 모델 배열
  const [currentUserId, setCurrentUserId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const insets = useSafeAreaInsets();
  const pollRef = useRef(null);
  const socketRef = useRef(null);                  // WebSocket 인스턴스
  const currentUserIdRef = useRef(null);           // 클로저 문제 방지용 ref

  // currentUserId 변경 시 ref도 동기화
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // ── 키보드 리스너 ──
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ── 메시지 목록 로드 (최초 1회) ──
  useEffect(() => {
    if (!roomId) return;

    const fetchRoom = async () => {
      try {
        const res = await api.get(`/api/messages/rooms/${roomId}`, {
          params: { page: 1, limit: 50 },
        });
        const data = res.data?.data;
        if (!data) return;

        const room = data.room;
        const msgs = data.messages || [];

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
        setMessages(msgs.map((m) => normalizeMessage(m, meId)));

        // 읽음 처리
        try {
          await api.put(`/api/messages/rooms/${roomId}/read`);
          setMessages((prev) =>
            prev.map((msg) => (msg.isMe ? msg : { ...msg, isReadByMe: true }))
          );
          await api.post('/api/notifications/read-by-related', {
            relatedType: 'message_room',
            relatedId: roomId,
          }).catch(() => {});
        } catch { /* ignore */ }

      } catch (error) {
        console.error('채팅 내역 로드 실패:', error);
        Alert.alert('오류', error.response?.data?.message || '채팅 내역을 불러오는 중 오류가 발생했습니다.');
      }
    };

    fetchRoom();
  }, [roomId]);

  // ─────────────────────────────────────────────
  // 7. WebSocket 연결 (소켓이 있으면 폴링 대신 사용)
  //    ※ 백엔드 소켓 서버 URL을 실제 환경에 맞게 교체하세요.
  //      예) process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3000'
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const WS_URL = process.env.EXPO_PUBLIC_WS_URL;   // 환경변수로 관리 권장
    if (!WS_URL) {
      // 소켓 URL이 없으면 폴링으로 fallback
      startPolling();
      return;
    }

    let ws;
    let reconnectTimer;
    let isMounted = true;

    const connect = () => {
      ws = new WebSocket(`${WS_URL}?roomId=${roomId}`);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] 연결 성공');
        // 소켓이 연결됐으면 폴링 중단
        stopPolling();
      };

      ws.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);

          // 새 메시지 수신
          if (payload.type === 'new_message') {
            const meId = currentUserIdRef.current;
            const newMsg = normalizeMessage(payload.message, meId);
            setMessages((prev) => {
              // 중복 방지: 이미 같은 id가 있으면 무시
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            // 상대방 메시지면 즉시 읽음 처리
            if (!newMsg.isMe) {
              api.put(`/api/messages/rooms/${roomId}/read`).catch(() => {});
            }
          }

          // 읽음 상태 갱신 (상대가 내 메시지를 읽었을 때)
          if (payload.type === 'read_receipt') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.isMe ? { ...msg, isReadByOther: true } : msg
              )
            );
          }
        } catch (err) {
          console.error('[WS] 메시지 파싱 오류:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[WS] 오류:', err);
      };

      ws.onclose = () => {
        console.warn('[WS] 연결 종료 → 3초 후 재연결');
        if (isMounted) {
          // 소켓이 끊기면 폴링으로 임시 fallback
          startPolling();
          reconnectTimer = setTimeout(() => {
            if (isMounted) connect();
          }, 3000);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);
      ws?.close();
      socketRef.current = null;
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
        const res = await api.get(`/api/messages/rooms/${roomId}`, {
          params: { page: 1, limit: 50 },
        });
        const data = res.data?.data;
        if (!data) return;
        const room = data.room;
        const msgs = data.messages || [];
        const otherId = room.other_user_id;
        const meId =
          room.user1_id === otherId ? room.user2_id :
          room.user2_id === otherId ? room.user1_id : null;

        msgs.sort((a, b) => {
          const ad = parseUtcToLocal(a.created_at || '');
          const bd = parseUtcToLocal(b.created_at || '');
          return (!ad || !bd) ? 0 : ad - bd;
        });

        setMessages((prev) => {
          const mapped = msgs.map((m) => normalizeMessage(m, meId));
          // Optimistic UI로 추가된 isSending/isFailed 메시지는 보존
          const pendingMap = Object.fromEntries(
            prev.filter((m) => m.isSending || m.isFailed).map((m) => [m.id, m])
          );
          const merged = mapped.map((m) => pendingMap[m.id] ?? m);
          return merged;
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
  // 9. 메시지 전송
  // ─────────────────────────────────────────────
  const handleSendMessage = useCallback(async (content) => {
    const text = (content || inputText).trim();
    if (!text || !roomId) return;

    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const d = parseUtcToLocal(nowIso);

    const optimisticMsg = {
      id: tempId,
      type: 'message',
      isMe: true,
      content: text,
      createdAt: nowIso,
      dateKey: getDateKey(d),
      time: formatChatTime(nowIso),
      isReadByOther: false,
      isReadByMe: undefined,
      isSending: true,
      isFailed: false,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');

    try {
      const res = await api.post(`/api/messages/rooms/${roomId}/messages`, { content: text });
      const m = res.data?.data;
      if (m) {
        const confirmed = {
          ...normalizeMessage(m, currentUserIdRef.current),
          // 방금 보낸 메시지는 상대가 아직 못 읽음
          isReadByOther: false,
          isSending: false,
          isFailed: false,
        };
        setMessages((prev) => prev.map((msg) => (msg.id === tempId ? confirmed : msg)));
      }
    } catch (error) {
      console.error('쪽지 전송 실패:', error);
      // 전송 실패 → isFailed 플래그 설정 (재전송 버튼 노출)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, isSending: false, isFailed: true } : msg
        )
      );
    }
  }, [inputText, roomId]);

  // ─────────────────────────────────────────────
  // 10. 재전송 핸들러
  // ─────────────────────────────────────────────
  const handleRetry = useCallback((failedMsg) => {
    // 실패한 메시지 제거 후 재전송
    setMessages((prev) => prev.filter((m) => m.id !== failedMsg.id));
    handleSendMessage(failedMsg.content);
  }, [handleSendMessage]);

  // ─────────────────────────────────────────────
  // 11. 날짜 배너가 삽입된 역순 배열 (FlatList inverted용)
  //     - injectDateBanners는 순방향에서 수행 후 reverse
  //     - 메모이제이션으로 messages 변경 시에만 재계산
  // ─────────────────────────────────────────────
  const flatData = useMemo(() => {
    const withBanners = injectDateBanners(messages); // 시간순
    return withBanners.reverse();                    // inverted FlatList용 역순
  }, [messages]);

  // ─────────────────────────────────────────────
  // 12. renderItem (useCallback으로 참조 안정화)
  // ─────────────────────────────────────────────
  const renderItem = useCallback(({ item }) => (
    <MessageItem
      msg={item}
      chatStyles={chatStyles}
      normalize={normalize}
      onRetry={handleRetry}
    />
  ), [chatStyles, normalize, handleRetry]);

  const keyExtractor = useCallback((item) => item.id, []);
  const keyboardVerticalOffset = insets.top + normalize(48);

  const handleBack = () => navigation.goBack();
  const handleOpenPost = () => {
    if (!post?.id) return;
    navigation.navigate('BoardDetail', { post: { id: post.id }, isMyPost: false });
  };

  return (
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
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

          {/* 채팅 FlatList */}
          <FlatList
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
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            // 메시지 높이가 가변이므로 getItemLayout은 생략 (고정 높이일 때만 적용)
            removeClippedSubviews={Platform.OS === 'android'} // Android 스크롤 최적화
            maxToRenderPerBatch={20}
            windowSize={10}
            initialNumToRender={20}
          />

          {/* 입력창 */}
          <View
            style={{
              backgroundColor: colors.background,
              paddingBottom: isKeyboardVisible ? 0 : Math.max(insets.bottom, normalize(12)),
              borderTopWidth: 1,
              borderTopColor: '#E8E8E8',
            }}
          >
            <CommentInput
              bottomInputRef={null}
              bottomComment={inputText}
              setBottomComment={setInputText}
              replyToCommentId={null}
              replyToAuthorLabel=""
              clearReplyTarget={() => {}}
              handleSendComment={() => handleSendMessage()}
              styles={detailStyles}
              normalize={normalize}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
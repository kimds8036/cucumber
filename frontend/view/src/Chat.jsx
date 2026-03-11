import React, { useState, useMemo, useEffect } from 'react';
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

// 게시글 정보 간단 캐시 (채팅방을 다시 열었을 때 재사용)
const postCache = {};

// DB에 UTC로 저장된 날짜 문자열을 기기 로컬 시간대로 변환해서 파싱
function parseUtcToLocal(createdAt) {
  if (!createdAt) return null;
  let s = String(createdAt).trim();
  if (!s) return null;
  // MySQL "YYYY-MM-DD HH:mm:ss" 또는 "YYYY-MM-DDTHH:mm:ss" 형태이고
  // Z나 +09:00 같은 타임존 정보가 전혀 없으면 UTC로 간주해서 Z(=+00:00) 부여
  if (
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s) &&
    !/[Z+-]\d{2}:?\d{2}$/.test(s) &&
    !/Z$/.test(s)
  ) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// 채팅방 내부: 항상 시간(HH:MM)만 표기 (UTC → 로컬 기준)
function formatChatTime(createdAt) {
  const d = parseUtcToLocal(createdAt);
  if (!d) return '';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// 날짜 배너용 포맷터 (YYYY-M-D 형태의 dateKey → 'YYYY.MM.DD')
function formatChatDateBanner(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function Chat({ navigation, route }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getBoardNormalize(width), [width]);
  const detailStyles = useMemo(() => createDetailStyles(width, normalize), [width, normalize]);
  const chatStyles = useMemo(() => createChatStyles(width, normalize), [width, normalize]);

  const roomId = route?.params?.roomId;

  const [post, setPost] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [inputText, setInputText] = useState('');
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 채팅방 정보 + 메시지 로드
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

        // 현재 사용자 ID 추론: other_user_id 외의 쪽
        const otherId = room.other_user_id;
        const meId =
          room.user1_id === otherId
            ? room.user2_id
            : room.user2_id === otherId
            ? room.user1_id
            : null;

        setCurrentUserId(meId);

        // 1) 게시글 정보: 캐시가 있으면 재사용, 없으면 한번만 상세 조회
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
              const cached = {
                likes: pd.like_count,
                comments: pd.comment_count,
                isLiked: Boolean(pd.isLiked),
              };
              postCache[postId] = cached;
              initialPost = { ...initialPost, ...cached };
            }
          } catch (e) {
            console.error('채팅 내 게시글 정보 로드 실패:', e);
          }
        }
        setPost(initialPost);

        // 2) 메시지: created_at 기준으로 정렬해서 날짜 배너가 날짜별 최상단에만 나오도록
        msgs.sort((a, b) => {
          const ad = parseUtcToLocal(a.created_at || '');
          const bd = parseUtcToLocal(b.created_at || '');
          if (!ad || !bd) return 0;
          return ad - bd;
        });

        const mapped = msgs.map((m) => {
          const createdAt = m.created_at || '';
          const d = parseUtcToLocal(createdAt);
          const isMe = meId != null && m.sender_id === meId;
          const dateKey = !d ? '' : `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
          return {
            id: String(m.id),
            isMe,
            content: m.content,
            createdAt,
            dateKey,
            time: formatChatTime(createdAt),
            // 내가 보낸 메시지를 상대가 읽었는지
            isReadByOther: isMe ? m.is_read : undefined,
            // 상대 메시지를 내가 읽었는지
            isReadByMe: !isMe ? m.is_read : undefined,
          };
        });
        setMessages(mapped);

        // 읽음 처리: 내가 읽은 것으로 표시 (상대가 보낸 메시지들)
        try {
          await api.put(`/api/messages/rooms/${roomId}/read`);
          // UI에서도 상대방 메시지는 모두 읽음으로 표시
          setMessages((prev) =>
            prev.map((msg) =>
              msg.isMe ? msg : { ...msg, isReadByMe: true }
            )
          );
        } catch {
          // ignore
        }
      } catch (error) {
        console.error('채팅 내역 로드 실패:', error);
        Alert.alert(
          '오류',
          error.response?.data?.message || '채팅 내역을 불러오는 중 오류가 발생했습니다.'
        );
      }
    };

    fetchRoom();
  }, [roomId]);

  const keyboardVerticalOffset = insets.top + normalize(48);

  const handleBack = () => navigation.goBack();

  const handleOpenPost = () => {
    if (!post?.id) return;
    navigation.navigate('BoardDetail', {
      post: { id: post.id },
      isMyPost: false,
    });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !roomId) return;
    const content = inputText.trim();

    // 1) Optimistic UI: 서버 응답 기다리지 않고 먼저 화면에 추가
    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString(); // UTC ISO 문자열
    const d = parseUtcToLocal(nowIso);
    const dateKey = d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : '';

    const optimisticMsg = {
      id: tempId,
      isMe: true,
      content,
      createdAt: nowIso,
      dateKey,
      time: formatChatTime(nowIso),
      isReadByOther: false,
      isReadByMe: undefined,
      isSending: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');

    try {
      const res = await api.post(`/api/messages/rooms/${roomId}/messages`, {
        content,
      });
      const m = res.data?.data;
      if (m) {
        const createdAt = m.created_at || '';
        const dReal = parseUtcToLocal(createdAt);
        const isMe = currentUserId != null && m.sender_id === currentUserId;
        const realDateKey = !dReal ? '' : `${dReal.getFullYear()}-${dReal.getMonth() + 1}-${dReal.getDate()}`;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? {
                  id: String(m.id),
                  isMe,
                  content: m.content,
                  createdAt,
                  dateKey: realDateKey,
                  time: formatChatTime(createdAt),
                  isReadByOther: isMe ? m.is_read : undefined,
                  isReadByMe: !isMe ? m.is_read : undefined,
                }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('쪽지 전송 실패:', error);
      // 실패 시, 낙관적으로 추가한 임시 메시지를 제거
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      Alert.alert(
        '오류',
        error.response?.data?.message || '쪽지 전송 중 오류가 발생했습니다.'
      );
    }
  };

  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const renderMessageItem = ({ item: msg, index }) => {
    // inverted + reversedMessages 환경에서는 index+1 이 시간상 "이전(과거)" 메시지
    const prevOlderMsg = index < reversedMessages.length - 1 ? reversedMessages[index + 1] : null;
    const showDateBanner = msg.dateKey && msg.dateKey !== prevOlderMsg?.dateKey;

    return (
      <View key={msg.id}>
        {showDateBanner && (
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
        )}

        {msg.isMe ? (
          <View style={chatStyles.chatRowUser}>
            <View style={chatStyles.userBubbleAndTime}>
              <View style={chatStyles.userTimeColumn}>
                {/* 내가 보낸 메시지: 시간만 표시 */}
                <Text style={chatStyles.chatTimeUser}>{msg.time}</Text>
              </View>
              <View style={chatStyles.userBubble}>
                <Text style={chatStyles.userBubbleText}>{msg.content}</Text>
              </View>
            </View>
          </View>
        ) : (
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
                {/* 상대방이 보낸 메시지 중 내가 아직 안 읽은 것에만 빨간 점 표시 */}
                {!msg.isReadByMe && <Text style={chatStyles.chatUnreadCount}>●</Text>}
                <Text style={chatStyles.chatTimeOpponent}>{msg.time}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[detailStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
          {/* 1) 게시글 카드: 깔끔한 디자인 (관련 게시글이 있을 때만 표시) */}
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
              {/* 게시글 헤더 */}
              <View style={detailStyles.detailHeader}>
                <View style={detailStyles.detailAuthorRow}>
                  <Text style={detailStyles.detailAuthorAnonymous}>{post.author}</Text>
                </View>
                {post.location ? (
                  <View style={detailStyles.detailLocation}>
                    <Ionicons
                      name="location-sharp"
                      size={normalize(12)}
                      color={colors.textSecondary}
                    />
                    <Text style={detailStyles.detailLocationText}>{post.location}</Text>
                  </View>
                ) : null}
              </View>

              {/* 게시글 내용 */}
              <Text style={[detailStyles.detailBody, { marginVertical: normalize(12) }]}>
                {post.content}
              </Text>

              {/* 구분선 */}
              <View
                style={{
                  height: 1,
                  backgroundColor: '#F0F0F0',
                  marginVertical: normalize(8),
                }}
              />

              {/* 게시글 푸터 (좋아요/댓글 수만 단순 표시, 메뉴는 제거) */}
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
                    <Ionicons
                      name="chatbubble-outline"
                      size={normalize(15)}
                      color={colors.primary}
                    />
                    <Text style={detailStyles.detailStatText}>{post.comments}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* 2) 채팅 영역 - FlatList + inverted */}
          <FlatList
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: normalize(12),
              paddingBottom: normalize(10),
              paddingTop: normalize(8),
            }}
            data={reversedMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            inverted
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />

          {/* 3) 입력창 */}
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
              handleSendComment={handleSendMessage}
              styles={detailStyles}
              normalize={normalize}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
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
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import SubHeader from '../frame/subHeader';
import CommentInput from '../../components/CommentInput.jsx';
import { colors } from '../../styles/colors';
import {
  createDetailStyles,
  getNormalize as getBoardNormalize,
} from '../../styles/board.style';
import { createChatStyles } from '../../styles/message.style';
import ImageViewer from './ImageViewer';
import MessageItem from './components/chat/MessageItem';
import { api } from '../../utils/api';
import * as socketManager from './socketManager';
import useChat from './hooks/useChat';

// ─────────────────────────────────────────────
// 게시글 캐시
// ─────────────────────────────────────────────
const postCache = {};

function injectDateBanners(msgs) {
  // msgs: 과거 -> 최신 순서(오름차순)
  // 각 날짜 그룹의 시작 지점에 배너를 먼저 삽입한다.
  const result = [];
  let lastDateKey = null;
  for (const msg of msgs) {
    if (msg?.dateKey && msg.dateKey !== lastDateKey) {
      result.push({
        id: `banner-${msg.dateKey}-${msg.id}`,
        type: 'dateBanner',
        dateKey: msg.dateKey,
      });
      lastDateKey = msg.dateKey;
    }
    result.push({ ...msg, type: 'message' });
  }
  return result;
}

export default function Chat({ navigation, route }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getBoardNormalize(width), [width]);
  const detailStyles = useMemo(
    () => createDetailStyles(width, normalize),
    [width, normalize],
  );
  const chatStyles = useMemo(
    () => createChatStyles(width, normalize),
    [width, normalize],
  );

  const roomId = route?.params?.roomId;

  const {
    messages,
    isLoadingMore,
    sendMessage,
    loadMore,
    retryMessage,
    typingUsers,
    myId,
    deleteMessage,
  } = useChat(roomId, socketManager);

  const insets = useSafeAreaInsets();

  const flashListRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const didInitialBottomLockRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const prevNewestIdRef = useRef(null);

  const [post, setPost] = useState(null);
  const [inputText, setInputText] = useState('');
  const [chatImages, setChatImages] = useState([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewerUri, setViewerUri] = useState(null);
  const [replyToMessage, setReplyToMessage] = useState(null);

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const handleImagePress = useCallback((uri) => {
    setViewerUri(uri);
  }, []);

  const handleInputChange = useCallback(
    (text) => {
      setInputText(text);
      if (!roomId) return;
      if (myId == null) return;

      const userName = '익명';

      if (!text?.trim()) {
        if (isTypingRef.current) {
          socketManager.emit('typing_stop', { roomId, userId: myId });
          isTypingRef.current = false;
        }
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        return;
      }

      if (!isTypingRef.current) {
        socketManager.emit('typing_start', { roomId, userId: myId, userName });
        isTypingRef.current = true;
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketManager.emit('typing_stop', { roomId, userId: myId });
        isTypingRef.current = false;
        typingTimeoutRef.current = null;
      }, 1500);
    },
    [roomId, myId],
  );

  useEffect(() => {
    isTypingRef.current = false;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [roomId]);

  // 룸이 바뀌면 초기 스크롤 판단 기준도 초기화
  useEffect(() => {
    prevMessageCountRef.current = 0;
    didInitialBottomLockRef.current = false;
    isNearBottomRef.current = false;
    prevNewestIdRef.current = null;
  }, [roomId]);

  // 새 메시지(최신)가 들어올 때만 조건부로 하단 스크롤
  useEffect(() => {
    if (!messages?.length) return;
    const newest = messages[messages.length - 1];
    const newestId = newest?.id;
    if (!newestId) return;

    const prevId = prevNewestIdRef.current;
    if (prevId === newestId) return;

    const shouldAutoscroll = newest?.isMe || isNearBottomRef.current;
    if (shouldAutoscroll) {
      flashListRef.current?.scrollToEnd?.({ animated: true });
    }

    prevNewestIdRef.current = newestId;
  }, [messages]);

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

  // 게시글 카드 로드 (메시지/소켓은 useChat 훅이 담당)
  useEffect(() => {
    if (!roomId) return;
    let isMounted = true;

    const loadPost = async () => {
      try {
        const res = await api.get(`/api/messages/rooms/${roomId}?limit=1`);
        const room = res.data?.room;
        if (!room || !isMounted) return;

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
      } catch (e) {
        console.error('채팅 게시글 로드 실패:', e);
      }
    };

    loadPost();
    return () => {
      isMounted = false;
    };
  }, [roomId]);

  const handleSendComment = useCallback(() => {
    sendMessage({
      text: inputText,
      images: chatImages,
      replyTo: replyToMessage
        ? {
            id: replyToMessage.id,
            content: replyToMessage.content || '(이미지 메시지)',
            senderName:
              replyToMessage.senderName ??
              (replyToMessage.isMe ? '나' : '익명'),
          }
        : null,
    });
    setInputText('');
    setChatImages([]);
    setReplyToMessage(null);
  }, [sendMessage, inputText, chatImages, replyToMessage]);

  const handleCopyMessage = useCallback(async (msg) => {
    if (!msg.content) return;
    try {
      await Clipboard.setStringAsync(msg.content);
      Alert.alert('복사됨', '메시지가 클립보드에 복사되었습니다.');
    } catch (e) {
      console.error('[Copy] 복사 실패:', e);
      Alert.alert('오류', '메시지 복사에 실패했습니다.');
    }
  }, []);

  const handleReplyMessage = useCallback((msg) => {
    setReplyToMessage(msg);
  }, []);

  const flatData = useMemo(() => injectDateBanners(messages), [messages]);

  // 초기 데이터 로드시만 안전하게 맨 앞(index 0)으로 스크롤
  useEffect(() => {
    const nextCount = flatData?.length ?? 0;
    const prevCount = prevMessageCountRef.current;
    prevMessageCountRef.current = nextCount;

    if (prevCount === 0 && nextCount > 0) {
      // 첫 렌더 후 최신(맨 아래) 위치로 이동
      setTimeout(() => {
        try {
          flashListRef.current?.scrollToEnd?.({ animated: false });
        } catch (e) {
          console.warn('[Chat] scrollToEnd 실패:', e?.message || e);
        }
      }, 0);
    }
  }, [flatData]);

  const handleScroll = useCallback((e) => {
    const offsetY = e?.nativeEvent?.contentOffset?.y ?? 0;
    const viewportH = e?.nativeEvent?.layoutMeasurement?.height ?? 0;
    const contentH = e?.nativeEvent?.contentSize?.height ?? 0;
    // non-inverted에서 하단 근접 여부
    isNearBottomRef.current = offsetY + viewportH >= contentH - 80;
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (didInitialBottomLockRef.current) return;
    const len = flatData?.length ?? 0;
    if (len === 0) return;

    didInitialBottomLockRef.current = true;
    // 첫 content size 확정 시 최신(맨 아래) 고정
    setTimeout(() => {
      try {
        flashListRef.current?.scrollToEnd?.({ animated: false });
      } catch (e) {
        console.warn('[Chat] scrollToEnd 실패:', e?.message || e);
      }
    }, 0);
  }, [flatData]);

  const renderItem = useCallback(
    ({ item }) => (
      <MessageItem
        msg={item}
        chatStyles={chatStyles}
        normalize={normalize}
        onRetry={retryMessage}
        onDeleteMessage={deleteMessage}
        onImagePress={handleImagePress}
        onCopyMessage={handleCopyMessage}
        onReplyMessage={handleReplyMessage}
      />
    ),
    [
      chatStyles,
      normalize,
      retryMessage,
      deleteMessage,
      handleImagePress,
      handleCopyMessage,
      handleReplyMessage,
    ],
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  const keyboardVerticalOffset = insets.top + normalize(48);

  const handleBack = () => navigation.goBack();
  const handleOpenPost = () => {
    if (!post?.id) return;
    navigation.navigate('BoardDetail', {
      post: { id: post.id },
      isMyPost: false,
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView
        style={[detailStyles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View
          style={{
            zIndex: 1,
            elevation: 0,
            backgroundColor: colors.background,
          }}
        >
          <SubHeader title="쪽지" onBack={handleBack} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#F8F9FA' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={
            Platform.OS === 'ios' ? keyboardVerticalOffset : 0
          }
        >
          <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
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
                    <Text style={detailStyles.detailAuthorAnonymous}>
                      {post.author}
                    </Text>
                  </View>
                  {post.location ? (
                    <View style={detailStyles.detailLocation}>
                      <Ionicons
                        name="location-sharp"
                        size={normalize(12)}
                        color={colors.textSecondary}
                      />
                      <Text style={detailStyles.detailLocationText}>
                        {post.location}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text
                  style={[
                    detailStyles.detailBody,
                    { marginVertical: normalize(12) },
                  ]}
                >
                  {post.content}
                </Text>

                <View
                  style={{
                    height: 1,
                    backgroundColor: '#F0F0F0',
                    marginVertical: normalize(8),
                  }}
                />

                <View style={detailStyles.detailFooter}>
                  <View style={detailStyles.detailStats}>
                    <View style={detailStyles.detailStatItem}>
                      <FontAwesome
                        name={post?.isLiked ? 'heart' : 'heart-o'}
                        size={normalize(14)}
                        color={colors.alert}
                      />
                      <Text style={detailStyles.detailStatText}>
                        {post.likes}
                      </Text>
                    </View>
                    <View style={detailStyles.detailStatItem}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={normalize(15)}
                        color={colors.primary}
                      />
                      <Text style={detailStyles.detailStatText}>
                        {post.comments}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}

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
                <ActivityIndicator
                  size="small"
                  color="#999"
                  style={{ marginLeft: 4 }}
                />
              </View>
            )}

            <FlashList
              ref={flashListRef}
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: normalize(12),
                paddingBottom: normalize(10),
                paddingTop: normalize(8),
              }}
              data={flatData}
              keyExtractor={keyExtractor}
              getItemType={(item) =>
                item.type === 'dateBanner' ? 'dateBanner' : 'message'
              }
              renderItem={renderItem}
              estimatedItemSize={80}
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
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={5}
              initialNumToRender={15}
              onContentSizeChange={handleContentSizeChange}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            />

            <ImageViewer
              visible={Boolean(viewerUri)}
              uri={viewerUri}
              onClose={() => setViewerUri(null)}
            />

            <View
              style={{
                backgroundColor: colors.background,
                borderTopWidth: 1,
                borderTopColor: '#E8E8E8',
              }}
            >
              {replyToMessage && (
                <TouchableOpacity
                  onPress={() => setReplyToMessage(null)}
                  style={chatStyles.replyPreviewContainer}
                >
                  <View style={chatStyles.replyPreviewMeta}>
                    <Text style={chatStyles.replyPreviewTitle}>
                      {replyToMessage.isMe ? '내' : '상대방에게'} 답장 중
                    </Text>
                    <Text
                      style={chatStyles.replyPreviewContent}
                      numberOfLines={1}
                    >
                      {replyToMessage.content || '(이미지 메시지)'}
                    </Text>
                  </View>
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={colors.textSecondary}
                    style={{ marginLeft: normalize(8) }}
                  />
                </TouchableOpacity>
              )}

              <View
                style={{
                  paddingBottom:
                    keyboardHeight > 0
                      ? 0
                      : insets.bottom > 0
                        ? insets.bottom
                        : normalize(12),
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
                  handleSendComment={handleSendComment}
                  styles={detailStyles}
                  normalize={normalize}
                  setBottomComment={handleInputChange}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}


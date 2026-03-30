import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  memo,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import Loading from '../../components/Loading';
import SubHeader from '../frame/subHeader';
import CommentInput from '../../components/CommentInput.jsx';
import { colors, fonts } from '../../styles/colors';
import {
  createDetailStyles,
  getNormalize as getBoardNormalize,
} from '../../styles/board.style';
import { createChatStyles } from '../../styles/message.style';
import ImageViewer from './ImageViewer';
import MessageItem from './components/chat/MessageItem';
import MessageLongPressMenu from './components/chat/MessageLongPressMenu';
import { api } from '../../utils/api';
import * as socketManager from './socketManager';
import useChat from './hooks/useChat';

// ─────────────────────────────────────────────
// 게시글 캐시
// ─────────────────────────────────────────────
const postCache = {};
/** MessageItem 이미지 박스 높이와 동일 — overrideItemLayout 추정에 사용 */
const CHAT_IMAGE_SLOT = 200;
/** DateBanner 실측보다 기존 52가 작게 잡히는 경우 보정(+26px) */
const DATE_BANNER_ESTIMATE_HEIGHT = 78;
/** 리스트 외곽 paddingBottom 등과 맞춰 마지막 행에 가산(스크롤 끝 정렬 보정) */
const CHAT_LAST_ROW_EXTRA_PAD = 24;

function sameMessageSender(a, b) {
  if (!a || !b) return false;
  if (a.senderId != null && b.senderId != null) {
    return a.senderId === b.senderId;
  }
  return a.isMe === b.isMe;
}

/**
 * showProfile: 이전과 발신·분이 다르면 그룹의 첫 줄
 * showTimestamp: 다음과 발신·분이 다르면 그룹의 마지막 줄
 */
function withMessageGroupFlags(msgs) {
  if (!Array.isArray(msgs) || msgs.length === 0) return msgs;
  return msgs.map((msg, i) => {
    const prev = msgs[i - 1];
    const next = msgs[i + 1];

    const showProfile =
      !prev ||
      !sameMessageSender(prev, msg) ||
      prev.time !== msg.time;

    const showTimestamp =
      !next ||
      !sameMessageSender(msg, next) ||
      msg.time !== next.time;

    return { ...msg, showProfile, showTimestamp };
  });
}

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
    result.push(msg);
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
    isLoading,
    isLoadingMore,
    sendMessage,
    loadMore,
    retryMessage,
    typingUsers,
    myId,
    deleteMessage,
  } = useChat(roomId, socketManager);

  const insets = useSafeAreaInsets();

  // 최적화된 스크롤 관리를 위한 refs
  const flashListRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const isNearBottomRef = useRef(true);
  const prevNewestIdRef = useRef(null);
  const scrollAnimationRef = useRef(null);
  const keyboardTimeoutRef = useRef(null);
  const isScrollingRef = useRef(false);
  /** 정방향 리스트: 상단 도달(onStartReached)로 과거 로드 — 초기 마운트 오호출 방지 */
  const loadOlderAllowedRef = useRef(false);
  /** 첫 레이아웃 1회만 처리(onLayout opacity / loadOlder 허용) */
  const didListShellLayoutRef = useRef(false);

  const [post, setPost] = useState(null);
  const [inputText, setInputText] = useState('');
  const [chatImages, setChatImages] = useState([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewerUri, setViewerUri] = useState(null);
  const [replyToMessage, setReplyToMessage] = useState(null);
  /** 첫 onLayout 전까지 리스트 숨김 → 스크롤 튐 최소화 */
  const [listShellVisible, setListShellVisible] = useState(false);
  /** 메시지 롱프레스 플로팅 메뉴 */
  const [longPressMenu, setLongPressMenu] = useState(null);

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const toastTimerRef = useRef(null);
  const [toastText, setToastText] = useState(null);

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
    isNearBottomRef.current = false;
    prevNewestIdRef.current = null;
    loadOlderAllowedRef.current = false;
    didListShellLayoutRef.current = false;
    setListShellVisible(false);
  }, [roomId]);

  // 최적화된 새 메시지 자동 스크롤
  useEffect(() => {
    if (!messages?.length) return;
    const newest = messages[messages.length - 1];
    const newestId = newest?.id;
    if (!newestId) return;

    const prevId = prevNewestIdRef.current;
    if (prevId === newestId) return;

    const shouldAutoscroll = newest?.isMe || isNearBottomRef.current;
    if (shouldAutoscroll && !isScrollingRef.current) {
      // 이전 애니메이션 취소
      if (scrollAnimationRef.current) {
        clearTimeout(scrollAnimationRef.current);
      }

      // 부드러운 스크롤을 위한 딜레이
      scrollAnimationRef.current = setTimeout(() => {
        flashListRef.current?.scrollToEnd?.({ animated: true });
      }, 100);
    }

    prevNewestIdRef.current = newestId;
  }, [messages]);

  // 최적화된 키보드 이벤트 핸들러
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const height = e?.endCoordinates?.height ?? 0;
        setKeyboardHeight(height);

        // 키보드显示时自动滚动到底部
        if (messages?.length > 0 && isNearBottomRef.current) {
          keyboardTimeoutRef.current = setTimeout(
            () => {
              flashListRef.current?.scrollToEnd?.({ animated: true });
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
        if (keyboardTimeoutRef.current) {
          clearTimeout(keyboardTimeoutRef.current);
        }
      },
    );
    return () => {
      show.remove();
      hide.remove();
      if (keyboardTimeoutRef.current) {
        clearTimeout(keyboardTimeoutRef.current);
      }
    };
  }, [messages?.length]);

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
          thumbnail:
            typeof room.post_thumbnail === 'string' && room.post_thumbnail.trim()
              ? room.post_thumbnail.trim()
              : '',
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
                thumbnail: pd.thumbnail ?? '',
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

  const showChatToast = useCallback((text) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastText(text);
    toastTimerRef.current = setTimeout(() => {
      setToastText(null);
      toastTimerRef.current = null;
    }, 2000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  /** @returns {Promise<boolean>} 롱프레스 메뉴에서 토스트만 사용 */
  const handleCopyMessage = useCallback(async (msg) => {
    if (!msg?.content) return false;
    try {
      await Clipboard.setStringAsync(msg.content);
      return true;
    } catch (e) {
      console.error('[Copy] 복사 실패:', e);
      return false;
    }
  }, []);

  const handleReplyMessage = useCallback((msg) => {
    setReplyToMessage(msg);
  }, []);

  const openLongPressMenu = useCallback((msg, anchor) => {
    setLongPressMenu({ msg, anchor });
  }, []);

  const closeLongPressMenu = useCallback(() => {
    setLongPressMenu(null);
  }, []);

  const flatData = useMemo(
    () => injectDateBanners(withMessageGroupFlags(messages)),
    [messages],
  );

  /** FlashList: 타입별 대략 높이(px) — overrideItemLayout·평균 estimatedItemSize에 공통 사용 */
  const estimateRowHeight = useCallback((item, index, totalCount) => {
    if (!item || item.type === 'dateBanner') return DATE_BANNER_ESTIMATE_HEIGHT;
    // UI는 showTimestamp === true일 때만 표시; 추정은 명시 false일 때만 시간 칸 축소
    const showTs = item.showTimestamp !== false;
    let h = item.isMe ? 76 : 102;
    if (!item.isMe && item.showProfile === false) h -= 28;
    if (!showTs) h -= item.isMe ? 18 : 20;
    if (item.parent_content) h += 58;
    const n = Array.isArray(item.images) ? item.images.length : 0;
    if (n > 0) h += n * (CHAT_IMAGE_SLOT + 4);
    const hasText = Boolean(
      (item.content && String(item.content).trim()) || item.is_deleted,
    );
    if (hasText) h += 46;
    if (item.isFailed || item.status === 'failed') h += 6;
    if (
      typeof index === 'number' &&
      typeof totalCount === 'number' &&
      totalCount > 0 &&
      index === totalCount - 1
    ) {
      h += CHAT_LAST_ROW_EXTRA_PAD;
    }
    return Math.max(120, Math.min(h, 2400));
  }, []);

  const overrideItemLayout = useCallback(
    (layout, item, index) => {
      layout.size = estimateRowHeight(item, index, flatData.length);
    },
    [estimateRowHeight, flatData.length],
  );

  /** initialScrollIndex·estimatedItemSize가 같은 기대 높이를 쓰도록 평균 반영 */
  const averageEstimatedItemSize = useMemo(() => {
    if (!flatData?.length) return 150;
    let sum = 0;
    const n = flatData.length;
    for (let i = 0; i < n; i++) {
      sum += estimateRowHeight(flatData[i], i, n);
    }
    return Math.max(80, Math.round(sum / n));
  }, [flatData, estimateRowHeight]);

  const initialScrollIndex =
    flatData.length > 0 ? flatData.length - 1 : undefined;

  useEffect(() => {
    prevMessageCountRef.current = flatData?.length ?? 0;
  }, [flatData]);

  const handleStartReached = useCallback(() => {
    if (!loadOlderAllowedRef.current) return;
    if (isLoading || isLoadingMore) return;
    loadMore();
  }, [isLoading, isLoadingMore, loadMore]);

  // 최적화된 스크롤 이벤트 핸들러
  const handleScroll = useCallback((e) => {
    const offsetY = e?.nativeEvent?.contentOffset?.y ?? 0;
    const viewportH = e?.nativeEvent?.layoutMeasurement?.height ?? 0;
    const contentH = e?.nativeEvent?.contentSize?.height ?? 0;

    // 스크롤 상태 추적
    isScrollingRef.current = true;

    // 디바운스된 스크롤 상태 업데이트
    if (scrollAnimationRef.current) {
      clearTimeout(scrollAnimationRef.current);
    }

    scrollAnimationRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 150);

    // 하단 근접 여부 계산 (더 정확한 계산)
    const threshold = Math.max(80, viewportH * 0.1);
    isNearBottomRef.current = offsetY + viewportH >= contentH - threshold;
  }, []);

  const handleListShellLayout = useCallback(() => {
    if (didListShellLayoutRef.current) return;
    didListShellLayoutRef.current = true;
    requestAnimationFrame(() => {
      setListShellVisible(true);
      if (flatData.length > 0) {
        loadOlderAllowedRef.current = true;
      }
    });
  }, [flatData.length]);

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
        onOpenLongPressMenu={openLongPressMenu}
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
      openLongPressMenu,
    ],
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  const getFlashListItemType = useCallback(
    (item) => (item.type === 'dateBanner' ? 'dateBanner' : 'message'),
    [],
  );

  const keyboardVerticalOffset = insets.top + normalize(48);

  const handleBack = () => navigation.goBack();
  const handleOpenPost = () => {
    if (!post?.id) return;
    navigation.navigate('BoardDetail', {
      post: { id: post.id },
      isMyPost: false,
    });
  };

  // 로딩 상태일 때 빈 화면 또는 로딩 스피너 표시
  if (isLoading && messages.length === 0) {
    return (
      <SafeAreaView
        style={detailStyles.container}
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
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Loading size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={detailStyles.container}
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
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? keyboardVerticalOffset : 0
        }
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            flexDirection: 'column',
          }}
        >
          {post && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenPost}
              style={{
                backgroundColor: colors.background,
                marginHorizontal: normalize(12),
                marginTop: normalize(6),
                marginBottom: normalize(4),
                borderRadius: normalize(10),
                paddingHorizontal: normalize(12),
                paddingVertical: normalize(8),
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: normalize(8),
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: normalize(8),
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: normalize(11),
                        fontFamily: fonts.regular,
                        color: colors.textSecondary,
                      }}
                    >
                      {post.author}
                      {post.location ? ` · ${post.location}` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <FontAwesome
                        name={post?.isLiked ? 'heart' : 'heart-o'}
                        size={normalize(12)}
                        color={colors.alert}
                        style={{ marginRight: normalize(3) }}
                      />
                      <Text
                        style={{
                          fontSize: normalize(11),
                          fontFamily: fonts.regular,
                          color: colors.textSecondary,
                          marginRight: normalize(10),
                        }}
                      >
                        {post.likes}
                      </Text>
                      <Ionicons
                        name="chatbubble-outline"
                        size={normalize(13)}
                        color={colors.primary}
                        style={{ marginRight: normalize(3) }}
                      />
                      <Text
                        style={{
                          fontSize: normalize(11),
                          fontFamily: fonts.regular,
                          color: colors.textSecondary,
                        }}
                      >
                        {post.comments}
                      </Text>
                    </View>
                  </View>
                </View>
                {typeof post.thumbnail === 'string' && post.thumbnail.trim() ? (
                  <Image
                    source={{ uri: post.thumbnail.trim() }}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 8,
                      backgroundColor: colors.textLight10,
                    }}
                    resizeMode="cover"
                  />
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  marginTop: normalize(5),
                  fontSize: normalize(13),
                  fontFamily: fonts.regular,
                  color: colors.textPrimary,
                  lineHeight: normalize(18),
                }}
              >
                {post.content}
              </Text>
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
              <Loading size="small" color="#999" style={{ marginLeft: 4 }} />
            </View>
          )}

          <View
            style={{
              flex: 1,
              backgroundColor: colors.background,
              paddingHorizontal: normalize(12),
              paddingBottom: normalize(10),
              paddingTop: normalize(4),
            }}
            pointerEvents="box-none"
          >
            <View
              style={{ flex: 1, opacity: listShellVisible ? 1 : 0 }}
              onLayout={handleListShellLayout}
            >
              <FlashList
                ref={flashListRef}
                key={roomId}
                style={{ flex: 1 }}
                contentContainerStyle={{
                  paddingHorizontal: 0,
                  paddingBottom: 0,
                  paddingTop: 0,
                }}
                initialScrollOffset={999999}
                data={flatData}
                extraData={messages.length}
                keyExtractor={keyExtractor}
                getItemType={getFlashListItemType}
                renderItem={renderItem}
                estimatedItemSize={averageEstimatedItemSize}
                drawDistance={1000}
                overrideItemLayout={overrideItemLayout}
                initialScrollIndex={initialScrollIndex}
                onStartReached={handleStartReached}
                onStartReachedThreshold={0.25}
                maintainVisibleContentPosition={{
                  minIndexForVisible: 1,
                  autoscrollToTopThreshold: 10,
                  autoscrollToBottomThreshold: 0.2,
                  startRenderingFromBottom: true,
                }}
                ListHeaderComponent={
                  isLoadingMore ? (
                    <View style={{ paddingVertical: normalize(12) }}>
                      <Loading color={colors.textSecondary} />
                    </View>
                  ) : null
                }
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                scrollEnabled={true}
                overScrollMode="always"
                removeClippedSubviews={true}
                maxToRenderPerBatch={8}
                windowSize={7}
                initialNumToRender={20}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                decelerationRate="normal"
                disableVirtualization={false}
              />
            </View>
          </View>

          <ImageViewer
            visible={Boolean(viewerUri)}
            uri={viewerUri}
            onClose={() => setViewerUri(null)}
          />

          <MessageLongPressMenu
            visible={Boolean(longPressMenu)}
            msg={longPressMenu?.msg ?? null}
            anchor={longPressMenu?.anchor ?? null}
            onClose={closeLongPressMenu}
            onCopy={handleCopyMessage}
            onReply={handleReplyMessage}
            onDeleteMessage={deleteMessage}
            onToast={showChatToast}
            normalize={normalize}
          />

          {toastText ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: normalize(20),
                right: normalize(20),
                bottom: insets.bottom + normalize(72),
                alignItems: 'center',
                zIndex: 2000,
              }}
            >
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.97)',
                  borderWidth: 1,
                  borderColor: '#E0E0E0',
                  paddingVertical: normalize(12),
                  paddingHorizontal: normalize(22),
                  borderRadius: normalize(12),
                  maxWidth: '100%',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: normalize(14),
                    fontFamily: fonts.regular,
                    color: colors.textPrimary,
                    textAlign: 'center',
                  }}
                >
                  {toastText}
                </Text>
              </View>
            </View>
          ) : null}

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
  );
}

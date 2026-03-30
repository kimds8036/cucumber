/**
 * 친구 DM — /api/dm/* + useDMChat (소켓·폴링·캐시)
 */
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Loading from '../../components/Loading';
import SubHeader from '../frame/subHeader';
import MessageTabIcon from '../../assets/Group 166.svg';
import { colors, fonts } from '../../styles/colors';
import {
  createDetailStyles,
  getNormalize as getBoardNormalize,
} from '../../styles/board.style';
import { createChatStyles } from '../../styles/message.style';
import MessageItem from './components/chat/MessageItem';
import MessageLongPressMenu from './components/chat/MessageLongPressMenu';
import ImageViewer from './ImageViewer';
import CommentInput from '../../components/CommentInput.jsx';
import { getFriendIconColorByIndex } from '../../components/timerFriendModals';
import * as socketManager from './socketManager';
import useDMChat from './hooks/useDMChat';
import * as Clipboard from 'expo-clipboard';

function sameMessageSender(a, b) {
  if (!a || !b) return false;
  if (a.senderId != null && b.senderId != null) {
    return a.senderId === b.senderId;
  }
  return a.isMe === b.isMe;
}

function withMessageGroupFlags(msgs) {
  if (!Array.isArray(msgs) || msgs.length === 0) return msgs;
  return msgs.map((msg, i) => {
    const prev = msgs[i - 1];
    const next = msgs[i + 1];
    const showProfile =
      !prev || !sameMessageSender(prev, msg) || prev.time !== msg.time;
    const showTimestamp =
      !next || !sameMessageSender(msg, next) || msg.time !== next.time;
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

export default function DMChat({ navigation, route }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const normalize = useMemo(() => getBoardNormalize(width), [width]);
  const detailStyles = useMemo(
    () => createDetailStyles(width, normalize),
    [width, normalize],
  );
  const chatStyles = useMemo(
    () => createChatStyles(width, normalize),
    [width, normalize],
  );

  const chatInputStyles = useMemo(
    () => ({
      bottomInputRow: detailStyles.bottomInputRow,
      bottomInputInner: detailStyles.bottomInputInner,
      bottomInput: detailStyles.bottomInput,
      sendButton: detailStyles.sendButton,
    }),
    [detailStyles],
  );

  const roomId = route?.params?.roomId;
  const friend = route?.params?.friend ?? {};
  const friendName = friend.name || route?.params?.friend?.name || '친구';
  const friendSchool = friend.schoolName || friend.school || '';

  const {
    messages,
    isLoading,
    isLoadingMore,
    sendMessage,
    loadMore,
    retryMessage,
    deleteMessage,
  } = useDMChat(roomId, socketManager);

  const [inputText, setInputText] = useState('');
  const [chatImages, setChatImages] = useState([]);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(-1);
  const listRef = useRef(null);
  const currentOffsetRef = useRef(0); // 실시간 스크롤 위치 추적
  const contentHeightRef = useRef(0);
  const offsetBeforePrependRef = useRef(0);
  const beforeContentHeightRef = useRef(0);
  const pendingPrependCompensationRef = useRef(false);
  const loadOlderAllowedRef = useRef(false);
  const didListShellLayoutRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const prevNewestIdRef = useRef(null);
  const isLoadingMoreRef = useRef(false);
  const isScrollingRef = useRef(false);
  const scrollAnimationRef = useRef(null);
  const isInitialLoad = useRef(true); // 초기 로드 제어
  const didInitialAnchorRef = useRef(false);
  const [listShellVisible, setListShellVisible] = useState(false);

  const [longPressMenu, setLongPressMenu] = useState(null);
  const [replyToMessage, setReplyToMessage] = useState(null);

  const showToast = useCallback((text) => {
    Alert.alert('', text);
  }, []);

  const handleCopyMessage = useCallback(async (msg) => {
    if (!msg?.content) return false;
    try {
      await Clipboard.setStringAsync(msg.content);
      return true;
    } catch (e) {
      console.error('[DMChat][Copy] 복사 실패:', e);
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

  const displayMessages = useMemo(
    () => withMessageGroupFlags(messages),
    [messages],
  );
  const flatData = useMemo(
    () => injectDateBanners(displayMessages),
    [displayMessages],
  );

  /** FlashList: 타입별 대략 높이(px) 추정에 사용하는 상수 */
  const CHAT_IMAGE_SLOT = 200;
  const DATE_BANNER_ESTIMATE_HEIGHT = 78;
  const CHAT_LAST_ROW_EXTRA_PAD = 0;

  /** 메시지 높이 추정: 성능을 위해 평균 estimatedItemSize 계산에 사용 */
  const estimateRowHeight = useCallback((item, index, totalCount) => {
    if (!item || item.type === 'dateBanner') return DATE_BANNER_ESTIMATE_HEIGHT;
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

  /** initialScrollIndex·estimatedItemSize가 같은 기대 높이를 쓰도록 평균 반영 */
  const averageEstimatedItemSize = useMemo(() => {
    if (!flatData?.length) return 85; // 실제 메시지 평균 높이에 가깝게 수정
    let sum = 0;
    const n = flatData.length;
    for (let i = 0; i < n; i++) {
      sum += estimateRowHeight(flatData[i], i, n);
    }
    return Math.max(70, Math.min(100, Math.round(sum / n))); // 70-100 범위로 제한
  }, [flatData, estimateRowHeight]);

  const overrideItemLayout = useCallback(
    (layout, item, index) => {
      layout.size = estimateRowHeight(item, index, flatData.length);
    },
    [estimateRowHeight, flatData.length],
  );

  const getFlashListItemType = useCallback(
    (item) => (item.type === 'dateBanner' ? 'dateBanner' : 'message'),
    [],
  );

  const allImageUris = useMemo(
    () =>
      (Array.isArray(flatData) ? flatData : []).flatMap((msg) =>
        Array.isArray(msg?.images) ? msg.images : [],
      ),
    [flatData],
  );

  const selectedImageUri =
    selectedImageIndex >= 0 ? allImageUris[selectedImageIndex] : null;

  const handleSend = useCallback(() => {
    sendMessage({
      text: inputText,
      images: chatImages,
      replyTo: replyToMessage
        ? {
            id: replyToMessage.id,
            content: replyToMessage.content || '(이미지 메시지)',
            senderName: replyToMessage.isMe ? '나' : friend.name || '상대방',
          }
        : null,
    });
    setInputText('');
    setChatImages([]);
    setReplyToMessage(null);
  }, [sendMessage, inputText, chatImages, replyToMessage, friend.name]);

  const handleImagePress = useCallback(
    (uri) => {
      if (!uri) return;
      const idx = allImageUris.indexOf(uri);
      if (idx < 0) return;
      setSelectedImageIndex(idx);
      setIsImageViewerVisible(true);
    },
    [allImageUris],
  );

  const handlePressReplyTarget = useCallback(
    (parentId) => {
      const targetId = parentId != null ? String(parentId) : null;
      if (!targetId) return;
      const targetIndex = flatData.findIndex(
        (m) => m?.type !== 'dateBanner' && String(m?.id) === targetId,
      );
      if (targetIndex < 0) {
        showToast('상단으로 더 올려서 과거 메시지를 확인해 주세요');
        return;
      }
      try {
        listRef.current?.scrollToIndex?.({
          index: targetIndex,
          animated: true,
          viewPosition: 0.5,
        });
      } catch {
        showToast('상단으로 더 올려서 과거 메시지를 확인해 주세요');
      }
    },
    [flatData, showToast],
  );

  const handleInputChange = useCallback((text) => {
    setInputText(text);
  }, []);

  useEffect(() => {
    isLoadingMoreRef.current = false;
    loadOlderAllowedRef.current = false;
    didListShellLayoutRef.current = false;
    isNearBottomRef.current = false;
    prevNewestIdRef.current = null;
    isScrollingRef.current = false;
    pendingPrependCompensationRef.current = false;
    beforeContentHeightRef.current = 0;
    contentHeightRef.current = 0;
    didInitialAnchorRef.current = false;
    isInitialLoad.current = true;
    setListShellVisible(false);
  }, [roomId]);

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
            color={getFriendIconColorByIndex(
              friend.colorIndex != null ? friend.colorIndex : 0,
            )}
          />
        </View>
        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontSize: normalize(16),
              lineHeight: normalize(20),
              fontWeight: '700',
              fontFamily: fonts.bold,
              color: colors.textPrimary,
              includeFontPadding: false,
              marginBottom: normalize(1),
            }}
          >
            {friendName}
          </Text>
          {friendSchool ? (
            <Text
              numberOfLines={1}
              style={{
                fontSize: normalize(11),
                lineHeight: normalize(13),
                fontFamily: fonts.regular,
                color: colors.textSecondary,
                marginTop: normalize(0),
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

  const handleBack = () => navigation.goBack();

  const renderItem = useCallback(
    ({ item }) => (
      <MessageItem
        msg={item}
        chatStyles={chatStyles}
        normalize={normalize}
        onImagePress={handleImagePress}
        onRetry={retryMessage}
        onPressReplyTarget={handlePressReplyTarget}
        opponentName={friendName}
        onOpenLongPressMenu={openLongPressMenu}
      />
    ),
    [
      chatStyles,
      normalize,
      handleImagePress,
      retryMessage,
      handlePressReplyTarget,
      friendName,
      openLongPressMenu,
    ],
  );

  const handleStartReached = useCallback(() => {
    if (!loadOlderAllowedRef.current) return;
    if (isLoading || isLoadingMore) return;
    if (isLoadingMoreRef.current) return;
    offsetBeforePrependRef.current = Math.max(0, currentOffsetRef.current);
    beforeContentHeightRef.current = Math.max(0, contentHeightRef.current);
    pendingPrependCompensationRef.current = true;

    isLoadingMoreRef.current = true;
    loadMore().finally(() => {
      setTimeout(() => {
        isLoadingMoreRef.current = false;
      }, 500);
    });
  }, [isLoading, isLoadingMore, loadMore]);

  const handleListShellLayout = useCallback(() => {
    if (didListShellLayoutRef.current) return;
    didListShellLayoutRef.current = true;
    requestAnimationFrame(() => {
      setListShellVisible(true);
      setTimeout(() => {
        if (flatData.length > 0) {
          loadOlderAllowedRef.current = true;
        }
      }, 500);
    });
  }, [flatData.length]);

  const initialScrollIndex =
    flatData.length > 0 ? flatData.length - 1 : undefined;

  useEffect(() => {
    if (didInitialAnchorRef.current) return;
    if (isLoading) return;
    if (flatData.length === 0) {
      didInitialAnchorRef.current = true;
      setListShellVisible(true);
      loadOlderAllowedRef.current = true;
      isInitialLoad.current = false;
      return;
    }
    if (!didListShellLayoutRef.current) return;

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd?.({ animated: false });
      didInitialAnchorRef.current = true;
      setListShellVisible(true);
      loadOlderAllowedRef.current = true;
      isInitialLoad.current = false;
    });
  }, [flatData.length, isLoading]);

  const handleScroll = useCallback((e) => {
    const offsetY = e?.nativeEvent?.contentOffset?.y ?? 0;
    const viewportH = e?.nativeEvent?.layoutMeasurement?.height ?? 0;
    const contentH = e?.nativeEvent?.contentSize?.height ?? 0;
    contentHeightRef.current = contentH;
    isScrollingRef.current = true;
    if (scrollAnimationRef.current) clearTimeout(scrollAnimationRef.current);
    scrollAnimationRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 150);
    const threshold = Math.max(80, viewportH * 0.1);
    isNearBottomRef.current = offsetY + viewportH >= contentH - threshold;
  }, []);

  if (!roomId) {
    return (
      <SafeAreaView style={detailStyles.container} edges={['top']}>
        <SubHeader title="메시지" onBack={handleBack} />
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ color: colors.textSecondary }}>
            방 정보가 없습니다.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && messages.length === 0) {
    return (
      <SafeAreaView style={detailStyles.container} edges={['top']}>
        <SubHeader title=" " onBack={handleBack} titleElement={titleElement} />
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Loading size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={detailStyles.container} edges={['top']}>
      <View style={{ zIndex: 1, backgroundColor: colors.background }}>
        <SubHeader title=" " onBack={handleBack} titleElement={titleElement} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + normalize(48)}
      >
        <View
          style={{ flex: 1, opacity: listShellVisible ? 1 : 0 }}
          onLayout={handleListShellLayout}
        >
          <FlashList
            ref={listRef}
            key={roomId}
            data={flatData}
            extraData={messages.length}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingHorizontal: normalize(14),
              paddingTop: normalize(8),
              paddingBottom: normalize(0),
              flexGrow: 1,
            }}
            ListHeaderComponent={
              isLoadingMore ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={{ paddingVertical: 12 }}
                />
              ) : null
            }
            initialScrollIndex={initialScrollIndex}
            onStartReached={handleStartReached}
            onStartReachedThreshold={0.25}
            onContentSizeChange={(_, nextHeight) => {
              if (typeof nextHeight === 'number') {
                contentHeightRef.current = nextHeight;
              }
              if (!pendingPrependCompensationRef.current) return;
              if (isLoadingMore) return;
              const afterHeight = Math.max(0, contentHeightRef.current);
              const beforeHeight = Math.max(0, beforeContentHeightRef.current);
              const delta = Math.max(0, afterHeight - beforeHeight);
              const targetOffset = Math.max(
                0,
                offsetBeforePrependRef.current + delta,
              );
              console.log('SCROLL TO', targetOffset, 'pass', 1, 'delta', delta);
              requestAnimationFrame(() => {
                listRef.current?.scrollToOffset?.({
                  offset: targetOffset,
                  animated: false,
                });
                requestAnimationFrame(() => {
                  console.log(
                    'SCROLL TO',
                    targetOffset,
                    'pass',
                    2,
                    'delta',
                    delta,
                  );
                  listRef.current?.scrollToOffset?.({
                    offset: targetOffset,
                    animated: false,
                  });
                  pendingPrependCompensationRef.current = false;
                  beforeContentHeightRef.current = 0;
                });
              });
            }}
            estimatedItemSize={90}
            drawDistance={1000}
            getItemType={getFlashListItemType}
            overrideItemLayout={overrideItemLayout}
            // 중요: 안드로이드에서 위치 계산을 돕기 위해 아래 속성 추가
            disableAutoLayout={true}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScroll={(event) => {
              // 실시간 스크롤 위치 추적
              const offsetY = event.nativeEvent?.contentOffset?.y;
              if (offsetY !== undefined && offsetY !== null) {
                currentOffsetRef.current = offsetY;
              }

              // 디버깅: 페이징 시 contentOffset.y 변화 추적
              if (isLoadingMore) {
                if (offsetY !== undefined && offsetY !== null) {
                  console.log('[DMChat] Scroll during pagination:', {
                    contentOffsetY: offsetY,
                    isLoadingMore,
                    messageCount: messages.length,
                    timestamp: Date.now(),
                  });
                }
              }
              handleScroll(event);
            }}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <View
          style={{
            paddingBottom: insets.bottom > 0 ? insets.bottom : normalize(12),
          }}
        >
          <CommentInput
            bottomInputRef={null}
            bottomComment={inputText}
            setBottomComment={handleInputChange}
            selectedImages={chatImages}
            onImagesChange={setChatImages}
            showImageAttach
            replyToCommentId={replyToMessage?.id ?? null}
            replyToAuthorLabel={
              replyToMessage?.isMe ? '나' : friend.name || '상대방'
            }
            clearReplyTarget={() => setReplyToMessage(null)}
            handleSendComment={handleSend}
            styles={chatInputStyles}
            normalize={normalize}
            mainPlaceholder="메시지를 입력하세요"
          />
        </View>

        <MessageLongPressMenu
          visible={Boolean(longPressMenu)}
          msg={longPressMenu?.msg ?? null}
          anchor={longPressMenu?.anchor ?? null}
          onClose={closeLongPressMenu}
          onCopy={handleCopyMessage}
          onReply={handleReplyMessage}
          onDeleteMessage={deleteMessage}
          onToast={(msg) => showToast?.(msg)}
          normalize={normalize}
        />
        <ImageViewer
          visible={isImageViewerVisible}
          uri={selectedImageUri}
          onClose={() => {
            setIsImageViewerVisible(false);
            setSelectedImageIndex(-1);
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

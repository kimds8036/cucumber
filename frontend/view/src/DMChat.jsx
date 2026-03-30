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
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const loadOlderAllowedRef = useRef(false);
  const didListShellLayoutRef = useRef(false);
  const isNearBottomRef = useRef(false);
  const isScrollingRef = useRef(false);
  const scrollAnimationRef = useRef(null);
  const prevNewestIdRef = useRef(null);
  const isLoadingMoreRef = useRef(false);
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

  /** FlashList: 타입별 대략 높이(px) 추정에 사용하는 상수 */
  const CHAT_IMAGE_SLOT = 200;
  const DATE_BANNER_ESTIMATE_HEIGHT = 78;
  const CHAT_LAST_ROW_EXTRA_PAD = 24;

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
    if (typeof index === 'number' && typeof totalCount === 'number' && totalCount > 0 && index === totalCount - 1) {
      h += CHAT_LAST_ROW_EXTRA_PAD;
    }
    return Math.max(120, Math.min(h, 2400));
  }, []);

  /** initialScrollIndex·estimatedItemSize가 같은 기대 높이를 쓰도록 평균 반영 */
  const averageEstimatedItemSize = useMemo(() => {
    if (!displayMessages?.length) return 150;
    let sum = 0;
    const n = displayMessages.length;
    for (let i = 0; i < n; i++) {
      sum += estimateRowHeight(displayMessages[i], i, n);
    }
    return Math.max(80, Math.round(sum / n));
  }, [displayMessages, estimateRowHeight]);

  const overrideItemLayout = useCallback(
    (layout, item, index) => {
      layout.size = estimateRowHeight(item, index, displayMessages.length);
    },
    [estimateRowHeight, displayMessages.length],
  );

  const getFlashListItemType = useCallback(
    (item) => (item.type === 'dateBanner' ? 'dateBanner' : 'message'),
    [],
  );

  const allImageUris = useMemo(
    () =>
      (Array.isArray(displayMessages) ? displayMessages : []).flatMap((msg) =>
        Array.isArray(msg?.images) ? msg.images : [],
      ),
    [displayMessages],
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
            senderName: replyToMessage.isMe
              ? '나'
              : (friend.name || '상대방'),
          }
        : null,
    });
    setInputText('');
    setChatImages([]);
    setReplyToMessage(null);
  }, [
    sendMessage,
    inputText,
    chatImages,
    replyToMessage,
    friend.name,
  ]);

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

  const handlePressReplyTarget = useCallback((parentId) => {
    const targetId = parentId != null ? String(parentId) : null;
    if (!targetId) return;
    const targetIndex = displayMessages.findIndex(
      (m) => String(m?.id) === targetId,
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
  }, [displayMessages, showToast]);

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
    setListShellVisible(false);
  }, [roomId]);

  useEffect(() => {
    if (!messages?.length) return;
    const newest = messages[messages.length - 1];
    const newestId = newest?.id;
    if (!newestId) return;
    if (prevNewestIdRef.current === newestId) return;

    const shouldAutoscroll = newest?.isMe || isNearBottomRef.current;
    if (shouldAutoscroll && !isScrollingRef.current) {
      if (scrollAnimationRef.current) {
        clearTimeout(scrollAnimationRef.current);
      }
      scrollAnimationRef.current = setTimeout(() => {
        listRef.current?.scrollToEnd?.({ animated: true });
      }, 100);
    }

    prevNewestIdRef.current = newestId;
  }, [messages]);

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
        if (displayMessages.length > 0) {
          loadOlderAllowedRef.current = true;
        }
      }, 500);
    });
  }, [displayMessages.length]);

  const handleScroll = useCallback((e) => {
    const offsetY = e?.nativeEvent?.contentOffset?.y ?? 0;
    const viewportH = e?.nativeEvent?.layoutMeasurement?.height ?? 0;
    const contentH = e?.nativeEvent?.contentSize?.height ?? 0;
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
          <Text style={{ color: colors.textSecondary }}>방 정보가 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && messages.length === 0) {
    return (
      <SafeAreaView style={detailStyles.container} edges={['top']}>
        <SubHeader
          title=" "
          onBack={handleBack}
          titleElement={titleElement}
        />
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
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
            data={displayMessages}
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
            initialScrollOffset={999999}
            onStartReached={handleStartReached}
            onStartReachedThreshold={0.25}
            estimatedItemSize={averageEstimatedItemSize}
            drawDistance={1000}
            getItemType={getFlashListItemType}
            overrideItemLayout={overrideItemLayout}
            maintainVisibleContentPosition={{
              minIndexForVisible: 1,
              autoscrollToTopThreshold: 10,
              autoscrollToBottomThreshold: 0.2,
              startRenderingFromBottom: true,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <View
          style={{
            paddingBottom:
              insets.bottom > 0 ? insets.bottom : normalize(12),
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
              replyToMessage?.isMe ? '나' : (friend.name || '상대방')
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

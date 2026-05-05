import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import {
  getNormalize as getBoardNormalize,
  createDetailStyles,
} from '../../../../styles/board.style';
import { createChatStyles } from '../../../../styles/message.style';
import { colors } from '../../../../styles/colors';
import Skeleton from '../../../../components/common/Skeleton';
import SubHeader from '../../../frame/subHeader';

import useChatScroll from '../hooks/useChatScroll';
import useChatUI from '../hooks/useChatUI';

import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import MessageActions from '../components/MessageActions';
import ImageViewer from '../components/ImageViewer';

import {
  withMessageGroupFlags,
  injectDateBanners,
} from '../utils/messageUtils';
import PostCard from '../components/PostCard';

export default function ChatScreen({
  roomId,
  useChatHook,
  headerConfig,
  hookConfig,
  chatType,
  mainPlaceholder,
  chatInputStyles,
  navigation,
  opponentName,
}) {
  const insets = useSafeAreaInsets();
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
  const inputTranslateY = useSharedValue(0);
  const keyboardOffset = useSharedValue(0);

  // 훅 호출: (roomId, socket) 2개 인자
  const chat = useChatHook(hookConfig.roomId, hookConfig.socket);

  const [inputText, setInputText] = useState('');
  const [chatImages, setChatImages] = useState([]);
  const [postCardLoading, setPostCardLoading] = useState(
    () => chatType === 'room' && Boolean(roomId),
  );

  useEffect(() => {
    if (chatType === 'room' && roomId) setPostCardLoading(true);
    else setPostCardLoading(false);
  }, [roomId, chatType]);

  const handlePostCardLoadingChange = useCallback((next) => {
    setPostCardLoading(next);
  }, []);

  const combinedLoading =
    chat.isLoading || (chatType === 'room' && Boolean(roomId) && postCardLoading);

  const {
    replyToMessage,
    setReplyToMessage,
    longPressMenu,
    setLongPressMenu,
    openLongPressMenu,
    viewerUri,
    setViewerUri,
    toastText,
    showChatToast,
  } = useChatUI();

  // flatData 생성: withMessageGroupFlags → injectDateBanners
  // messages는 [과거 → 최신] 순서를 유지하고, flatData도 동일한 시간 흐름을 따른다.
  const flatData = useMemo(
    () =>
      injectDateBanners(withMessageGroupFlags(chat.messages || []), {
        prependCount: chat.lastPrependCount ?? 0,
      }),
    [chat.messages, chat.lastPrependCount],
  );

  const scroll = useChatScroll({
    roomId,
    messages: chat.messages,
    flatData,
    isLoading: combinedLoading,
    isLoadingMore: chat.isLoadingMore,
    loadMore: chat.loadMore,
    loadMoreSilent: chat.loadMoreSilent,
    hasMore: chat.hasMore,
  });
  const hasMessages = (chat.messages?.length ?? 0) > 0;
  const shouldShowChatSkeleton =
    combinedLoading ||
    scroll.initialScrollSettling ||
    !scroll.listShellVisible ||
    (!hasMessages && chat.isLoadingMore);

  const postCardLayoutAnchorDoneRef = useRef(false);
  const postCardThumbAnchorDoneRef = useRef(false);
  const scrollToLatestRef = useRef(scroll.scrollToLatest);
  scrollToLatestRef.current = scroll.scrollToLatest;
  useEffect(() => {
    postCardLayoutAnchorDoneRef.current = false;
    postCardThumbAnchorDoneRef.current = false;
  }, [roomId]);

  const handlePostCardReady = useCallback(() => {
    if (postCardLayoutAnchorDoneRef.current) return;
    postCardLayoutAnchorDoneRef.current = true;
    scrollToLatestRef.current?.({ animated: false });
  }, []);

  const handlePostCardThumbnailLoaded = useCallback(() => {
    if (postCardThumbAnchorDoneRef.current) return;
    postCardThumbAnchorDoneRef.current = true;
    scrollToLatestRef.current?.({ animated: false });
  }, []);

  const handleSend = () => {
    chat.sendMessage({
      text: inputText,
      images: chatImages,
      replyTo: replyToMessage,
    });
    setInputText('');
    setChatImages([]);
    setReplyToMessage(null);
    setTimeout(() => {
      scroll.scrollToLatest?.({ animated: true });
    }, 40);
  };

  const handleCopyMessage = async (content) => {
    if (!content) return;
    await Clipboard.setStringAsync(String(content));
    showChatToast('메시지가 복사되었습니다');
  };

  const handlePressReplyTarget = (parentMessageId) => {
    const targetId =
      parentMessageId != null ? String(parentMessageId) : null;
    if (!targetId) return;
    const targetIndex = flatData.findIndex(
      (item) =>
        item?.type !== 'dateBanner' && String(item?.id) === targetId,
    );
    if (targetIndex < 0) {
      showChatToast('상단으로 더 올려서 과거 메시지를 확인해 주세요');
      return;
    }
    if (targetIndex >= flatData.length) return;
    const list = scroll.listRef.current;
    if (!list?.scrollToIndex) return;
    try {
      list.scrollToIndex({
        index: targetIndex,
        animated: true,
        viewPosition: 0.5,
      });
    } catch {
      showChatToast('해당 메시지로 이동하지 못했습니다');
    }
  };

  const renderMessageProps = {
    chatStyles,
    normalize,
    onRetry: chat.retryMessage,
    onDeleteMessage: chat.deleteMessage,
    onImagePress: setViewerUri,
    onCopyMessage: handleCopyMessage,
    onReplyMessage: setReplyToMessage,
    onPressReplyTarget: handlePressReplyTarget,
    onOpenLongPressMenu: openLongPressMenu,
    opponentName,
  };

  useKeyboardHandler(
    {
      onMove: (e) => {
        'worklet';
        keyboardOffset.value = Math.max(e.height - insets.bottom, 0);
        inputTranslateY.value = -keyboardOffset.value;
      },
      onEnd: (e) => {
        'worklet';
        keyboardOffset.value = Math.max(e.height - insets.bottom, 0);
        inputTranslateY.value = -keyboardOffset.value;
      },
    },
    [insets.bottom],
  );

  const inputAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: inputTranslateY.value }],
  }));
  const listAnimStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardOffset.value,
  }));

  return (
    <SafeAreaView style={detailStyles.container} edges={['top']}>
      <SubHeader
        title={headerConfig?.title || '채팅'}
        onBack={headerConfig?.onBack}
        titleElement={headerConfig?.titleElement}
      />

      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {chatType === 'room' && (
            <PostCard
              roomId={roomId}
              normalize={normalize}
              onLoadingChange={handlePostCardLoadingChange}
              onReady={handlePostCardReady}
              onThumbnailLoaded={handlePostCardThumbnailLoaded}
              onPress={(post) => {
                if (!post?.id || !navigation) return;
                navigation.navigate('BoardDetail', {
                  post: { id: post.id },
                  isMyPost: false,
                });
              }}
            />
          )}

        <Animated.View style={[{ flex: 1, position: 'relative' }, listAnimStyle]}>
          {!combinedLoading && chat.hasMore && scroll.showLoadMoreButton ? (
            <View
              style={{
                position: 'absolute',
                top: normalize(8),
                left: 0,
                right: 0,
                alignItems: 'center',
                zIndex: 25,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                disabled={chat.isLoadingMore}
                onPress={() => scroll.triggerLoadMore?.()}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.98)',
                  borderWidth: 1,
                  borderColor: '#E0E0E0',
                  borderRadius: normalize(14),
                  paddingHorizontal: normalize(12),
                  paddingVertical: normalize(7),
                }}
              >
                <Text
                  style={{
                    fontSize: normalize(12),
                    color: colors.textPrimary,
                  }}
                >
                  {chat.isLoadingMore ? '불러오는 중...' : '이전대화 더불러오기'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <MessageList
            roomId={roomId}
            data={flatData}
            listRef={scroll.listRef}
            isLoadingMore={chat.isLoadingMore}
            handleScroll={scroll.handleScroll}
            handleStartReached={scroll.handleStartReached}
            handleListShellLayout={scroll.handleListShellLayout}
            listShellVisible={scroll.listShellVisible}
            contentHeightRef={scroll.contentHeightRef}
            renderMessageProps={renderMessageProps}
            normalize={normalize}
            handleContentSizeChange={scroll.handleContentSizeChange}
            onViewableItemsChanged={scroll.handleViewableItemsChanged}
          />
          {shouldShowChatSkeleton ? (
            <View
              pointerEvents="auto"
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: colors.background,
                justifyContent: 'space-between',
                zIndex: 50,
              }}
            >
              <View style={{ paddingTop: normalize(12), paddingHorizontal: normalize(14) }}>
                <Skeleton
                  width={normalize(120)}
                  height={normalize(12)}
                  borderRadius={normalize(6)}
                />
              </View>
              <View style={{ width: '100%', paddingHorizontal: normalize(14), gap: normalize(14) }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: normalize(8) }}>
                  <Skeleton width={normalize(28)} height={normalize(28)} borderRadius={normalize(14)} />
                  <View style={{ gap: normalize(6), maxWidth: '72%' }}>
                    <Skeleton width={normalize(140)} height={normalize(12)} borderRadius={normalize(6)} />
                    <Skeleton width={normalize(190)} height={normalize(14)} borderRadius={normalize(8)} />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ gap: normalize(6), width: '72%', alignItems: 'flex-end' }}>
                    <Skeleton width={normalize(160)} height={normalize(14)} borderRadius={normalize(8)} />
                    <Skeleton width={normalize(110)} height={normalize(12)} borderRadius={normalize(6)} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: normalize(8) }}>
                  <Skeleton width={normalize(28)} height={normalize(28)} borderRadius={normalize(14)} />
                  <View style={{ gap: normalize(6), maxWidth: '68%' }}>
                    <Skeleton width={normalize(120)} height={normalize(12)} borderRadius={normalize(6)} />
                    <Skeleton width={normalize(170)} height={normalize(14)} borderRadius={normalize(8)} />
                  </View>
                </View>
              </View>
              <View style={{ height: normalize(12) }} />
            </View>
          ) : null}
        </Animated.View>

        {/* 토스트 */}
        {toastText ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: normalize(100),
              alignItems: 'center',
            }}
          >
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.97)',
                borderWidth: 1,
                borderColor: '#E0E0E0',
                borderRadius: normalize(8),
                paddingHorizontal: normalize(16),
                paddingVertical: normalize(10),
              }}
            >
              <Text
                style={{
                  fontSize: normalize(13),
                  color: colors.textPrimary,
                }}
              >
                {toastText}
              </Text>
            </View>
          </View>
        ) : null}

        {/* 답장 프리뷰 */}
        {replyToMessage ? (
          <TouchableOpacity
            onPress={() => setReplyToMessage(null)}
            style={
              chatStyles.replyPreviewContainer || {
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: normalize(16),
                paddingVertical: normalize(8),
                backgroundColor: '#F5F5F5',
                borderTopWidth: 1,
                borderTopColor: '#E0E0E0',
              }
            }
          >
            <View style={{ flex: 1 }}>
              <Text
                style={
                  chatStyles.replyPreviewTitle || {
                    fontSize: normalize(12),
                    color: colors.primary,
                    fontWeight: 'bold',
                  }
                }
              >
                {replyToMessage.isMe ? '내' : '상대방에게'} 답장 중
              </Text>
              <Text
                numberOfLines={1}
                style={
                  chatStyles.replyPreviewContent || {
                    fontSize: normalize(12),
                    color: '#666',
                  }
                }
              >
                {replyToMessage.content || '(이미지 메시지)'}
              </Text>
            </View>
            <Ionicons
              name="close-circle"
              size={normalize(24)}
              color={colors.textSecondary || '#999'}
            />
          </TouchableOpacity>
        ) : null}

          <Animated.View style={inputAnimStyle}>
            <MessageInput
              value={inputText}
              onChange={setInputText}
              onSend={handleSend}
              images={chatImages}
              onImagesChange={setChatImages}
              styles={detailStyles}
              normalize={normalize}
              replyToMessage={replyToMessage}
              clearReplyTarget={() => setReplyToMessage(null)}
              bottomInset={insets.bottom}
              mainPlaceholder={mainPlaceholder}
              chatInputStyles={chatInputStyles}
            />
          </Animated.View>
        </View>

      </View>

      <MessageActions
        visible={Boolean(longPressMenu)}
        msg={longPressMenu?.msg}
        anchor={longPressMenu?.anchor}
        onClose={() => setLongPressMenu(null)}
        onCopy={handleCopyMessage}
        onReply={(msg) => setReplyToMessage(msg)}
        onDeleteMessage={chat.deleteMessage}
        onToast={showChatToast}
        normalize={normalize}
      />

      <ImageViewer
        visible={Boolean(viewerUri)}
        uri={viewerUri}
        onClose={() => setViewerUri(null)}
      />
    </SafeAreaView>
  );
}

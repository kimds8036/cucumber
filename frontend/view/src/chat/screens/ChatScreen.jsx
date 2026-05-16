import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
  const dmListLayoutAnchorDoneRef = useRef(false);
  const scrollToLatestRef = useRef(scroll.scrollToLatest);
  scrollToLatestRef.current = scroll.scrollToLatest;
  useEffect(() => {
    postCardLayoutAnchorDoneRef.current = false;
    postCardThumbAnchorDoneRef.current = false;
    dmListLayoutAnchorDoneRef.current = false;
  }, [roomId]);

  const runDmScrollAnchor = useCallback(() => {
    if (chatType !== 'dm') return;
    if (combinedLoading || !hasMessages) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToLatestRef.current?.({ animated: false });
      });
    });
  }, [chatType, combinedLoading, hasMessages]);

  const handleDmChatListLayout = useCallback(() => {
    if (chatType !== 'dm' || dmListLayoutAnchorDoneRef.current) return;
    if (combinedLoading || !hasMessages) return;
    dmListLayoutAnchorDoneRef.current = true;
    runDmScrollAnchor();
  }, [chatType, combinedLoading, hasMessages, runDmScrollAnchor]);

  useEffect(() => {
    if (chatType !== 'dm' || combinedLoading || !hasMessages) return;
    if (!scroll.listShellVisible || scroll.initialScrollSettling) return;
    runDmScrollAnchor();
  }, [
    chatType,
    combinedLoading,
    hasMessages,
    scroll.listShellVisible,
    scroll.initialScrollSettling,
    roomId,
    runDmScrollAnchor,
  ]);

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

      <View style={chatStyles.chatScreenBody}>
        <View style={chatStyles.chatScreenMain}>
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

        <Animated.View
          style={[chatStyles.chatListContainer, listAnimStyle]}
          onLayout={chatType === 'dm' ? handleDmChatListLayout : undefined}
        >
          {!combinedLoading && chat.hasMore && scroll.showLoadMoreButton ? (
            <View style={chatStyles.loadMoreWrap}>
              <TouchableOpacity
                activeOpacity={0.9}
                disabled={chat.isLoadingMore}
                onPress={() => scroll.triggerLoadMore?.()}
                style={chatStyles.loadMoreButton}
              >
                <Text style={chatStyles.loadMoreButtonText}>
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
            <View pointerEvents="auto" style={chatStyles.chatSkeletonOverlay}>
              <View style={chatStyles.chatSkeletonTop}>
                <Skeleton
                  width={normalize(120)}
                  height={normalize(12)}
                  borderRadius={normalize(6)}
                />
              </View>
              <View style={chatStyles.chatSkeletonBody}>
                <View style={chatStyles.chatSkeletonRowLeft}>
                  <Skeleton width={normalize(28)} height={normalize(28)} borderRadius={normalize(14)} />
                  <View style={chatStyles.chatSkeletonBubbleWrap72}>
                    <Skeleton width={normalize(140)} height={normalize(12)} borderRadius={normalize(6)} />
                    <Skeleton width={normalize(190)} height={normalize(14)} borderRadius={normalize(8)} />
                  </View>
                </View>
                <View style={chatStyles.chatSkeletonRowRight}>
                  <View style={chatStyles.chatSkeletonBubbleWrap72Right}>
                    <Skeleton width={normalize(160)} height={normalize(14)} borderRadius={normalize(8)} />
                    <Skeleton width={normalize(110)} height={normalize(12)} borderRadius={normalize(6)} />
                  </View>
                </View>
                <View style={chatStyles.chatSkeletonRowLeft}>
                  <Skeleton width={normalize(28)} height={normalize(28)} borderRadius={normalize(14)} />
                  <View style={chatStyles.chatSkeletonBubbleWrap68}>
                    <Skeleton width={normalize(120)} height={normalize(12)} borderRadius={normalize(6)} />
                    <Skeleton width={normalize(170)} height={normalize(14)} borderRadius={normalize(8)} />
                  </View>
                </View>
              </View>
              <View style={chatStyles.chatSkeletonBottomSpacer} />
            </View>
          ) : null}
        </Animated.View>

        {/* 토스트 */}
        {toastText ? (
          <View pointerEvents="none" style={chatStyles.chatToastWrap}>
            <View style={chatStyles.chatToastCard}>
              <Text style={chatStyles.chatToastText}>
                {toastText}
              </Text>
            </View>
          </View>
        ) : null}

          <Animated.View style={inputAnimStyle}>
            {/* 답장 프리뷰 */}
            {replyToMessage ? (
              <TouchableOpacity
                onPress={() => setReplyToMessage(null)}
                style={chatStyles.replyPreviewContainer || chatStyles.replyPreviewFallback}
              >
                <View style={chatStyles.replyPreviewMetaWrap}>
                  <Text
                    style={chatStyles.replyPreviewTitle || chatStyles.replyPreviewTitleFallback}
                  >
                    {replyToMessage.isMe ? '나에게' : '상대방에게'} 답장 중
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={chatStyles.replyPreviewContent || chatStyles.replyPreviewContentFallback}
                  >
                    {replyToMessage.content || '(이미지 메시지)'}
                  </Text>
                </View>
                <Ionicons
                  name="close-circle"
                  size={normalize(18)}
                  color={chatStyles.replyPreviewContentFallback.color}
                />
              </TouchableOpacity>
            ) : null}
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

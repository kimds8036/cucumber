import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
import Loading from '../../../../components/Loading';
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

  // 훅 호출: (roomId, socket) 2개 인자
  const chat = useChatHook(hookConfig.roomId, hookConfig.socket);

  const [inputText, setInputText] = useState('');
  const [chatImages, setChatImages] = useState([]);

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
  const flatData = useMemo(
    () => injectDateBanners(withMessageGroupFlags(chat.messages || [])),
    [chat.messages],
  );

  const scroll = useChatScroll({
    roomId,
    messages: chat.messages,
    flatData,
    isLoading: chat.isLoading,
    isLoadingMore: chat.isLoadingMore,
    loadMore: chat.loadMore,
  });

  // 로딩 화면
  if (chat.isLoading && (!chat.messages || chat.messages.length === 0)) {
    return (
      <SafeAreaView style={detailStyles.container} edges={['top']}>
        <SubHeader
          title={headerConfig?.title || '채팅'}
          onBack={headerConfig?.onBack}
          titleElement={headerConfig?.titleElement}
        />
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Loading size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const handleSend = () => {
    chat.sendMessage({
      text: inputText,
      images: chatImages,
      replyTo: replyToMessage,
    });
    setInputText('');
    setChatImages([]);
    setReplyToMessage(null);
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
    scroll.listRef.current?.scrollToIndex?.({
      index: targetIndex,
      animated: true,
      viewPosition: 0.5,
    });
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

  return (
    <SafeAreaView style={detailStyles.container} edges={['top']}>
      <SubHeader
        title={headerConfig?.title || '채팅'}
        onBack={headerConfig?.onBack}
        titleElement={headerConfig?.titleElement}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? insets.top + normalize(48) : 0
        }
      >
        {chatType === 'room' && (
          <PostCard
            roomId={roomId}
            normalize={normalize}
            onPress={(post) => {
              if (!post?.id || !navigation) return;
              navigation.navigate('BoardDetail', {
                post: { id: post.id },
                isMyPost: false,
              });
            }}
          />
        )}

        <MessageList
          roomId={roomId}
          data={flatData}
          messages={chat.messages}
          listRef={scroll.listRef}
          isLoadingMore={chat.isLoadingMore}
          handleScroll={scroll.handleScroll}
          handleStartReached={scroll.handleStartReached}
          handleListShellLayout={scroll.handleListShellLayout}
          listShellVisible={scroll.listShellVisible}
          contentHeightRef={scroll.contentHeightRef}
          renderMessageProps={renderMessageProps}
          normalize={normalize}
          handleViewableItemsChanged={scroll.handleViewableItemsChanged}
        />

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
          keyboardHeight={scroll.keyboardHeight}
          bottomInset={insets.bottom}
          mainPlaceholder={mainPlaceholder}
          chatInputStyles={chatInputStyles}
        />
      </KeyboardAvoidingView>

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

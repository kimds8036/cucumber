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
  KeyboardAvoidingView,
  Platform,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    sendMessage,
    loadMore,
    typingUsers,
    myId,
    deleteMessage,
  } = useDMChat(roomId, socketManager);

  const [inputText, setInputText] = useState('');
  const [chatImages, setChatImages] = useState([]);
  const listRef = useRef(null);
  const isLoadingMoreRef = useRef(false);
  const [listShellVisible, setListShellVisible] = useState(false);
  const initialScrollDoneRef = useRef(false);

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const [longPressMenu, setLongPressMenu] = useState(null);
  const [replyToMessage, setReplyToMessage] = useState(null);

  const showToast = useCallback((text) => {
    // DMChat은 아직 별도 토스트 UI가 없으므로 콘솔로만 처리
    console.log('[DMChat][Toast]', text);
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

  const handleInputChange = useCallback(
    (text) => {
      setInputText(text);
      if (!roomId) return;
      if (myId == null) return;

      const userName = friend.name || '친구';

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
        socketManager.emit('typing_start', {
          roomId,
          userId: myId,
          userName,
        });
        isTypingRef.current = true;
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketManager.emit('typing_stop', { roomId, userId: myId });
        isTypingRef.current = false;
        typingTimeoutRef.current = null;
      }, 1500);
    },
    [roomId, myId, friend.name],
  );

  useEffect(() => {
    isTypingRef.current = false;
    isLoadingMoreRef.current = false;
    setListShellVisible(false);
    initialScrollDoneRef.current = false;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [roomId]);

  useEffect(() => {
    if (messages.length > 0 && !initialScrollDoneRef.current) {
      // 즉시 end로 맞춘 다음, 레이아웃이 안정화될 시간을 준 뒤 표시
      listRef.current?.scrollToEnd?.({ animated: false });
      const t = setTimeout(() => {
        listRef.current?.scrollToEnd?.({ animated: false });
        initialScrollDoneRef.current = true;
        setListShellVisible(true);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [messages.length > 0]);

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
        <Text
          numberOfLines={1}
          style={{
            fontSize: normalize(17),
            fontWeight: '700',
            fontFamily: fonts.bold,
            color: colors.textPrimary,
            flex: 1,
          }}
        >
          {friend.name || '친구'}
        </Text>
      </View>
    ),
    [normalize, friend.name, friend.colorIndex],
  );

  const handleBack = () => navigation.goBack();

  const renderItem = useCallback(
    ({ item }) => (
      <MessageItem
        msg={item}
        chatStyles={chatStyles}
        normalize={normalize}
        onOpenLongPressMenu={openLongPressMenu}
      />
    ),
    [chatStyles, normalize, openLongPressMenu],
  );

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
              {friend.name || '친구'}이(가) 입력 중...
            </Text>
            <ActivityIndicator
              size="small"
              color="#999"
              style={{ marginLeft: 4 }}
            />
          </View>
        )}

        <View
          style={{ flex: 1, opacity: listShellVisible ? 1 : 0 }}
          onLayout={() => {
            // 초기 end로 맞춘 뒤에만 표시
            if (initialScrollDoneRef.current) setListShellVisible(true);
          }}
        >
          <FlatList
            ref={listRef}
            data={displayMessages}
            keyExtractor={(item) => item.id}
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
            onScroll={({ nativeEvent }) => {
              if (
                nativeEvent.contentOffset.y < 50 &&
                hasMore &&
                !isLoadingMoreRef.current &&
                initialScrollDoneRef.current
              ) {
                isLoadingMoreRef.current = true;
                loadMore().finally(() => {
                  setTimeout(() => {
                    isLoadingMoreRef.current = false;
                  }, 800);
                });
              }
            }}
            scrollEventThrottle={200}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

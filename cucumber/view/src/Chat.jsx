import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Keyboard,
  Platform,
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

const DEFAULT_POST = {
  id: 1,
  author: '익명',
  time: '2시간 전',
  location: '',
  content:
    '중간고사 D-7 같이 공부하실 분? 시험기간인데 혼자 공부하니까 집중이 안 돼서요. 온라인으로라도 같이 공부하실 분 있나요? 디스코드 공부방 만들까 생각 중임',
  likes: 213,
  comments: 89,
  liked: false,
};

const MOCK_CHAT_MESSAGES = [
  { id: '1', isMe: false, content: '오늘 밤 뭐 나옴?', time: '23:01' },
  { id: '2', isMe: true, content: '밥 나옴', time: '23:02', isRead: false },
  { id: '3', isMe: false, content: '맛있어?', time: '23:02' },
  { id: '4', isMe: true, content: '응 맛있어', time: '23:03', isRead: true },
];

export default function Chat({ navigation, route }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getBoardNormalize(width), [width]);
  const detailStyles = useMemo(() => createDetailStyles(width, normalize), [width, normalize]);
  const chatStyles = useMemo(() => createChatStyles(width, normalize), [width, normalize]);

  const post = route?.params?.post ?? DEFAULT_POST;
  const [postLiked, setPostLiked] = useState(post.liked ?? false);
  const [messages, setMessages] = useState(MOCK_CHAT_MESSAGES);
  const [inputText, setInputText] = useState('');
  const insets = useSafeAreaInsets();

  const scrollViewRef = useRef(null);
  const bottomInputRef = useRef(null);
  const contentHeightRef = useRef(0);
  const scrollViewHeightRef = useRef(0);

  const scrollToBottom = (animated = true) => {
    const ref = scrollViewRef.current;
    if (!ref) return;
    const ch = contentHeightRef.current;
    const sh = scrollViewHeightRef.current;
    if (ch > sh) {
      ref.scrollTo({ y: Math.max(0, ch - sh), animated });
    } else {
      ref.scrollToEnd({ animated });
    }
  };

  // 키보드 올라온 뒤 지연 스크롤 (즉시 스크롤 시 포커스 손실로 키보드가 내려가는 현상 방지)
  const scrollTimeoutRef = useRef(null);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const delay = Platform.OS === 'ios' ? 400 : 300;
    const sub = Keyboard.addListener(showEvent, () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        scrollToBottom(true);
        scrollTimeoutRef.current = null;
      }, delay);
    });
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      sub.remove();
    };
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom(false));
  }, []);

  const handleScrollContentSizeChange = (_w, contentHeight) => {
    contentHeightRef.current = contentHeight;
    const sh = scrollViewHeightRef.current;
    if (contentHeight > sh) {
      requestAnimationFrame(() => scrollToBottom(false));
    }
  };

  const handleBack = () => navigation.goBack();
  const handlePostLike = () => setPostLiked((prev) => !prev);
  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), isMe: true, content: inputText.trim(), time: '23:04', isRead: false },
    ]);
    setInputText('');
  };

  return (
    <SafeAreaView style={[detailStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={{ zIndex: 1, elevation: 1, backgroundColor: colors.background }}>
        <SubHeader title="쪽지" onBack={handleBack} />
      </View>

      <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        {/* 1) 게시글 카드: 깔끔한 디자인 */}
        <View
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
              <Text style={detailStyles.detailDot}>•</Text>
              <Text style={detailStyles.detailTime}>{post.time}</Text>
            </View>
            {post.location ? (
              <View style={detailStyles.detailLocation}>
                <Ionicons name="location-sharp" size={normalize(12)} color={colors.textSecondary} />
                <Text style={detailStyles.detailLocationText}>{post.location}</Text>
              </View>
            ) : null}
          </View>

          {/* 게시글 내용 */}
          <Text style={[detailStyles.detailBody, { marginVertical: normalize(12) }]}>
            {post.content}
          </Text>

          {/* 구분선 */}
          <View style={{ height: 1, backgroundColor: '#F0F0F0', marginVertical: normalize(8) }} />

          {/* 게시글 푸터 */}
          <View style={detailStyles.detailFooter}>
            <View style={detailStyles.detailStats}>
              <TouchableOpacity
                style={detailStyles.detailStatItem}
                onPress={handlePostLike}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <FontAwesome
                  name={postLiked ? 'heart' : 'heart-o'}
                  size={normalize(14)}
                  color={colors.alert}
                />
                <Text style={detailStyles.detailStatText}>{post.likes}</Text>
              </TouchableOpacity>
              <View style={detailStyles.detailStatItem}>
                <Ionicons name="chatbubble-outline" size={normalize(15)} color={colors.primary} />
                <Text style={detailStyles.detailStatText}>{post.comments}</Text>
              </View>
            </View>
            <TouchableOpacity style={detailStyles.detailMenuBtn} activeOpacity={0.7}>
              <Entypo name="dots-three-vertical" size={normalize(14)} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2) 채팅 영역 */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: normalize(12),
            paddingBottom: normalize(10),
            paddingTop: normalize(8),
          }}
          onContentSizeChange={handleScrollContentSizeChange}
          onLayout={(e) => {
            scrollViewHeightRef.current = e.nativeEvent.layout.height;
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {messages.map((msg) =>
            msg.isMe ? (
              <View key={msg.id} style={chatStyles.chatRowUser}>
                <View style={chatStyles.userBubbleAndTime}>
                  <View style={chatStyles.userTimeColumn}>
                    {!msg.isRead && (
                      <Text style={chatStyles.chatUnreadCount}>1</Text>
                    )}
                    <Text style={chatStyles.chatTimeUser}>{msg.time}</Text>
                  </View>
                  <View style={chatStyles.userBubble}>
                    <Text style={chatStyles.userBubbleText}>{msg.content}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View key={msg.id} style={chatStyles.chatRowOpponent}>
                <View style={chatStyles.chatProfileCircle}>
                  <MessageTabIcon
                    width={normalize(28)}
                    height={normalize(28)}
                    color={colors.green}
                  />
                </View>
                <View style={chatStyles.opponentBody}>
                  <View style={chatStyles.opponentNameAndBubble}>
                    <Text style={chatStyles.opponentName}>익명</Text>
                    <View style={chatStyles.opponentBubble}>
                      <Text style={chatStyles.opponentBubbleText}>{msg.content}</Text>
                    </View>
                  </View>
                  <Text style={chatStyles.chatTimeOpponent}>{msg.time}</Text>
                </View>
              </View>
            )
          )}
        </ScrollView>

        {/* 3) 입력창 */}
        <View
          style={{
            backgroundColor: colors.background,
            paddingBottom: Math.max(insets.bottom, normalize(12)),
            borderTopWidth: 1,
            borderTopColor: '#E8E8E8',
          }}
        >
          <CommentInput
            bottomInputRef={bottomInputRef}
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
    </SafeAreaView>
  );
}
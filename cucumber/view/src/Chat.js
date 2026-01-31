import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  TextInput,
  Keyboard,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Entypo } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import SubHeader from '../frame/subHeader';
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

const KEYBOARD_INPUT_OVERLAP = 30;

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
  const contentHeightRef = useRef(0);
  const scrollViewHeightRef = useRef(0);
  const keyboardHeight = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      const h = Math.max(0, (e.endCoordinates?.height ?? 0) - KEYBOARD_INPUT_OVERLAP);
      if (Platform.OS === 'ios' && e.duration != null) {
        Animated.timing(keyboardHeight, {
          toValue: h,
          duration: e.duration,
          useNativeDriver: true,
        }).start(() => requestAnimationFrame(() => scrollToBottom(true)));
      } else {
        keyboardHeight.setValue(h);
        requestAnimationFrame(() => scrollToBottom(true));
      }
    };

    const onHide = (e) => {
      if (Platform.OS === 'ios' && e.duration != null) {
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: e.duration,
          useNativeDriver: true,
        }).start();
      } else {
        keyboardHeight.setValue(0);
      }
    };

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
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
      {/* 3. 헤더: 맨 위에 (z-order) */}
      <View style={{ zIndex: 1, elevation: 1, backgroundColor: colors.background }}>
        <SubHeader title="쪽지" onBack={handleBack} />
      </View>
      {/* 1. 뒷배경 → 2. (박스+입력창) 키보드와 같이 위로 밀림. 박스는 항상 상단에서 시작 */}
      <View style={{ flex: 1, backgroundColor: colors.background, overflow: 'hidden', zIndex: 0 }} pointerEvents="box-none">
        {/* 키보드 없을 때: [게시글] [채팅 ScrollView] [입력창 맨 아래]. 키보드 올라오면 전체가 위로 밀림 */}
        <Animated.View
          style={[
            { flex: 1, flexDirection: 'column' },
            { transform: [{ translateY: Animated.multiply(keyboardHeight, -1) }] },
          ]}
        >
          {/* 1) 게시글 카드: 상단 고정 */}
          <View style={chatStyles.chatSectionbox}>
            <View style={detailStyles.contentSection}>
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
              <Text style={detailStyles.detailBody}>{post.content}</Text>
              <View style={detailStyles.detailDivider} />
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
                <View>
                  <TouchableOpacity style={detailStyles.detailMenuBtn} activeOpacity={0.7}>
                    <Entypo name="dots-three-vertical" size={normalize(14)} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={chatStyles.chatDivider} />
          </View>

          {/* 2) 채팅 영역(말풍선): ScrollView만. 입력창은 ScrollView 밖 → 화면 맨 아래 고정 */}
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: normalize(10) }}
            onContentSizeChange={handleScrollContentSizeChange}
            onLayout={(e) => {
              scrollViewHeightRef.current = e.nativeEvent.layout.height;
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={chatStyles.chatSection}>
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
            </View>
          </ScrollView>

          {/* 3) 입력창: ScrollView 밖, 맨 아래 고정. 키보드 시 transform으로 키보드 위로 이동 */}
          <View
            style={[
              detailStyles.bottomInputRow,
              {
                position: 'relative',
                left: undefined,
                right: undefined,
                bottom: undefined,
                backgroundColor: colors.background,
                paddingBottom: Math.max(insets.bottom, normalize(12)),
              },
            ]}
          >
          <TextInput
            style={detailStyles.bottomInput}
            placeholder="메시지를 입력하세요"
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity
            style={detailStyles.sendButton}
            onPress={handleSendMessage}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up" size={normalize(22)} color={colors.background} />
          </TouchableOpacity>
        </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

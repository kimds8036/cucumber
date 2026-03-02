import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MainHeader from '../frame/mainHeader';
import MainFooter from '../frame/mainFooter';
import { createMessageStyles, getNormalize } from '../../styles/message.style';
import { colors, fonts } from '../../styles/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import MessageTabIcon from '../../assets/Group 166.svg';

// 프로필: 배경 primary, 아이콘 색상은 DB 연동 시 item.profileColor 등으로 교체
// const getIconColor = (item) => item.profileColor;
const ICON_COLORS = [colors.green, colors.yellow, colors.red, colors.blue]; // F7FFF3, FFFCD7, FFF3F3, E5F0FF
const getIconColorByIndex = (index) => ICON_COLORS[index % ICON_COLORS.length];

// 쪽지 임시 목록 (DB 연동 시 API로 교체)
const MOCK_NOTE_LIST = [
  {
    id: 1,
    profileColorIndex: 0,
    name: '익명',
    content: '오늘 밤 뭐 나옴?',
    time: '25/11/02 23:01',
    unreadCount: 1,
  },
  {
    id: 2,
    profileColorIndex: 1,
    name: '익명',
    content: '내일 과제 같이 할 사람~',
    time: '25/11/02 22:30',
    unreadCount: 0,
  },
  {
    id: 3,
    profileColorIndex: 2,
    name: '익명',
    content: '중간고사 D-7 같이 공부하실 분?',
    time: '25/11/02 21:00',
    unreadCount: 2,
  },
  {
    id: 4,
    profileColorIndex: 3,
    name: '익명',
    content: '광고 문의 드립니다.',
    time: '25/11/02 20:00',
    unreadCount: 0,
  },
];

// 개인 우편 임시 목록 (DB 연동 시 API로 교체, 받은 우편=익명 / 보낸 우편=보낸 사람 이름)
const MOCK_MAIL_LIST = [
  {
    id: 1,
    profileColorIndex: 0,
    isReceived: true,
    senderName: '익명',
    time: '25/11/02 23:01',
    unreadCount: 1,
  },
  {
    id: 2,
    profileColorIndex: 1,
    isReceived: false,
    senderName: '김은채',
    time: '25/11/02 22:30',
    unreadCount: 0,
  },
  {
    id: 3,
    profileColorIndex: 2,
    isReceived: true,
    senderName: '익명',
    time: '25/11/02 21:00',
    unreadCount: 2,
  },
  {
    id: 4,
    profileColorIndex: 3,
    isReceived: false,
    senderName: '김동석',
    time: '25/11/02 20:00',
    unreadCount: 0,
  },
];

// 메인 화면(MainScreen)에서 헤더/푸터 없이 메인 영역만 렌더할 때 사용
export function MessageContent({ navigation }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMessageStyles(width, normalize), [width, normalize]);

  const [messageType, setMessageType] = useState('note'); // 'note' | 'mail'
  const slideAnim = useRef(new Animated.Value(0)).current; // 0 = 쪽지, 1 = 개인우편

  const handleMessageTypeChange = (type) => {
    setMessageType(type);
    Animated.spring(slideAnim, {
      toValue: type === 'note' ? 0 : 1,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  };

  return (
    <>
      {/* 쪽지/개인우편 토글 — 슬라이딩 pill */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleTrack}>
          <Animated.View
            style={[
              styles.togglePill,
              {
                left: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '50%'],
                }),
              },
            ]}
          />
          <TouchableOpacity
            style={styles.toggleOption}
            onPress={() => handleMessageTypeChange('note')}
            activeOpacity={1}
          >
            <Text style={[styles.toggleOptionText, messageType === 'note' && styles.toggleOptionTextActive]}>
              쪽지
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleOption}
            onPress={() => handleMessageTypeChange('mail')}
            activeOpacity={1}
          >
            <Text style={[styles.toggleOptionText, messageType === 'mail' && styles.toggleOptionTextActive]}>
              개인 우편
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 메인 내용 영역 */}
      <View style={styles.contentArea}>
        {messageType === 'note' ? (
          <>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {MOCK_NOTE_LIST.map((item) => {
                // const iconColor = getIconColor(item); // DB 연동 시
                const iconColor = getIconColorByIndex(item.profileColorIndex);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.listItem}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation?.navigate('Chat', {
                        post: {
                          id: item.id,
                          author: '익명',
                          time: item.time,
                          content: item.content,
                          likes: 0,
                          comments: 0,
                          liked: false,
                        },
                      })
                    }
                  >
                    <View style={styles.listItemLeft}>
                      <View style={[styles.profileCircle, { backgroundColor: colors.primary }]}>
                        <MessageTabIcon
                          width={normalize(25)}
                          height={normalize(25)}
                          color={iconColor}
                        />
                      </View>
                      <View style={styles.listItemBody}>
                        <Text style={styles.listItemName}>{item.name}</Text>
                        <Text style={styles.listItemContent} numberOfLines={1}>
                          {item.content}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.listItemRight}>
                      <Text style={styles.listItemTime}>{item.time}</Text>
                      {item.unreadCount > 0 ? (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        ) : (
          <>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {MOCK_MAIL_LIST.map((item) => {
                // const iconColor = getIconColor(item); // DB 연동 시
                const iconColor = getIconColorByIndex(item.profileColorIndex);
                const displayName = item.isReceived ? '익명' : item.senderName;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.listItem}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation?.navigate('MailDetail', { mail: item })
                    }
                  >
                    <View style={styles.listItemLeft}>
                      <View style={[styles.profileCircle, { backgroundColor: colors.primary }]}>
                        <Ionicons
                          name={item.unreadCount > 0 ? 'mail' : 'mail-open'}
                          size={normalize(27)}
                          color={iconColor}
                        />
                      </View>
                      <View style={styles.listItemBody}>
                        <Text style={styles.listItemName}>{displayName}</Text>
                        <Text style={styles.listItemContent} numberOfLines={1}>
                          {item.isReceived ? '받은 우편' : '보낸 우편'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.listItemRight}>
                      <Text style={styles.listItemTime}>{item.time}</Text>
                      {item.unreadCount > 0 ? (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 개인 우편함: 우측 하단 글쓰기(비행기) 플로팅 버튼 */}
            <TouchableOpacity
              style={styles.floatingButton}
              activeOpacity={0.8}
              onPress={() => navigation?.navigate('SendMail')}
            >
              <Feather name="send" size={normalize(30)} top={normalize(2)} right={normalize(1)} color={colors.background} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </>
  );
}

// 단독 메시지 화면 (헤더+푸터 포함, 필요 시 사용)
const Message = ({ navigation }) => {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <MainHeader activeTab="message" />
      <MessageContent navigation={navigation} />
      <MainFooter
        activeTab="message"
        onTabPress={(tab) => {
          if (tab === 'board') navigation.navigate('Main');
        }}
      />
    </SafeAreaView>
  );
};

export default Message;

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Animated,
  Alert,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MainHeader from '../frame/mainHeader';
import MainFooter from '../frame/mainFooter';
import { createMessageStyles, getNormalize } from '../../styles/message.style';
import { colors, fonts } from '../../styles/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import MessageTabIcon from '../../assets/Group 166.svg';
import { api } from '../../utils/api';

// DB에 UTC로 저장된 날짜 문자열을 기기 로컬 시간대로 변환해서 파싱
function parseUtcToLocal(createdAt) {
  if (!createdAt) return null;
  let s = String(createdAt).trim();
  if (!s) return null;
  // MySQL "YYYY-MM-DD HH:mm:ss" 또는 "YYYY-MM-DDTHH:mm:ss" 형태이고
  // Z나 +09:00 같은 타임존 정보가 전혀 없으면 UTC로 간주해서 Z(=+00:00) 부여
  if (
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s) &&
    !/[Z+-]\d{2}:?\d{2}$/.test(s) &&
    !/Z$/.test(s)
  ) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// 목록용 시간: 오늘은 HH:MM, 그 외에는 YYYY.MM.DD (UTC → 로컬 기준)
function formatListTime(createdAt) {
  const d = parseUtcToLocal(createdAt);
  if (!d) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}.${mm}.${dd}`;
}

// 프로필: 배경 primary, 아이콘 색상은 DB 연동 시 item.profileColor 등으로 교체
// const getIconColor = (item) => item.profileColor;
const ICON_COLORS = [colors.green, colors.yellow, colors.red, colors.blue]; // F7FFF3, FFFCD7, FFF3F3, E5F0FF
const getIconColorByIndex = (index) => ICON_COLORS[index % ICON_COLORS.length];

const SwipeableRow = ({ children, onDelete }) => {
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(null);
  const containerWidth = measuredWidth ?? windowWidth;
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -80));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) {
          Animated.spring(translateX, { toValue: -80, useNativeDriver: true }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const closeSwipe = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
  };

  return (
    <View
      style={{ overflow: 'hidden' }}
      onLayout={(e) => setMeasuredWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={{
          flexDirection: 'row',
          width: containerWidth + 80,
          transform: [{ translateX }],
        }}
        {...panResponder.panHandlers}
      >
        <View style={{ flex: 1 }}>{children}</View>
        <TouchableOpacity
          onPress={() => {
            closeSwipe();
            onDelete?.();
          }}
          style={{
            width: 80,
            backgroundColor: colors.alert,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 11, marginTop: 2 }}>삭제</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// 메인 화면(MainScreen)에서 헤더/푸터 없이 메인 영역만 렌더할 때 사용
export function MessageContent({ navigation }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMessageStyles(width, normalize), [width, normalize]);

  const [messageType, setMessageType] = useState('note'); // 'note' | 'mail'
  const slideAnim = useRef(new Animated.Value(0)).current; // 0 = 쪽지, 1 = 개인우편
  const [noteRooms, setNoteRooms] = useState([]);
  const [mails, setMails] = useState([]);
  const [loadingNote, setLoadingNote] = useState(false);
  const [loadingMail, setLoadingMail] = useState(false);

  const handleMessageTypeChange = (type) => {
    setMessageType(type);
    Animated.spring(slideAnim, {
      toValue: type === 'note' ? 0 : 1,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  };

  // 쪽지 채팅방 목록 불러오기 (처음 + 화면 복귀 시마다 새로고침)
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoadingNote(true);
        const res = await api.get('/api/messages/rooms', {
          params: { page: 1, limit: 50 },
        });
        const rooms = res.data?.data?.rooms || [];
        const mapped = rooms.map((r, idx) => ({
          id: r.id,
          profileColorIndex: idx,
          name: '익명',
          content: r.last_message || r.post_content || '',
          time: formatListTime(r.last_message_at || r.created_at),
          unreadCount: r.unread_count || 0,
        }));
        setNoteRooms(mapped);
      } catch (error) {
        console.error('채팅방 목록 조회 실패:', error);
      } finally {
        setLoadingNote(false);
      }
    };

    fetchRooms();
    const unsubscribe = navigation?.addListener?.('focus', fetchRooms);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigation]);

  // 개인 우편 요약 목록 불러오기 (처음 + 화면 복귀 시마다 새로고침)
  useEffect(() => {
    const fetchMails = async () => {
      try {
        setLoadingMail(true);
        const res = await api.get('/api/mails/personal/received', {
          params: { page: 1, limit: 50 },
        });
        const apiMails = res.data?.data?.mails || [];
        const mapped = apiMails.map((m, idx) => ({
          id: m.id,
          profileColorIndex: idx,
          isReceived: true,
          senderName: '익명',
          time: formatListTime(m.created_at || ''),
          unreadCount: m.is_read ? 0 : 1,
          raw: m,
        }));
        setMails(mapped);
      } catch (error) {
        console.error('개인 우편 목록 조회 실패:', error);
      } finally {
        setLoadingMail(false);
      }
    };

    fetchMails();
    const unsubscribe = navigation?.addListener?.('focus', fetchMails);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigation]);

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
              {loadingNote && noteRooms.length === 0 ? (
                <View style={{ paddingVertical: normalize(40), alignItems: 'center' }}>
                  <Text style={{ fontFamily: fonts.regular, color: colors.textSecondary }}>
                    쪽지를 불러오는 중입니다...
                  </Text>
                </View>
              ) : noteRooms.length === 0 ? (
                <View style={{ paddingVertical: normalize(40), alignItems: 'center' }}>
                  <Text style={{ fontFamily: fonts.regular, color: colors.textSecondary }}>
                    아직 시작된 쪽지가 없습니다.
                  </Text>
                </View>
              ) : (
              noteRooms.map((item) => {
                // const iconColor = getIconColor(item); // DB 연동 시
                const iconColor = getIconColorByIndex(item.profileColorIndex);
                return (
                  <SwipeableRow
                    key={item.id}
                    onDelete={async () => {
                      try {
                        await api.delete(`/api/messages/rooms/${item.id}`);
                        setNoteRooms((prev) => prev.filter((r) => r.id !== item.id));
                      } catch (e) {
                        Alert.alert('오류', '삭제에 실패했습니다.');
                      }
                    }}
                  >
                    <TouchableOpacity
                      style={styles.listItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        // 1️⃣ Optimistic UI: 목록에서 즉시 빨간 숫자 제거
                        setNoteRooms((prev) =>
                          prev.map((room) =>
                            room.id === item.id ? { ...room, unreadCount: 0 } : room
                          )
                        );
                        // 2️⃣ 채팅방으로 이동 → Chat 화면에서 바로 read API 호출 및 DB is_read 업데이트
                        navigation?.navigate('Chat', {
                          roomId: item.id,
                        });
                      }}
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
                  </SwipeableRow>
                );
              }))}
            </ScrollView>
          </>
        ) : (
          <>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {loadingMail && mails.length === 0 ? (
                <View style={{ paddingVertical: normalize(40), alignItems: 'center' }}>
                  <Text style={{ fontFamily: fonts.regular, color: colors.textSecondary }}>
                    우편함을 불러오는 중입니다...
                  </Text>
                </View>
              ) : mails.length === 0 ? (
                <View style={{ paddingVertical: normalize(40), alignItems: 'center' }}>
                  <Text style={{ fontFamily: fonts.regular, color: colors.textSecondary }}>
                    아직 도착한 우편이 없습니다.
                  </Text>
                </View>
              ) : (
              mails.map((item) => {
                // const iconColor = getIconColor(item); // DB 연동 시
                const iconColor = getIconColorByIndex(item.profileColorIndex);
                const displayName = item.isReceived ? '익명' : item.senderName;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.listItem}
                    activeOpacity={0.7}
                    onPress={async () => {
                      const mailId = item.id;
                      // 1️⃣ Optimistic UI: 목록에서 즉시 빨간 숫자 제거 + 아이콘 open 상태로
                      setMails((prev) =>
                        prev.map((m) =>
                          m.id === mailId ? { ...m, unreadCount: 0, is_read: true } : m
                        )
                      );

                      // 2️⃣ 개인 우편 상세로 이동
                      navigation?.navigate('MailDetail', {
                        mail: {
                          ...(item.raw || item),
                          isReceived: item.isReceived,
                          counterpartyUserId: item.raw?.sender_id ?? item.raw?.recipient_id ?? null,
                        },
                      });

                      // 3️⃣ DB is_read 업데이트 (딜레이 없이, 실패해도 UI는 유지)
                      try {
                        await api.put(`/api/mails/personal/${mailId}/read`);
                      } catch (error) {
                        console.error('개인 우편 읽음 처리 실패:', error);
                      }
                    }}
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
              }))}
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

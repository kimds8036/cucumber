import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Animated,
  Alert,
  PanResponder,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MainHeader from '../frame/mainHeader';
import MainFooter from '../frame/mainFooter';
import { createMessageStyles, getNormalize } from '../../styles/message.style';
import { colors, fonts, fontSizes } from '../../styles/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import MessageTabIcon from '../../assets/Group 166.svg';
import { api } from '../../utils/api';
import * as socketManager from './socketManager';
import { useToast } from '../../context/ToastContext';

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

function extractMailListFromResponse(res) {
  const payload = res?.data;
  const data = payload?.data;
  if (Array.isArray(data?.mails)) return data.mails;
  if (Array.isArray(data)) return data;
  if (Array.isArray(payload?.mails)) return payload.mails;
  return [];
}

// 프로필: 배경 primary, 아이콘 색상은 DB 연동 시 item.profileColor 등으로 교체
// const getIconColor = (item) => item.profileColor;
const ICON_COLORS = [colors.green, colors.yellow, colors.red, colors.blue]; // F7FFF3, FFFCD7, FFF3F3, E5F0FF
const getIconColorByIndex = (index) => ICON_COLORS[index % ICON_COLORS.length];

/** Text 줄박스는 fontSize보다 크므로(특히 Android includeFontPadding) 실제 목록과 맞는 줄 높이로 맞춤 */
function messageListSkeletonLineHeight(normalize, fontSizeToken) {
  const base = normalize(Math.ceil(fontSizeToken * 1.42));
  const androidExtra = Platform.OS === 'android' ? normalize(3) : 0;
  return base + androidExtra;
}

/** 쪽지 / 개인 우편 목록 로딩용 — 실제 행: 배지 없음 기준, 줄 높이는 Text에 근접 */
function MessageListSkeleton({ styles, normalize, rowCount = 9 }) {
  const nameLineH = messageListSkeletonLineHeight(normalize, fontSizes.xl);
  const bodyLineH = messageListSkeletonLineHeight(normalize, fontSizes.lg);
  const timeLineH = bodyLineH;
  return (
    <>
      {Array.from({ length: rowCount }, (_, i) => (
        <View key={`msg-skel-${i}`} style={styles.listItem}>
          <View style={styles.listItemLeft}>
            <View
              style={[
                styles.profileCircle,
                { backgroundColor: '#E8E8E8' },
              ]}
            />
            <View style={[styles.listItemBody, { justifyContent: 'center' }]}>
              <View
                style={{
                  height: nameLineH,
                  width: i % 3 === 0 ? '42%' : '55%',
                  backgroundColor: '#ECECEC',
                  borderRadius: 6,
                  marginBottom: normalize(2),
                }}
              />
              <View
                style={{
                  height: bodyLineH,
                  width: i % 2 === 0 ? '78%' : '65%',
                  backgroundColor: '#F0F0F0',
                  borderRadius: 6,
                }}
              />
            </View>
          </View>
          <View style={styles.listItemRight}>
            <View
              style={{
                height: timeLineH,
                alignSelf: 'flex-end',
                width: normalize(68),
                marginBottom: normalize(4),
                backgroundColor: '#F0F0F0',
                borderRadius: 6,
              }}
            />
          </View>
        </View>
      ))}
    </>
  );
}

const SwipeableRow = ({ children, onDelete }) => {
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(windowWidth);
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -60));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -30) {
          Animated.spring(translateX, { toValue: -60, useNativeDriver: true, bounciness: 0 }).start();
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
      style={{ position: 'relative', overflow: 'hidden' }}
      onLayout={(e) => {
        const { width } = e.nativeEvent.layout;
        if (width > 0) setContainerWidth(width);
      }}
    >
      <TouchableOpacity
        onPress={() => {
          closeSwipe();
          onDelete?.();
        }}
        activeOpacity={0.8}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 60,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.alert,
          zIndex: 1,
        }}
      >
        <Ionicons name="trash-outline" size={24} color="#fff" />
      </TouchableOpacity>
      <Animated.View
        style={{
          width: containerWidth + 2,
          backgroundColor: colors.background,
          transform: [{ translateX }],
          zIndex: 2,
        }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

// 메인 화면(MainScreen)에서 헤더/푸터 없이 메인 영역만 렌더할 때 사용
export function MessageContent({ navigation }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMessageStyles(width, normalize), [width, normalize]);

  const [messageType, setMessageType] = useState('note'); // 'note' | 'mail' (쪽지 탭에 익명+DM 혼합)
  const slideAnim = useRef(new Animated.Value(0)).current; // 0=쪽지, 1=개인우편
  const [noteRooms, setNoteRooms] = useState([]);
  const [mails, setMails] = useState([]);
  const [loadingNote, setLoadingNote] = useState(false);
  const [loadingMail, setLoadingMail] = useState(false);
  const { setIsMessageTab } = useToast();

  const handleMessageTypeChange = (type) => {
    setMessageType(type);
    const toValue = type === 'note' ? 0 : 1;
    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  };

  const fetchRooms = useCallback(async () => {
    try {
      setLoadingNote(true);
      const [noteRes, dmRes] = await Promise.all([
        api.get('/api/messages/rooms', { params: { page: 1, limit: 50 } }).catch((e) => {
          console.error('채팅방 목록 조회 실패:', e);
          return { data: {} };
        }),
        api.get('/api/dm/rooms', { params: { page: 1, limit: 50 } }).catch((e) => {
          console.error('DM 목록 조회 실패:', e);
          return { data: {} };
        }),
      ]);

      const noteList = (noteRes.data?.data?.rooms ?? []).map((r, idx) => {
        const at = r.last_message_at || r.created_at;
        return {
          type: 'note',
          id: r.id,
          profileColorIndex: idx,
          name: '익명',
          content: r.last_message || r.post_content || '',
          time: formatListTime(at),
          unreadCount: r.unread_count || 0,
          sortTime: parseUtcToLocal(at)?.getTime() ?? 0,
        };
      });

      const dmList = (dmRes.data?.data?.rooms ?? []).map((r, idx) => {
        const at = r.last_message_at || r.created_at;
        return {
          type: 'dm',
          id: r.id,
          profileColorIndex: idx,
          name: r.other_user_name || '친구',
          content: r.last_message || '',
          time: formatListTime(at),
          unreadCount: Number(r.unread_count) || 0,
          other_user_id: r.other_user_id,
          other_user_name: r.other_user_name,
          other_user_school_name: r.other_user_school_name,
          other_user_color_id: r.other_user_color_id,
          sortTime: parseUtcToLocal(at)?.getTime() ?? 0,
        };
      });

      const merged = [...noteList, ...dmList].sort((a, b) => b.sortTime - a.sortTime);
      setNoteRooms(merged);
    } catch (error) {
      console.error('쪽지 목록 조회 실패:', error);
    } finally {
      setLoadingNote(false);
    }
  }, []);

  // 쪽지 탭: 익명 채팅방 + DM 방 동시 조회 후 최신순 병합
  useEffect(() => {
    fetchRooms();
    const unsubscribe = navigation?.addListener?.('focus', fetchRooms);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigation, fetchRooms]);

  // 채팅 관련 소켓 이벤트 수신 시 목록 실시간 갱신
  useEffect(() => {
    let isMounted = true;

    const handleNewMessage = (payload) => {
      const roomId = payload?.message?.room_id;
      const messageId = payload?.message?.id;
      const senderId = payload?.message?.sender_id;
      const senderName = payload?.message?.sender_name;
      const hasContent = Boolean(payload?.message?.content);
      const imageCount = Array.isArray(payload?.message?.images)
        ? payload.message.images.length
        : 0;

      console.log('[MessageListSocket] new_message received', {
        roomId: payload?.message?.room_id,
        messageId: payload?.message?.id,
        senderId,
        senderName,
        hasContent,
        imageCount,
        receivedAt: new Date().toISOString(),
      });

      console.log('[MessageListSocket] fetchRooms scheduled', {
        reason: 'new_message',
        roomId,
        messageId,
      });
      fetchRooms();
    };
    const handleNotification = (payload) => {
      // 목록 화면에서도 new_message 이벤트 누락 가능성이 있어 notification을 보조 트리거로 사용
      if (payload?.type === 'friend_request') return;
      if (
        payload?.relatedType === 'message_room' ||
        payload?.relatedType === 'dm_room' ||
        payload?.category === 'mail' ||
        payload?.type === 'mail'
      ) {
        console.log('[MessageListSocket] fetchRooms scheduled', {
          reason: 'notification',
          relatedType: payload?.relatedType,
          relatedId: payload?.relatedId,
        });
        fetchRooms();
      }
    };

    socketManager.connectSocket?.().then?.(() => {
      if (!isMounted) return;
      const currentSocket = socketManager.getSocket?.();
      console.log('[MessageListSocket] listener attach', {
        event: 'new_message',
        socketId: currentSocket?.id,
        connected: currentSocket?.connected,
      });
      socketManager.on('new_message', handleNewMessage);
      socketManager.on('notification', handleNotification);
    });

    return () => {
      isMounted = false;
      const currentSocket = socketManager.getSocket?.();
      console.log('[MessageListSocket] listener detach', {
        event: 'new_message',
        socketId: currentSocket?.id,
        connected: currentSocket?.connected,
      });
      socketManager.off('new_message', handleNewMessage);
      socketManager.off('notification', handleNotification);
    };
  }, [fetchRooms]);

  // 메시지 목록 화면 진입/이탈 상태를 전역 알림 정책에 공유
  useEffect(() => {
    setIsMessageTab(true);
    return () => {
      setIsMessageTab(false);
    };
  }, [setIsMessageTab]);

  // 개인 우편 요약 목록 불러오기 (처음 + 화면 복귀 시마다 새로고침)
  useEffect(() => {
    const fetchMails = async () => {
      try {
        setLoadingMail(true);
        const [receivedRes, sentRes] = await Promise.all([
          api.get('/api/mails/personal/received', { params: { page: 1, limit: 50 } }),
          api.get('/api/mails/personal/sent', { params: { page: 1, limit: 50 } }),
        ]);
        const received = extractMailListFromResponse(receivedRes);
        const sent = extractMailListFromResponse(sentRes);
        const latestReceived = received
          .slice()
          .sort((a, b) => {
            const ad = parseUtcToLocal(a.created_at);
            const bd = parseUtcToLocal(b.created_at);
            if (!ad || !bd) return 0;
            return bd - ad;
          })[0];
        const latestSent = sent
          .slice()
          .sort((a, b) => {
            const ad = parseUtcToLocal(a.created_at);
            const bd = parseUtcToLocal(b.created_at);
            if (!ad || !bd) return 0;
            return bd - ad;
          })[0];

        const candidates = [
          latestReceived ? { ...latestReceived, _isReceived: true } : null,
          latestSent ? { ...latestSent, _isReceived: false } : null,
        ].filter(Boolean);

        const latestOne = candidates.sort((a, b) => {
          const ad = parseUtcToLocal(a.created_at);
          const bd = parseUtcToLocal(b.created_at);
          if (!ad || !bd) return 0;
          return bd - ad;
        })[0];

        const mapped = latestOne ? [{
          id: latestOne.id,
          profileColorIndex: 0,
          isReceived: latestOne._isReceived,
          senderName: latestOne._isReceived ? '익명' : (latestOne.recipient_name || '익명'),
          directionText: latestOne._isReceived ? '익명' : (latestOne.recipient_name || '익명'),
          previewText: String(latestOne.content || '').slice(0, 40),
          time: formatListTime(latestOne.created_at || ''),
          unreadCount: latestOne._isReceived ? (latestOne.is_read ? 0 : 1) : 0,
          raw: latestOne,
        }] : [];
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
                <MessageListSkeleton styles={styles} normalize={normalize} rowCount={9} />
              ) : noteRooms.length === 0 ? (
                <View style={{ paddingVertical: normalize(40), alignItems: 'center' }}>
                  <Text style={{ fontFamily: fonts.regular, color: colors.textSecondary }}>
                    아직 시작된 쪽지가 없습니다.
                  </Text>
                </View>
              ) : (
              noteRooms.map((item) => {
                if (item.type === 'dm') {
                  const colorIdx =
                    item.other_user_color_id != null
                      ? Number(item.other_user_color_id) % ICON_COLORS.length
                      : item.profileColorIndex % ICON_COLORS.length;
                  const iconColor = getIconColorByIndex(colorIdx);
                  return (
                    <TouchableOpacity
                      key={`dm-${item.id}`}
                      style={styles.listItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        setNoteRooms((prev) =>
                          prev.map((r) =>
                            r.id === item.id && r.type === 'dm'
                              ? { ...r, unreadCount: 0 }
                              : r
                          )
                        );
                        navigation?.navigate('DMChat', {
                          roomId: item.id,
                          friend: {
                            id: item.other_user_id,
                            name: item.other_user_name || item.name,
                            schoolName: item.other_user_school_name || '',
                            colorIndex: colorIdx,
                          },
                        });
                      }}
                    >
                      <View style={styles.listItemLeft}>
                        <View style={[styles.profileCircle, { backgroundColor: colors.primary }]}>
                          <MessageTabIcon
                            width={normalize(22)}
                            height={normalize(22)}
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
                }

                const iconColor = getIconColorByIndex(item.profileColorIndex);
                return (
                  <SwipeableRow
                    key={`note-${item.id}`}
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
                        setNoteRooms((prev) =>
                          prev.map((room) =>
                            room.id === item.id ? { ...room, unreadCount: 0 } : room
                          )
                        );
                        navigation?.navigate('Chat', {
                          roomId: item.id,
                        });
                      }}
                    >
                      <View style={styles.listItemLeft}>
                        <View style={[styles.profileCircle, { backgroundColor: colors.primary }]}>
                          <MessageTabIcon
                            width={normalize(22)}
                            height={normalize(22)}
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
                <MessageListSkeleton styles={styles} normalize={normalize} rowCount={9} />
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
                const displayName = item.directionText || (item.isReceived ? '익명' : item.raw?.recipient_name || '익명');
                return (
                  <SwipeableRow
                    key={`mail-${item.id}-${item.isReceived ? 'r' : 's'}`}
                    onDelete={async () => {
                      try {
                        await api.delete(`/api/mails/personal/${item.id}`);
                        setMails((prev) => prev.filter((m) => m.id !== item.id));
                      } catch (e) {
                        Alert.alert('오류', '우편 삭제에 실패했습니다.');
                      }
                    }}
                  >
                    <TouchableOpacity
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
                        if (item.isReceived) {
                          try {
                            await api.put(`/api/mails/personal/${mailId}/read`);
                          } catch (error) {
                            console.error('개인 우편 읽음 처리 실패:', error);
                          }
                        }
                      }}
                    >
                      <View style={styles.listItemLeft}>
                        <View style={[styles.profileCircle, { backgroundColor: colors.primary }]}>
                          <Ionicons
                            name={item.unreadCount > 0 ? 'mail' : 'mail-open'}
                            size={normalize(23)}
                            color={iconColor}
                          />
                        </View>
                        <View style={styles.listItemBody}>
                          <Text style={styles.listItemName}>{displayName}</Text>
                          <Text style={styles.listItemContent} numberOfLines={1}>
                            {item.previewText || (item.isReceived ? '받은 우편' : '보낸 우편')}
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

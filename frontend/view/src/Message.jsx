import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
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
import { StackActions } from '@react-navigation/native';
import MessageTabIcon from '../../assets/Logo.svg';
import { api } from '../../utils/api';
import * as socketManager from './socketManager';
import { useToast } from '../../context/ToastContext';
import { useNotification } from '../../context/NotificationContext';

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

/** 게시판(boardAll)과 동일: 서버 created_at(UTC) → 방금/n분 전/…/월 일 */
function formatTimeAgo(createdAt) {
  if (!createdAt) return '';
  let dateStr = typeof createdAt === 'string' ? createdAt.trim() : String(createdAt);
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dateStr) && !/[Z+-]/.test(dateStr)) {
    dateStr = dateStr.replace(' ', 'T') + 'Z';
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

// 목록용 시간: 오늘은 HH:MM, 그 외에는 YYYY.MM.DD (UTC → 로컬 기준) — 쪽지/DM 행
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
  const openedRef = useRef(false);
  const animateTo = useCallback((toValue) => {
    translateX.stopAnimation((current) => {
      if (Math.abs(current - toValue) < 0.5) {
        openedRef.current = toValue === -60;
        return;
      }
      Animated.spring(translateX, {
        toValue,
        useNativeDriver: true,
        bounciness: 0,
      }).start(() => {
        openedRef.current = toValue === -60;
      });
    });
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) {
          const base = openedRef.current ? -60 : 0;
          translateX.setValue(Math.max(base + g.dx, -60));
        }
      },
      onPanResponderRelease: (_, g) => {
        const shouldOpen = g.dx < -30 || (openedRef.current && g.dx <= 0);
        if (shouldOpen) {
          animateTo(-60);
        } else {
          animateTo(0);
        }
      },
    })
  ).current;

  const closeSwipe = () => {
    animateTo(0);
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
  const [refreshingNote, setRefreshingNote] = useState(false);
  const [refreshingMail, setRefreshingMail] = useState(false);
  const { setIsMessageTab } = useToast();
  const { refreshHasUnread } = useNotification();
  const confirmDelete = useCallback(
    ({ title, message, onConfirm }) => {
      Alert.alert(
        title,
        message,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => {
              onConfirm?.();
            },
          },
        ],
        { cancelable: true },
      );
    },
    [],
  );

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

  const fetchRooms = useCallback(async ({ isPullRefresh = false } = {}) => {
    try {
      if (isPullRefresh) {
        setRefreshingNote(true);
      } else {
        setLoadingNote(true);
      }
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
      if (isPullRefresh) {
        setRefreshingNote(false);
      } else {
        setLoadingNote(false);
      }
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

  const fetchMails = useCallback(async ({ isPullRefresh = false } = {}) => {
    try {
      if (isPullRefresh) {
        setRefreshingMail(true);
      } else {
        setLoadingMail(true);
      }
      const [receivedRes, sentRes, meRes] = await Promise.all([
        api.get('/api/mails/personal/received', { params: { page: 1, limit: 50 } }),
        api.get('/api/mails/personal/sent', { params: { page: 1, limit: 50 } }),
        api.get('/api/auth/me'),
      ]);
      const received = extractMailListFromResponse(receivedRes);
      const sent = extractMailListFromResponse(sentRes);
      const me = meRes?.data?.data;
      const meId = Number(me?.id != null ? me.id : me?.userId);
      const candidates = [
        ...received.map((m) => ({ ...m, _isReceived: true })),
        ...sent.map((m) => ({ ...m, _isReceived: false })),
      ];

      if (candidates.length === 0) {
        setMails([]);
        return;
      }

      const getThreadGroupKey = (mail) => {
        const roomKey = Number(
          mail.room_id != null
            ? mail.room_id
            : (mail.thread_key != null
                ? mail.thread_key
                : (mail.root_mail_id != null ? mail.root_mail_id : mail.id))
        );
        return Number.isFinite(roomKey) ? roomKey : Number(mail.id);
      };

      const latestByRoom = new Map();
      const firstByRoom = new Map();
      candidates.forEach((candidate) => {
        const key = getThreadGroupKey(candidate);

        const prevLatest = latestByRoom.get(key);
        if (!prevLatest) {
          latestByRoom.set(key, candidate);
        } else {
          const prevTime = parseUtcToLocal(prevLatest.created_at)?.getTime() ?? 0;
          const nextTime = parseUtcToLocal(candidate.created_at)?.getTime() ?? 0;
          if (nextTime >= prevTime) latestByRoom.set(key, candidate);
        }

        const prevFirst = firstByRoom.get(key);
        if (!prevFirst) {
          firstByRoom.set(key, candidate);
        } else {
          const prevTime = parseUtcToLocal(prevFirst.created_at)?.getTime() ?? 0;
          const nextTime = parseUtcToLocal(candidate.created_at)?.getTime() ?? 0;
          if (nextTime < prevTime) firstByRoom.set(key, candidate);
        }
      });

      const rows = Array.from(latestByRoom.values())
        .sort((a, b) => {
          const ad = parseUtcToLocal(a.created_at);
          const bd = parseUtcToLocal(b.created_at);
          if (!ad || !bd) return 0;
          return bd - ad;
        })
        .map((mail, idx) => {
          const roomKey = getThreadGroupKey(mail);
          const firstMail = firstByRoom.get(roomKey) || mail;
          const isReceived = Boolean(mail._isReceived);
          const rawMail = { ...mail };
          delete rawMail._isReceived;
          const rawFirstMail = { ...firstMail };
          delete rawFirstMail._isReceived;

          const replyToMySent =
            isReceived &&
            Boolean(rawMail.reply_to_my_sent ?? rawMail.replyToMySent);

          const latestRecipientName =
            rawMail.recipient_name != null && String(rawMail.recipient_name).trim()
              ? String(rawMail.recipient_name).trim()
              : '';
          const firstRecipientName =
            rawFirstMail.recipient_name != null &&
            String(rawFirstMail.recipient_name).trim()
              ? String(rawFirstMail.recipient_name).trim()
              : '';
          const firstSenderId = Number(rawFirstMail.sender_id);
          const firstMailSentByMe = Number.isFinite(meId)
            ? Number.isFinite(firstSenderId) && firstSenderId === meId
            : !Boolean(firstMail._isReceived);
          // 방 라벨은 최신 메시지와 무관하게 "첫 메일" 기준으로 고정한다.
          const rowLabel = firstMailSentByMe
            ? (firstRecipientName || latestRecipientName || '익명')
            : '익명';
          return {
            id: rawMail.id,
            roomId: rawMail.room_id ?? null,
            profileColorIndex: idx,
            isReceived,
            replyToMySent,
            senderName: rowLabel,
            directionText: rowLabel,
            previewText: String(rawMail.content || '').slice(0, 40),
            time: formatTimeAgo(rawMail.created_at || ''),
            unreadCount: isReceived ? (rawMail.is_read ? 0 : 1) : 0,
            raw: rawMail,
          };
        });

      setMails(rows);
    } catch (error) {
      console.error('개인 우편 목록 조회 실패:', error);
    } finally {
      if (isPullRefresh) {
        setRefreshingMail(false);
      } else {
        setLoadingMail(false);
      }
    }
  }, []);

  // 개인 우편 요약 목록 불러오기 (처음 + 화면 복귀 시마다 새로고침)
  useEffect(() => {
    fetchMails();
    const unsubscribe = navigation?.addListener?.('focus', fetchMails);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigation, fetchMails]);

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
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingNote}
                  onRefresh={() => fetchRooms({ isPullRefresh: true })}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
            >
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
                    <SwipeableRow
                      key={`dm-${item.id}`}
                      onDelete={async () => {
                        confirmDelete({
                          title: 'DM 대화 삭제',
                          message:
                            '대화 내용을 삭제하시겠습니까?\n삭제하면 내 목록에서만 사라지고, 이후 새 메시지는 새 대화처럼 표시됩니다.',
                          onConfirm: async () => {
                            try {
                              await api.delete(`/api/dm/rooms/${item.id}`);
                              setNoteRooms((prev) => prev.filter((r) => !(r.type === 'dm' && r.id === item.id)));
                            } catch (e) {
                              Alert.alert('오류', 'DM 삭제에 실패했습니다.');
                            }
                          },
                        });
                      }}
                    >
                      <TouchableOpacity
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
                    </SwipeableRow>
                  );
                }

                const iconColor = getIconColorByIndex(item.profileColorIndex);
                return (
                  <SwipeableRow
                    key={`note-${item.id}`}
                    onDelete={async () => {
                      confirmDelete({
                        title: '쪽지 삭제',
                        message:
                          '대화 내용을 삭제하시겠습니까?\n삭제하면 내 목록에서만 사라지고, 이후 새 메시지는 새 대화처럼 표시됩니다.',
                        onConfirm: async () => {
                          try {
                            await api.delete(`/api/messages/rooms/${item.id}`);
                            setNoteRooms((prev) => prev.filter((r) => r.id !== item.id));
                          } catch (e) {
                            Alert.alert('오류', '삭제에 실패했습니다.');
                          }
                        },
                      });
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
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingMail}
                  onRefresh={() => fetchMails({ isPullRefresh: true })}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
            >
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
                const displayName =
                  item.senderName ||
                  item.directionText ||
                  '익명';
                return (
                  <SwipeableRow
                    key={`mail-${item.id}-${item.isReceived ? 'r' : 's'}`}
                    onDelete={async () => {
                      confirmDelete({
                        title: '개인 우편 삭제',
                        message:
                          '대화 내용을 삭제하시겠습니까?\n삭제하면 내 목록에서만 사라지고, 이후 새 우편은 새 대화처럼 표시됩니다.',
                        onConfirm: async () => {
                          if (!item.roomId) {
                            Alert.alert('오류', '우편 룸 정보를 찾을 수 없습니다.');
                            return;
                          }
                          try {
                            await api.delete(`/api/mails/personal/rooms/${item.roomId}`);
                            setMails((prev) => prev.filter((m) => m.roomId !== item.roomId));
                          } catch (e) {
                            Alert.alert('오류', '우편 삭제에 실패했습니다.');
                          }
                        },
                      });
                    }}
                  >
                    <TouchableOpacity
                      style={styles.listItem}
                      activeOpacity={0.7}
                      onPress={async () => {
                        const mailId = item.id;
                        const rawMail = item.raw || item;
                        const threadRootId =
                          rawMail.root_mail_id ?? rawMail.thread_key ?? rawMail.id ?? mailId;

                        // 알림 센터를 거치지 않고도 personal_mail 스레드 관련 알림을 즉시 읽음 처리
                        try {
                          await api.post('/api/notifications/read-personal-mail-thread', {
                            threadRootId,
                          });
                        } catch {
                          // ignore
                        } finally {
                          refreshHasUnread?.();
                        }
                        // 1️⃣ Optimistic UI: 목록에서 즉시 빨간 숫자 제거 + 아이콘 open 상태로
                        setMails((prev) =>
                          prev.map((m) =>
                            m.id === mailId ? { ...m, unreadCount: 0, is_read: true } : m
                          )
                        );

                        // 2️⃣ 개인 우편 상세로 이동
                        navigation?.navigate('MailDetail', {
                          mail: {
                            raw: item.raw || item,
                            isReceived: item.isReceived,
                            replyToMySent: Boolean(
                              item.replyToMySent ??
                                item.raw?.reply_to_my_sent ??
                                item.raw?.replyToMySent
                            ),
                            counterpartyUserId:
                              item.raw?.sender_id ?? item.raw?.recipient_id ?? null,
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
          if (tab === 'board') {
            navigation.dispatch(StackActions.popToTop());
          }
        }}
      />
    </SafeAreaView>
  );
};

export default Message;

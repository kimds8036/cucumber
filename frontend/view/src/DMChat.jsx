/**
 * 친구 DM — 게시글 쪽지(Chat)와 분리, /api/dm/* 만 사용
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { api } from '../../utils/api';
import { getFriendIconColorByIndex } from '../../components/timerFriendModals';

function parseUtcToLocal(createdAt) {
  if (!createdAt) return null;
  let s = String(createdAt).trim();
  if (
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s) &&
    !/[Z+-]\d{2}:?\d{2}$/.test(s) &&
    !/Z$/.test(s)
  ) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatChatTime(createdAt) {
  const d = parseUtcToLocal(createdAt);
  if (!d) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function DMChat({ navigation, route }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const normalize = useMemo(() => getBoardNormalize(width), [width]);
  const detailStyles = useMemo(
    () => createDetailStyles(width, normalize),
    [width, normalize],
  );

  const roomId = route?.params?.roomId;
  const friend = route?.params?.friend ?? {};

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const loadMessages = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/dm/rooms/${roomId}?limit=50`);
      const room = res.data?.room;
      const list = res.data?.data ?? [];
      if (!room) {
        setMessages([]);
        return;
      }
      const fid = Number(friend.id);
      const u1 = Number(room.user1_id);
      const u2 = Number(room.user2_id);
      const me = fid === u1 ? u2 : fid === u2 ? u1 : null;

      const mapped = list.map((m) => {
        const sid = Number(m.sender_id);
        return {
          id: String(m.id),
          content: m.content,
          isMe: me != null && sid === me,
          createdAt: m.created_at,
          time: formatChatTime(m.created_at),
        };
      });
      setMessages(mapped);
    } catch (e) {
      console.error('[DMChat] load', e);
    } finally {
      setLoading(false);
    }
  }, [roomId, friend.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const send = async () => {
    const t = inputText.trim();
    if (!t || !roomId || sending) return;
    setSending(true);
    try {
      await api.post(`/api/dm/rooms/${roomId}/messages`, { content: t });
      setInputText('');
      await loadMessages();
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd?.({ animated: true });
      });
    } catch (e) {
      console.error('[DMChat] send', e);
    } finally {
      setSending(false);
    }
  };

  const titleElement = useMemo(
    () => (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          marginLeft: 4,
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

  const renderItem = ({ item }) => (
    <View
      style={{
        alignSelf: item.isMe ? 'flex-end' : 'flex-start',
        maxWidth: '82%',
        marginBottom: normalize(8),
      }}
    >
      <View
        style={{
          backgroundColor: item.isMe ? colors.primary : colors.surface,
          borderRadius: normalize(14),
          paddingHorizontal: normalize(14),
          paddingVertical: normalize(10),
        }}
      >
        <Text
          style={{
            fontSize: normalize(17),
            fontFamily: fonts.regular,
            color: item.isMe ? colors.textPrimary : colors.textPrimary,
            lineHeight: normalize(22),
          }}
        >
          {item.content}
        </Text>
      </View>
      {item.time ? (
        <Text
          style={{
            fontSize: normalize(11),
            color: colors.textSecondary,
            marginTop: 4,
            alignSelf: item.isMe ? 'flex-end' : 'flex-start',
          }}
        >
          {item.time}
        </Text>
      ) : null}
    </View>
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

  if (loading && messages.length === 0) {
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
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: normalize(14),
            paddingTop: normalize(8),
            paddingBottom: normalize(10),
            flexGrow: 1,
          }}
          onContentSizeChange={() => {
            listRef.current?.scrollToEnd?.({ animated: false });
          }}
          showsVerticalScrollIndicator={false}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: normalize(12),
            paddingBottom:
              insets.bottom > 0 ? insets.bottom : normalize(12),
            paddingTop: normalize(8),
            borderTopWidth: 1,
            borderTopColor: '#E8E8E8',
            backgroundColor: colors.background,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              minHeight: normalize(40),
              maxHeight: normalize(120),
              borderRadius: normalize(12),
              backgroundColor: colors.surface,
              paddingHorizontal: normalize(14),
              paddingVertical: normalize(10),
              fontSize: normalize(17),
              fontFamily: fonts.regular,
              color: colors.textPrimary,
              marginRight: normalize(8),
            }}
            value={inputText}
            onChangeText={setInputText}
            placeholder="메시지 입력"
            placeholderTextColor={colors.textSecondary}
            multiline
            editable={!sending}
          />
          <TouchableOpacity
            onPress={send}
            disabled={sending || !inputText.trim()}
            style={{
              backgroundColor:
                sending || !inputText.trim() ? colors.disabled : colors.primary,
              paddingHorizontal: normalize(16),
              paddingVertical: normalize(12),
              borderRadius: normalize(12),
            }}
          >
            <Text style={{ color: colors.textWhite, fontWeight: '700' }}>
              전송
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

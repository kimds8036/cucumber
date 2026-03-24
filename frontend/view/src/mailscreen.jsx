import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Octicons from '@expo/vector-icons/Octicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SubHeader from '../frame/subHeader';
import { colors, PROFILE_COLORS } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';
import { api } from '../../utils/api';

function parseUtcToLocal(createdAt) {
  if (!createdAt) return null;
  let s = String(createdAt).trim();
  if (!s) return null;
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

function formatListTime(createdAt) {
  const d = parseUtcToLocal(createdAt);
  if (!d) return '';
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yy}/${mm}/${dd} ${hh}:${mi}`;
}

function getProfileColorById(colorId) {
  return PROFILE_COLORS[String(colorId)] || colors.primary;
}

function extractMailListFromResponse(res) {
  const payload = res?.data;
  const data = payload?.data;
  if (Array.isArray(data?.mails)) return data.mails;
  if (Array.isArray(data)) return data;
  if (Array.isArray(payload?.mails)) return payload.mails;
  return [];
}

function extractPaginationFromResponse(res) {
  const payload = res?.data;
  const data = payload?.data;
  return data?.pagination || payload?.pagination || null;
}

function mapMailToListItem(mail, isReceived) {
  return {
    id: mail.id,
    raw: mail,
    isReceived,
    parentMailId: mail.parent_mail_id != null ? mail.parent_mail_id : null,
    threadKey: Number(mail.thread_key != null ? mail.thread_key : (mail.root_mail_id != null ? mail.root_mail_id : mail.id)),
    createdAt: mail.created_at,
    counterpartyUserId: isReceived ? mail.sender_id : mail.recipient_id,
    preview: String(mail.content || '').slice(0, 40),
    receivedAt: formatListTime(mail.created_at),
    isUnread: isReceived ? !mail.is_read : false,
  };
}

function buildSentDisplayItems(mappedSentMails, parentMailById) {
  const grouped = new Map();
  mappedSentMails.forEach((mail) => {
    const key = mail.threadKey;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(mail);
  });

  const groupEntries = Array.from(grouped.entries()).sort((a, b) => {
    const aLatest = a[1].slice().sort((x, y) => {
      const xd = parseUtcToLocal(x.createdAt);
      const yd = parseUtcToLocal(y.createdAt);
      if (!xd || !yd) return 0;
      return yd - xd;
    })[0];
    const bLatest = b[1].slice().sort((x, y) => {
      const xd = parseUtcToLocal(x.createdAt);
      const yd = parseUtcToLocal(y.createdAt);
      if (!xd || !yd) return 0;
      return yd - xd;
    })[0];
    const ad = parseUtcToLocal(aLatest?.createdAt);
    const bd = parseUtcToLocal(bLatest?.createdAt);
    if (!ad || !bd) return 0;
    return bd - ad;
  });

  const displayItems = [];
  groupEntries.forEach(([, groupMails]) => {
    const replies = groupMails.filter((m) => Number(m.parentMailId) > 0);
    const roots = groupMails.filter((m) => !m.parentMailId);

    if (replies.length === 0) {
      roots
        .sort((a, b) => {
          const ad = parseUtcToLocal(a.createdAt);
          const bd = parseUtcToLocal(b.createdAt);
          if (!ad || !bd) return 0;
          return bd - ad;
        })
        .forEach((m) => displayItems.push({ ...m, rowKind: 'normal' }));
      return;
    }

    const parentId = Number(replies[0].parentMailId);
    const parentFromGroup = roots.find((r) => Number(r.id) === parentId);
    const parentFromApi = parentMailById.get(parentId);
    const parent = parentFromGroup || (parentFromApi ? mapMailToListItem(parentFromApi, true) : null);

    if (parent) {
      displayItems.push({
        ...parent,
        listKey: `parent-${parent.id}-${groupMails[0].threadKey}`,
        rowKind: 'parent',
        isReceived: true,
        isUnread: false,
      });
    }

    replies
      .sort((a, b) => {
        const ad = parseUtcToLocal(a.createdAt);
        const bd = parseUtcToLocal(b.createdAt);
        if (!ad || !bd) return 0;
        return ad - bd;
      })
      .forEach((reply) => displayItems.push({ ...reply, rowKind: 'reply' }));
  });

  return displayItems;
}

function MailInbox({ onOpen, onBack, navigation }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);
  const [tab, setTab] = useState('received');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchList = useCallback(async (nextPage = 1, append = false) => {
    try {
      if (nextPage === 1 && !append) setLoading(true);
      setError('');
      const isReceived = tab === 'received';
      const endpoint = isReceived ? '/api/mails/personal/received' : '/api/mails/personal/sent';
      const res = await api.get(endpoint, { params: { page: nextPage, limit: 20 } });
      console.log('[MailScreen] list 응답 원본:', JSON.stringify(res.data));
      const mails = extractMailListFromResponse(res);
      const pagination = extractPaginationFromResponse(res);
      console.log('[MailScreen] list 파싱 결과:', {
        endpoint,
        count: mails.length,
        hasDataMails: Array.isArray(res.data?.data?.mails),
        hasDataArray: Array.isArray(res.data?.data),
      });
      const mapped = mails.map((mail) => mapMailToListItem(mail, isReceived));
      let displayItems = mapped;

      if (!isReceived) {
        const parentIds = Array.from(
          new Set(
            mapped
              .map((m) => m.parentMailId)
              .filter((id) => Number.isInteger(Number(id)) && Number(id) > 0)
              .map((id) => Number(id))
          )
        );

        const parentMailById = new Map();
        if (parentIds.length > 0) {
          const parentResponses = await Promise.all(
            parentIds.map((parentId) =>
              api.get(`/api/mails/personal/${parentId}`).catch(() => null)
            )
          );
          parentResponses.forEach((resp) => {
            const parent = resp?.data?.data;
            if (parent?.id) parentMailById.set(Number(parent.id), parent);
          });
        }

        displayItems = buildSentDisplayItems(mapped, parentMailById);
      }
      const totalPages = Number(pagination?.totalPages || 1);

      setItems((prev) => (append ? [...prev, ...displayItems] : displayItems));
      setPage(nextPage);
      setHasMore(nextPage < totalPages);
    } catch (e) {
      setError(e.response?.data?.message || '우편함을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchList(1, false);
  }, [fetchList]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchList(1, false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SubHeader title="익명 우편함" onBack={onBack} />
      <View style={{ flexDirection: 'row', paddingHorizontal: normalize(16), gap: normalize(8), marginBottom: normalize(8) }}>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: normalize(10), borderRadius: normalize(12), backgroundColor: tab === 'received' ? colors.primary : '#EEE', alignItems: 'center' }}
          onPress={() => setTab('received')}
        >
          <Text style={{ color: tab === 'received' ? '#fff' : '#444' }}>받은 우편</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: normalize(10), borderRadius: normalize(12), backgroundColor: tab === 'sent' ? colors.primary : '#EEE', alignItems: 'center' }}
          onPress={() => setTab('sent')}
        >
          <Text style={{ color: tab === 'sent' ? '#fff' : '#444' }}>보낸 우편</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.inboxContainer, { paddingBottom: normalize(20) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading && (
          <View style={{ paddingVertical: normalize(20), alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        )}
        {!loading && !!error && (
          <View style={{ paddingVertical: normalize(20), alignItems: 'center' }}>
            <Text style={{ color: '#E74C3C' }}>{error}</Text>
          </View>
        )}
        {!loading && !error && items.length === 0 && (
          <View style={{ paddingVertical: normalize(20), alignItems: 'center' }}>
            <Text>우편이 없습니다.</Text>
          </View>
        )}
        {items.map((mail) => (
          <TouchableOpacity
            key={mail.listKey || String(mail.id)}
            style={[
              styles.mailCard,
              mail.isUnread && styles.mailCardUnread,
              mail.rowKind === 'parent' && { backgroundColor: '#f7f7f7' },
              mail.rowKind === 'reply' && { marginLeft: normalize(14), borderLeftWidth: 2, borderLeftColor: colors.textLight10 },
            ]}
            onPress={() => onOpen(mail)}
            activeOpacity={0.8}
          >
            <View style={styles.mailCardHeader}>
              <Text style={styles.anonLabel}>
                {mail.rowKind === 'parent'
                  ? '원본 우편'
                  : (mail.isReceived ? '익명' : (mail.raw?.recipient_name || '상대'))}
              </Text>
              <Text style={styles.dotSep}>•</Text>
              <Text style={styles.mailTime}>{mail.receivedAt}</Text>
            </View>
            <Text style={styles.mailPreview} numberOfLines={1}>{mail.preview}</Text>
            <View style={styles.cardDivider} />
            <View style={styles.mailCardFooter}>
              <View style={styles.replyStatus}>
                <Text style={styles.replyStatusPendingText}>
                  {mail.rowKind === 'parent'
                    ? '원본'
                    : mail.rowKind === 'reply'
                      ? '내 답장'
                      : (mail.isReceived ? '받은 우편' : '보낸 우편')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        {!loading && hasMore && (
          <TouchableOpacity
            style={{ marginTop: normalize(8), alignSelf: 'center' }}
            onPress={() => fetchList(page + 1, true)}
          >
            <Text style={{ color: colors.textSecondary }}>더 불러오기</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <TouchableOpacity
        style={styles.floatingButton}
        activeOpacity={0.8}
        onPress={() => navigation?.navigate('SendMail')}
      >
        <Text style={{ color: '#fff', fontSize: normalize(18) }}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function MailDetail({ mail: initialMail, onBack, navigation }) {
  const { width, height } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);

  const [mail, setMail] = useState(null);
  const [myName, setMyName] = useState('');
  const [latestMyReply, setLatestMyReply] = useState(null);
  const [subHeaderHeight, setSubHeaderHeight] = useState(0);
  const [bottomCtaHeight, setBottomCtaHeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const availableHeight = Math.max(0, height - subHeaderHeight - bottomCtaHeight);
  const halfCardHeight = Math.max(240, Math.floor(availableHeight * 0.4));

  const fetchDetail = useCallback(async () => {
    if (!initialMail?.id) return;
    try {
      setLoading(true);
      setError('');
      const [detailRes, meRes, threadRes] = await Promise.all([
        api.get(`/api/mails/personal/${initialMail.id}`),
        api.get('/api/auth/me'),
        api.get(`/api/mails/personal/${initialMail.id}/thread`).catch(() => null),
      ]);
      const m = detailRes.data?.data;
      const me = meRes.data?.data;
      const meId = Number(me?.id != null ? me?.id : me?.userId);
      const meDisplayName = me?.name || me?.username || '나';
      const threadMessages = threadRes?.data?.data?.messages || [];
      const myLatestSent = threadMessages
        .filter((msg) => Number(msg.sender_id) === meId)
        .sort((a, b) => {
          const ad = parseUtcToLocal(a.created_at);
          const bd = parseUtcToLocal(b.created_at);
          if (!ad || !bd) return 0;
          return bd - ad;
        })[0] || null;

      setMyName(meDisplayName);
      setLatestMyReply(myLatestSent);
      setMail({
        id: m.id,
        receivedAt: formatListTime(m.created_at),
        content: m.content || '',
        isReceived: initialMail?.isReceived != null ? initialMail?.isReceived : true,
        senderName: m.sender_name || '익명',
        senderColorId: m.sender_color_id != null ? m.sender_color_id : null,
        recipientColorId: m.recipient_color_id != null ? m.recipient_color_id : null,
        counterpartyUserId:
          (initialMail?.isReceived != null ? initialMail?.isReceived : true) ? m.sender_id : m.recipient_id,
      });
    } catch (e) {
      setError(e.response?.data?.message || '우편 상세를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [initialMail?.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);
  const hasReply = latestMyReply !== null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View
        onLayout={(e) => setSubHeaderHeight(e.nativeEvent.layout.height)}
      >
        <SubHeader
          title={mail?.isReceived === false ? '보낸 우편' : '받은 우편'}
          onBack={onBack}
          rightElement={(
            <View style={styles.historyIconWrapper}>
              <Octicons name="history" size={normalize(19)} color="black" />
            </View>
          )}
          onRightPress={() => navigation.navigate('AnonymousMailHistory', { threadId: mail?.counterpartyUserId })}
        />
      </View>

      <View style={styles.detailRoot}>
        {loading && <ActivityIndicator style={{ marginTop: normalize(20) }} />}
        {!loading && !!error && <Text style={{ color: '#E74C3C', textAlign: 'center', marginTop: normalize(12) }}>{error}</Text>}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.detailScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.detailLetterCard, { minHeight: halfCardHeight, marginRight: normalize(24) }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: normalize(4) }}>
              <MaterialCommunityIcons name="email-arrow-left-outline" size={13} color={colors.textSecondary} />
              <Text style={{ fontSize: normalize(11), color: colors.textSecondary, marginLeft: 4 }}>받은 편지</Text>
            </View>
            <View style={styles.detailSenderRow}>
              <View
                style={[
                  styles.detailAvatar,
                  { backgroundColor: getProfileColorById(mail?.senderColorId) },
                ]}
              />
              <View style={styles.detailSenderTexts}>
                <Text style={styles.detailSenderName}>익명</Text>
                <Text style={styles.detailTime}>{mail?.receivedAt}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailBody}>{mail?.content}</Text>
            </View>
          </View>

          <View style={{ alignItems: 'center', marginVertical: normalize(8) }}>
            <MaterialCommunityIcons name="arrow-down" size={18} color={colors.textSecondary} />
          </View>

          <View
            style={[
              styles.detailLetterCard,
              {
                minHeight: halfCardHeight,
                marginLeft: normalize(24),
                backgroundColor: hasReply ? colors.background : colors.surface,
                borderWidth: hasReply ? 0 : 1,
                borderStyle: hasReply ? 'solid' : 'dashed',
                borderColor: hasReply ? 'transparent' : colors.border,
              },
            ]}
          >
            {hasReply ? (
              <>
                <View style={{ alignSelf: 'flex-end', backgroundColor: colors.primary, borderRadius: 4, paddingHorizontal: normalize(6), paddingVertical: normalize(2), marginBottom: normalize(6) }}>
                  <Text style={{ color: '#fff', fontSize: normalize(10) }}>✓ 답장 완료</Text>
                </View>
                <View style={styles.detailSenderRow}>
                  <View
                    style={[
                      styles.detailAvatar,
                      { backgroundColor: getProfileColorById(mail?.recipientColorId) },
                    ]}
                  />
                  <View style={styles.detailSenderTexts}>
                    <Text style={styles.detailSenderName}>{myName || '나'}</Text>
                    <Text style={styles.detailTime}>{formatListTime(latestMyReply.created_at)}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailBody}>{latestMyReply.content || ''}</Text>
                </View>
              </>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name="email-outline" size={32} color={colors.textSecondary} />
                <Text style={[styles.detailBody, { color: colors.textSecondary, marginTop: normalize(8) }]}>아직 답장하지 않았어요</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View
          style={styles.bottomCtaWrapper}
          onLayout={(e) => setBottomCtaHeight(e.nativeEvent.layout.height)}
        >
          <TouchableOpacity
            style={[
              styles.bottomCtaButton,
              hasReply && { backgroundColor: colors.textSecondary || '#999' },
            ]}
            onPress={() =>
              navigation.navigate('AnonymousMailReply', {
                mail: { id: initialMail?.id, content: mail?.content, receivedAt: mail?.receivedAt },
                onSent: () => fetchDetail(),
              })
            }
            disabled={hasReply}
            activeOpacity={hasReply ? 1 : 0.9}
          >
            <Text style={styles.bottomCtaText}>{hasReply ? '답장 완료' : '답장하기'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function AnonymousMailScreen({ navigation, route }) {
  const detailMail = route.params?.mail;

  if (detailMail) {
    return (
      <MailDetail
        mail={detailMail?.raw || detailMail}
        onBack={() => navigation.goBack()}
        navigation={navigation}
      />
    );
  }

  return (
    <MailInbox
      navigation={navigation}
      onBack={() => navigation.goBack()}
      onOpen={(mail) => navigation.navigate('MailDetail', { mail })}
    />
  );
}

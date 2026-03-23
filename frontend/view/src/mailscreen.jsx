import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Octicons from '@expo/vector-icons/Octicons';
import SubHeader from '../frame/subHeader';
import { colors } from '../../styles/colors';
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

function mapMailToListItem(mail, isReceived) {
  return {
    id: mail.id,
    raw: mail,
    isReceived,
    counterpartyUserId: isReceived ? mail.sender_id : mail.recipient_id,
    preview: String(mail.content || '').slice(0, 40),
    receivedAt: formatListTime(mail.created_at),
    isUnread: isReceived ? !mail.is_read : false,
  };
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
      const mails = res.data?.data?.mails || [];
      const mapped = mails.map((mail) => mapMailToListItem(mail, isReceived));
      const totalPages = Number(res.data?.data?.pagination?.totalPages || 1);

      setItems((prev) => (append ? [...prev, ...mapped] : mapped));
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
            key={mail.id}
            style={[styles.mailCard, mail.isUnread && styles.mailCardUnread]}
            onPress={() => onOpen(mail)}
            activeOpacity={0.8}
          >
            <View style={styles.mailCardHeader}>
              <Text style={styles.anonLabel}>익명</Text>
              <Text style={styles.dotSep}>•</Text>
              <Text style={styles.mailTime}>{mail.receivedAt}</Text>
            </View>
            <Text style={styles.mailPreview} numberOfLines={1}>{mail.preview}</Text>
            <View style={styles.cardDivider} />
            <View style={styles.mailCardFooter}>
              <View style={styles.replyStatus}>
                <Text style={styles.replyStatusPendingText}>{mail.isReceived ? '받은 우편' : '보낸 우편'}</Text>
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
      const res = await api.get(`/api/mails/personal/${initialMail.id}`);
      const m = res.data?.data;
      setMail({
        id: m.id,
        receivedAt: formatListTime(m.created_at),
        content: m.content || '',
        isReceived: initialMail?.isReceived ?? true,
        senderName: m.sender_name || '익명',
        counterpartyUserId:
          (initialMail?.isReceived ?? true) ? m.sender_id : m.recipient_id,
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

  const handleDelete = async () => {
    try {
      await api.delete(`/api/mails/personal/${initialMail.id}`);
      Alert.alert('완료', '우편이 삭제되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('오류', e.response?.data?.message || '우편 삭제에 실패했습니다.');
    }
  };

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
          <View style={[styles.detailLetterCard, { minHeight: halfCardHeight }]}>
            <View style={styles.detailSenderRow}>
              <View
                style={[
                  styles.detailAvatar,
                  mail?.isReceived === false ? styles.detailAvatarMe : styles.detailAvatarOther,
                ]}
              />
              <View style={styles.detailSenderTexts}>
                <Text style={styles.detailSenderName}>
                  {mail?.isReceived === false ? (mail?.senderName || '상대') : '익명'}
                </Text>
                <Text style={styles.detailTime}>{mail?.receivedAt}</Text>
              </View>
              <View style={styles.typeChip}>
                <Text style={styles.typeChipText}>
                  {mail?.isReceived === false ? '보낸 우편' : '받은 우편'}
                </Text>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.detailBody}>{mail?.content}</Text>
            </ScrollView>
          </View>
        </ScrollView>

        <View
          style={styles.bottomCtaWrapper}
          onLayout={(e) => setBottomCtaHeight(e.nativeEvent.layout.height)}
        >
          <View style={{ flexDirection: 'row', gap: normalize(8) }}>
            <TouchableOpacity
              style={[styles.bottomCtaButton, { flex: 1, backgroundColor: '#666' }]}
              onPress={handleDelete}
              activeOpacity={0.9}
            >
              <Text style={styles.bottomCtaText}>삭제</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bottomCtaButton, { flex: 1 }]}
              onPress={() =>
                navigation.navigate('AnonymousMailReply', {
                  mail: { id: initialMail?.id, content: mail?.content, receivedAt: mail?.receivedAt },
                  onSent: () => fetchDetail(),
                })
              }
              activeOpacity={0.9}
            >
              <Text style={styles.bottomCtaText}>답장하기</Text>
            </TouchableOpacity>
          </View>
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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, useWindowDimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
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

function formatHistoryTime(createdAt) {
  const d = parseUtcToLocal(createdAt);
  if (!d) return '';
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yy}/${mm}/${dd} ${hh}:${mi}`;
}

export default function MailHistoryScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMailStyles(normalize), [normalize]);

  const threadId = Number(route?.params?.threadId);
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const [receivedRes, sentRes] = await Promise.all([
        api.get('/api/mails/personal/received', { params: { page: 1, limit: 100 } }),
        api.get('/api/mails/personal/sent', { params: { page: 1, limit: 100 } }),
      ]);

      const received = receivedRes.data?.data?.mails || [];
      const sent = sentRes.data?.data?.mails || [];

      const merged = [
        ...received.map((m) => ({
          id: `r-${m.id}`,
          rawId: m.id,
          direction: 'other',
          label: '받은 우편',
          createdAt: m.created_at,
          time: formatHistoryTime(m.created_at),
          text: m.content || '',
        })),
        ...sent.map((m) => ({
          id: `s-${m.id}`,
          rawId: m.id,
          direction: 'me',
          label: '보낸 우편',
          createdAt: m.created_at,
          time: formatHistoryTime(m.created_at),
          text: m.content || '',
        })),
      ]
        .filter((item) => (!Number.isInteger(threadId) ? true : item.rawId === threadId))
        .sort((a, b) => {
          const ad = parseUtcToLocal(a.createdAt);
          const bd = parseUtcToLocal(b.createdAt);
          if (!ad || !bd) return 0;
          return bd - ad;
        });

      setHistoryItems(merged);
    } catch (e) {
      setError(e.response?.data?.message || '히스토리를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [threadId]);

  useEffect(() => {
    fetchHistory(false);
  }, [fetchHistory]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SubHeader title="히스토리" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.historyScroll}
        contentContainerStyle={styles.historyContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchHistory(true)} />
        }
      >
        {loading && (
          <View style={{ paddingVertical: normalize(24), alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        )}
        {!loading && !!error && (
          <View style={{ paddingVertical: normalize(24), alignItems: 'center' }}>
            <Text style={{ color: '#E74C3C' }}>{error}</Text>
          </View>
        )}
        {!loading && !error && historyItems.length === 0 && (
          <View style={{ paddingVertical: normalize(24), alignItems: 'center' }}>
            <Text>히스토리가 없습니다.</Text>
          </View>
        )}
        {historyItems.map((item) => {
          const isMe = item.direction === 'me';
          return (
            <View key={item.id} style={styles.historyRow}>
              <View style={styles.historyCard}>
                <View style={styles.detailSenderRow}>
                  <View
                    style={[
                      styles.detailAvatar,
                      isMe ? styles.detailAvatarMe : styles.detailAvatarOther,
                    ]}
                  />
                  <View style={styles.detailSenderTexts}>
                    <Text style={styles.detailSenderName}>익명</Text>
                    <Text style={styles.detailTime}>{item.time}</Text>
                  </View>
                </View>
                <Text style={styles.historyCardBody}>{item.text}</Text>
              </View>
            </View>
          );
        })}

      </ScrollView>
    </SafeAreaView>
  );
}


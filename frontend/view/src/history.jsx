import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, useWindowDimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';
import { api } from '../../utils/api';
import { colors, PROFILE_COLORS } from '../../styles/colors';

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

function formatRelativeTime(createdAt) {
  const d = parseUtcToLocal(createdAt);
  if (!d) return '';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}일 전`;
}

function extractMailListFromResponse(res) {
  const payload = res?.data;
  const data = payload?.data;
  if (Array.isArray(data?.mails)) return data.mails;
  if (Array.isArray(data)) return data;
  if (Array.isArray(payload?.mails)) return payload.mails;
  return [];
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

      console.log('[History] received 응답 원본:', JSON.stringify(receivedRes.data));
      console.log('[History] sent 응답 원본:', JSON.stringify(sentRes.data));
      const received = extractMailListFromResponse(receivedRes);
      const sent = extractMailListFromResponse(sentRes);
      console.log('[History] list 파싱 결과:', {
        receivedCount: received.length,
        sentCount: sent.length,
        receivedHasDataMails: Array.isArray(receivedRes.data?.data?.mails),
        sentHasDataMails: Array.isArray(sentRes.data?.data?.mails),
      });

      const merged = [
        ...received.map((m) => ({
          id: `r-${m.id}`,
          rawId: m.id,
          threadKey: Number(m.thread_key ?? m.root_mail_id ?? m.id),
          direction: 'other',
          displayName: '익명',
          badgeText: '',
          colorId: Number(m.sender_color_id ?? 1),
          createdAt: m.created_at,
          relativeTime: formatRelativeTime(m.created_at),
          time: formatHistoryTime(m.created_at),
          text: m.content || '',
          raw: m,
        })),
        ...sent.map((m) => ({
          id: `s-${m.id}`,
          rawId: m.id,
          threadKey: Number(m.thread_key ?? m.root_mail_id ?? m.id),
          direction: 'me',
          displayName: m.recipient_name || '익명',
          badgeText: '보냄',
          colorId: Number(m.recipient_color_id ?? 1),
          createdAt: m.created_at,
          relativeTime: formatRelativeTime(m.created_at),
          time: formatHistoryTime(m.created_at),
          text: m.content || '',
          raw: m,
        })),
      ]
        .filter((item) => (!Number.isInteger(threadId) ? true : item.threadKey === threadId || item.rawId === threadId))
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
          const profileColor = PROFILE_COLORS[String(item.colorId)] || colors.primary;
          const firstChar = String(item.displayName || '익').charAt(0);
          return (
            <View
              key={item.id}
              style={styles.historyRow}
            >
              <View style={styles.historyCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: normalize(42),
                      height: normalize(42),
                      borderRadius: normalize(21),
                      backgroundColor: profileColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: normalize(10),
                    }}
                  >
                    <Text style={{ fontSize: normalize(14), color: '#fff' }}>{firstChar}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: normalize(14), fontWeight: '600', color: colors.textPrimary }}>
                        {item.displayName}
                      </Text>
                      {!!item.badgeText && (
                        <Text style={{ marginLeft: normalize(6), fontSize: normalize(10), color: colors.textSecondary }}>
                          {item.badgeText}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={{ marginTop: normalize(3), fontSize: normalize(13), color: colors.textSecondary }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.text}
                    </Text>
                  </View>
                  <Text style={{ marginLeft: normalize(8), alignSelf: 'flex-start', fontSize: normalize(11), color: colors.textSecondary }}>
                    {item.relativeTime}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

      </ScrollView>
    </SafeAreaView>
  );
}


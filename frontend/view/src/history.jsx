import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, useWindowDimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import { getNormalize } from '../../styles/frame.style';
import { createMailStyles } from '../../styles/mail.style';
import { api } from '../../utils/api';
import { colors } from '../../styles/colors';
import Loading from '../../components/Loading';
import { senderDisplayNameForCurrentUser } from './mailscreen';

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

      const [receivedRes, sentRes, meRes] = await Promise.all([
        api.get('/api/mails/personal/received', { params: { page: 1, limit: 100 } }),
        api.get('/api/mails/personal/sent', { params: { page: 1, limit: 100 } }),
        api.get('/api/auth/me'),
      ]);

      const received = extractMailListFromResponse(receivedRes);
      const sent = extractMailListFromResponse(sentRes);
      const me = meRes?.data?.data;
      const meId = Number(me?.id != null ? me.id : me?.userId);
      const myDisplayName = me?.name || me?.username || '';

      const merged = [
        ...received.map((m) => ({
          id: `r-${m.id}`,
          rawId: m.id,
          threadKey: Number(m.thread_key ?? m.root_mail_id ?? m.id),
          direction: 'other',
          displayName:
            senderDisplayNameForCurrentUser({
              senderId: m.sender_id,
              senderNameFromApi: m.sender_name,
              currentUserId: meId,
              myDisplayName,
            }) ?? '익명',
          createdAt: m.created_at,
          time: formatHistoryTime(m.created_at),
          text: m.content || '',
          raw: m,
        })),
        ...sent.map((m) => ({
          id: `s-${m.id}`,
          rawId: m.id,
          threadKey: Number(m.thread_key ?? m.root_mail_id ?? m.id),
          direction: 'me',
          displayName:
            senderDisplayNameForCurrentUser({
              senderId: m.sender_id,
              senderNameFromApi: m.sender_name,
              currentUserId: meId,
              myDisplayName,
            }) ?? (myDisplayName || '나'),
          createdAt: m.created_at,
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
      <SubHeader title="우편 내역" onBack={() => navigation.goBack()} />

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
            <Loading />
          </View>
        )}
        {!loading && !!error && (
          <View style={{ paddingVertical: normalize(24), alignItems: 'center' }}>
            <Text style={{ color: colors.textPrimary }}>{error}</Text>
          </View>
        )}
        {!loading && !error && historyItems.length === 0 && (
          <View style={{ paddingVertical: normalize(24), alignItems: 'center' }}>
            <Text>히스토리가 없습니다.</Text>
          </View>
        )}
        {historyItems.map((item) => {
          const r = normalize(12);
          const accentW = normalize(6);
          const isOther = item.direction === 'other';
          return (
            <View key={item.id} style={styles.historyRow}>
              <View style={styles.historyCard}>
                <View
                  style={[
                    styles.historyCardInner,
                    {
                      flexDirection: 'row',
                      alignItems: 'stretch',
                      paddingHorizontal: 0,
                      paddingVertical: normalize(12),
                    },
                  ]}
                >
                {isOther ? (
                  <View
                    style={{
                      width: accentW,
                      backgroundColor: colors.primary,
                      borderTopLeftRadius: r,
                      borderBottomLeftRadius: r,
                    }}
                  />
                ) : null}
                <View
                  style={[
                    styles.historyCardMain,
                    {
                      flex: 1,
                      minWidth: 0,
                      paddingLeft: normalize(14),
                      paddingRight: normalize(14),
                    },
                  ]}
                >
                  <View style={styles.historyNameDateRow}>
                    <Text style={styles.detailSenderName}>{item.displayName}</Text>
                    <Text style={styles.dotSep}> · </Text>
                    <Text style={styles.detailTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.detailBody}>{item.text}</Text>
                </View>
                {isOther ? null : (
                  <View
                    style={{
                      width: accentW,
                      backgroundColor: colors.textSecondary,
                      borderTopRightRadius: r,
                      borderBottomRightRadius: r,
                    }}
                  />
                )}
                </View>
              </View>
            </View>
          );
        })}

      </ScrollView>
    </SafeAreaView>
  );
}


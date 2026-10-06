import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import SubHeader from '../frame/subHeader';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/mypage.style';
import { createNotificationStyles } from '../../styles/notification.style';
import { api } from '../../utils/api';

const NEW_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function isRecentAnnouncement(iso, now = Date.now()) {
  const published = new Date(iso).getTime();
  if (!Number.isFinite(published)) return false;
  const age = now - published;
  return age >= 0 && age <= NEW_WINDOW_MS;
}

function formatAnnouncementDate(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return String(iso).slice(0, 10);
  }
}

const Announcement = ({ navigation }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createNotificationStyles(normalize, width),
    [normalize, width],
  );
  const isEmpty = !loading && announcements.length === 0;

  const fetchList = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/api/announcements');
      const items = Array.isArray(res.data?.data?.items)
        ? res.data.data.items
        : [];
      setAnnouncements(items);
    } catch (e) {
      console.warn('[Announcement] list failed:', e?.message || e);
      if (!silent) setAnnouncements([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchList();
    }, [fetchList]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchList({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [fetchList]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title="공지사항" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.announcementListContainer,
          (isEmpty || loading) && styles.announcementEmptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : isEmpty ? (
          <Text style={styles.announcementEmptyText}>
            아직 공지사항이 없습니다
          </Text>
        ) : (
          announcements.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.announcementItem}
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate('AnnouncementDetail', {
                  announcementId: item.id,
                  title: item.title,
                  publishedAt: item.publishedAt,
                })
              }
            >
              <View style={styles.announcementContent}>
                <Text style={styles.announcementMeta}>
                  {formatAnnouncementDate(item.publishedAt)}
                </Text>
                <Text style={styles.announcementTitle}>{item.title}</Text>
              </View>
              <View style={styles.announcementTrailing}>
                {isRecentAnnouncement(item.publishedAt) ? (
                  <View style={styles.announcementNewBadge}>
                    <Text style={styles.announcementNewText}>NEW</Text>
                  </View>
                ) : null}
                <Ionicons
                  name="chevron-forward"
                  size={normalize(20)}
                  color={colors.textLight4}
                />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Announcement;

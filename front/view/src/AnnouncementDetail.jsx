import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import PolicyMarkdownBody from '../../src/screens/Terms-of-Service/PolicyMarkdownBody';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/mypage.style';
import { createServiceStyles } from '../../styles/service.style';
import { api } from '../../utils/api';

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

const AnnouncementDetail = ({ navigation, route }) => {
  const announcementId = route?.params?.announcementId;
  const initialTitle = route?.params?.title || '공지사항';
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createServiceStyles(normalize), [normalize]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!announcementId) {
        setError('공지를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/announcements/${announcementId}`);
        const data = res.data?.data;
        if (!cancelled) {
          if (!data) {
            setError('공지를 찾을 수 없습니다.');
            setItem(null);
          } else {
            setItem(data);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e?.response?.data?.message ||
              '공지사항을 불러오지 못했습니다.',
          );
          setItem(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [announcementId]);

  const title = item?.title || initialTitle;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader title={title} onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : error ? (
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
            {error}
          </Text>
        ) : (
          <View>
            {item?.publishedAt ? (
              <Text
                style={{
                  color: colors.textSecondary,
                  marginBottom: normalize(16),
                  fontSize: normalize(13),
                }}
              >
                {formatAnnouncementDate(item.publishedAt)}
              </Text>
            ) : null}
            <PolicyMarkdownBody
              markdown={item?.content || ''}
              styles={styles}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AnnouncementDetail;

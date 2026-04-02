import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import SubHeader from '../frame/subHeader';
import { colors, fonts } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createSchoolMailStyles } from '../../styles/SchoolMail.style';
import Loading from '../../components/Loading';
import { api } from '../../utils/api';
import { getSchoolMailFromLabel } from './utils/schoolMailFromLabel';

function formatTimeAgo(createdAt) {
  if (!createdAt) return '';
  let dateStr = typeof createdAt === 'string' ? createdAt.trim() : String(createdAt);
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dateStr) && !/[Z+-]/.test(dateStr)) {
    dateStr = dateStr.replace(' ', 'T') + 'Z';
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return String(createdAt);
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

function isMailNew(createdAt) {
  if (!createdAt) return false;
  let dateStr = typeof createdAt === 'string' ? createdAt.trim() : String(createdAt);
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dateStr) && !/[Z+-]/.test(dateStr)) {
    dateStr = dateStr.replace(' ', 'T') + 'Z';
  }
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < 24 * 60 * 60 * 1000;
}

function mapMailForCard(raw, mailboxSchoolId) {
  const content = raw.content ?? '';
  return {
    ...raw,
    preview: content.slice(0, 50),
    fromLabel: getSchoolMailFromLabel(raw, mailboxSchoolId),
    time: formatTimeAgo(raw.created_at) || String(raw.created_at ?? ''),
    likes: raw.like_count ?? 0,
    comments: raw.comment_count ?? 0,
  };
}

const SchoolMailboxScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createSchoolMailStyles(width, normalize), [width, normalize]);

  const schoolName = route?.params?.schoolName ?? 'OO고등학교';
  const schoolId = route?.params?.schoolId ?? null;

  const [mails, setMails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchMails = useCallback(
    async (nextPage = 1, append = false) => {
      if (!schoolId) {
        setMails([]);
        setLoading(false);
        setHasMore(false);
        return;
      }
      try {
        if (nextPage === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        const res = await api.get('/api/mails/school', {
          params: { schoolId, page: nextPage, limit: 20 },
        });
        const data = res.data?.data;
        const list = Array.isArray(data?.mails) ? data.mails : [];
        const pag = data?.pagination;
        const totalPages = pag?.totalPages ?? 1;
        if (append && list.length === 0) {
          setHasMore(false);
          return;
        }
        if (append) {
          setMails((prev) => [...prev, ...list]);
        } else {
          setMails(list);
        }
        setPage(nextPage);
        setHasMore(nextPage < totalPages && list.length > 0);
      } catch (e) {
        console.error('학교 우편 목록 로드 실패:', e?.response?.data || e.message);
        if (!append) setMails([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [schoolId],
  );

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      setMails([]);
      setHasMore(false);
      return;
    }
    fetchMails(1, false);
  }, [schoolId, fetchMails]);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore || !schoolId) return;
    fetchMails(page + 1, true);
  }, [loading, loadingMore, hasMore, schoolId, page, fetchMails]);

  const renderItem = ({ item: raw }) => {
    const mail = mapMailForCard(raw, schoolId);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() =>
          navigation?.navigate('SchoolMailDetail', {
            mailId: raw.id,
            schoolName,
            schoolId,
          })
        }
      >
        <View style={styles.cardTopRow}>
          <View style={styles.cardMetaRow}>
            <Text style={styles.cardFromLabel} numberOfLines={1}>
              {mail.fromLabel}
            </Text>
            <Text style={styles.cardMetaDot}>•</Text>
            <Text style={styles.cardTime} numberOfLines={1}>
              {mail.time}
            </Text>
          </View>
          {isMailNew(raw.created_at) && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>

        <Text style={styles.cardPreview} numberOfLines={2}>
          {mail.preview}
        </Text>

        <View style={styles.cardFooterRow}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <FontAwesome name="heart-o" size={normalize(14)} color={colors.alert} />
              <Text style={styles.statText}>{mail.likes}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={normalize(15)} color={colors.primary} />
              <Text style={styles.statText}>{mail.comments}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const listEmpty =
    !loading && (!schoolId || mails.length === 0) ? (
      <View style={{ paddingVertical: normalize(40), alignItems: 'center', width: '100%' }}>
        <Text style={{ fontFamily: fonts.regular, color: colors.textSecondary }}>
          {!schoolId ? '학교 정보가 없습니다.' : '아직 우편이 없습니다'}
        </Text>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SubHeader title="학교 우편함" onBack={() => navigation?.goBack()} />

      <View style={styles.container}>
        {loading && mails.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Loading size="large" />
          </View>
        ) : (
          <FlatList
            style={styles.list}
            contentContainerStyle={[styles.gridContainer, mails.length === 0 && { flexGrow: 1 }]}
            data={mails}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            renderItem={renderItem}
            ListEmptyComponent={listEmpty}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ paddingVertical: normalize(16), width: '100%', alignItems: 'center' }}>
                  <Loading color={colors.textSecondary} />
                </View>
              ) : null
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        <TouchableOpacity
          style={styles.floatingButton}
          activeOpacity={0.8}
          onPress={() =>
            navigation?.navigate('SendSchoolMail', {
              schoolName,
              schoolId,
            })
          }
        >
          <Feather
            name="send"
            size={normalize(30)}
            top={normalize(2)}
            right={normalize(1)}
            color={colors.background}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SchoolMailboxScreen;

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Entypo } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';
import { colors, fonts } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createSchoolMailStyles } from '../../styles/SchoolMail.style';
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

  const [floatingMenuVisible, setFloatingMenuVisible] = useState(false);
  const [floatingMenuAnchor, setFloatingMenuAnchor] = useState(null);
  const [floatingMenuMail, setFloatingMenuMail] = useState(null);
  const menuButtonRefs = useRef({});

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

  const defaultMenuItems = useMemo(
    () => [
      { label: '신고하기', iconName: 'flag-outline', onPress: () => {} },
      { label: '차단하기', iconName: 'remove-circle-outline', onPress: () => {} },
      { label: '공유하기', iconName: 'share-outline', onPress: () => {} },
    ],
    [],
  );

  const openFloatingMenu = (mail, ref) => {
    ref?.measureInWindow((x, y) => {
      setFloatingMenuAnchor({ x, y });
      setFloatingMenuMail(mail);
      setFloatingMenuVisible(true);
    });
  };

  const closeFloatingMenu = () => {
    setFloatingMenuVisible(false);
    setFloatingMenuAnchor(null);
    setFloatingMenuMail(null);
  };

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
          <View style={styles.cardIconWrap}>
            <Ionicons
              name="mail-outline"
              size={normalize(22)}
              color={colors.primary}
              style={styles.cardEnvelope}
            />
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
        <Text
          style={{
            fontSize: normalize(12),
            fontFamily: fonts.regular,
            color: colors.textSecondary,
            marginBottom: normalize(6),
          }}
          numberOfLines={1}
        >
          {mail.fromLabel}
        </Text>

        <View style={styles.cardFooterRow}>
          <Text style={styles.cardTime}>{mail.time}</Text>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <FontAwesome name="heart-o" size={normalize(14)} color={colors.alert} />
              <Text style={styles.statText}>{mail.likes}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={normalize(15)} color={colors.primary} />
              <Text style={styles.statText}>{mail.comments}</Text>
            </View>
            <View
              ref={(r) => {
                if (r) menuButtonRefs.current[raw.id] = r;
              }}
              collapsable={false}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  openFloatingMenu(mail, menuButtonRefs.current[raw.id]);
                }}
                hitSlop={{
                  top: normalize(8),
                  bottom: normalize(8),
                  left: normalize(8),
                  right: normalize(8),
                }}
              >
                <Entypo name="dots-three-vertical" size={normalize(14)} color={colors.textSecondary} />
              </TouchableOpacity>
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
            <ActivityIndicator size="large" color={colors.primary} />
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
                  <ActivityIndicator color={colors.textSecondary} />
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
          <Feather name="send" size={normalize(30)} color={colors.background} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={floatingMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeFloatingMenu}
      >
        <TouchableWithoutFeedback onPress={closeFloatingMenu}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.3)',
              ...(floatingMenuAnchor ? {} : { justifyContent: 'center', alignItems: 'center' }),
            }}
          >
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: colors.background,
                  borderRadius: normalize(12),
                  minWidth: width * 0.45,
                  maxWidth: width * 0.7,
                  paddingVertical: normalize(4),
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 5,
                  elevation: 5,
                  ...(floatingMenuAnchor
                    ? {
                        position: 'absolute',
                        right: width - floatingMenuAnchor.x,
                        top: floatingMenuAnchor.y,
                      }
                    : {}),
                }}
              >
                {defaultMenuItems.map((item, index) => (
                  <React.Fragment key={index}>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: normalize(10),
                        paddingHorizontal: normalize(14),
                      }}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (item.onPress) item.onPress(floatingMenuMail);
                        closeFloatingMenu();
                      }}
                    >
                      <Text
                        style={{
                          fontSize: normalize(13),
                          fontFamily: fonts.regular,
                          color: colors.textPrimary,
                        }}
                      >
                        {item.label}
                      </Text>
                      <Ionicons name={item.iconName} size={normalize(17)} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {index < defaultMenuItems.length - 1 && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: colors.textLight10,
                          marginHorizontal: normalize(8),
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default SchoolMailboxScreen;

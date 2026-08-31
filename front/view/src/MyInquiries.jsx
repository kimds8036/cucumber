import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import SubHeader from '../frame/subHeader';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { shadow } from '../../styles/tokens';
import { api } from '../../utils/api';

function statusMeta(status) {
  if (status === 'answered') {
    return {
      label: '답변 완료',
      color: colors.primary,
      backgroundColor: colors.primaryLight10,
    };
  }
  if (status === 'closed') {
    return {
      label: '종료',
      color: colors.textSecondary,
      backgroundColor: 'rgba(39, 42, 38, 0.05)',
    };
  }
  return {
    label: '확인 중',
    color: colors.alert,
    backgroundColor: 'rgba(255, 159, 159, 0.1)',
  };
}

function formatDate(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/**
 * 내 문의 목록
 * @param {{ navigation: any, fullScreenOverlay?: boolean, onOpenCompose?: () => void, onOpenDetail?: (id: number) => void }} props
 */
const MyInquiries = ({
  navigation,
  fullScreenOverlay = false,
  onOpenCompose,
  onOpenDetail,
}) => {
  const { width } = useWindowDimensions();
  const normalize = useCallback(
    (size) => Math.round((width / 375) * size),
    [width],
  );
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/api/inquiries/my', {
        params: { page: 1, limit: 50 },
      });
      setItems(res.data?.data?.inquiries || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openCompose = () => {
    if (typeof onOpenCompose === 'function') {
      onOpenCompose();
      return;
    }
    navigation?.navigate?.('InAppInquiry');
  };

  const openDetail = (id) => {
    if (typeof onOpenDetail === 'function') {
      onOpenDetail(id);
      return;
    }
    navigation?.navigate?.('InquiryDetail', { inquiryId: id });
  };

  const styles = useMemo(
    () => ({
      container: { flex: 1, backgroundColor: colors.background },
      emptyWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: normalize(24),
        paddingBottom: normalize(40),
      },
      emptyText: {
        fontFamily: fonts.regular,
        fontSize: normalize(fontSizes.md),
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: normalize(22),
      },
      row: {
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(14),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(12),
      },
      rowBody: { flex: 1 },
      rowIcon: {
        alignSelf: 'center',
      },
      rowIconBox: {
        width: normalize(40),
        height: normalize(40),
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: normalize(20),
      },
      rowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(8),
        marginBottom: normalize(6),
      },
      badge: {
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(2),
        borderRadius: normalize(999),
      },
      badgeText: {
        fontFamily: fonts.bold,
        fontSize: normalize(10),
      },
      dateText: {
        fontFamily: fonts.regular,
        fontSize: normalize(12),
        color: colors.textSecondary,
      },
      preview: {
        fontFamily: fonts.regular,
        fontSize: normalize(fontSizes.lg),
        color: colors.textPrimary,
        marginLeft: normalize(2),
      },
      unreadDot: {
        width: normalize(8),
        height: normalize(8),
        borderRadius: normalize(4),
        backgroundColor: colors.primary,
      },
      floatingButton: {
        position: 'absolute',
        right: normalize(20),
        bottom: normalize(20),
        width: normalize(50),
        height: normalize(50),
        borderRadius: normalize(28),
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadow.lg,
        marginBottom: normalize(30),
        marginRight: normalize(10),
      },
    }),
    [normalize],
  );

  const Root = fullScreenOverlay ? View : SafeAreaView;

  const renderItem = ({ item }) => {
    const meta = statusMeta(item.status);
    const unread =
      (item.status === 'answered' || item.status === 'closed') &&
      !item.is_read_by_user;
    const preview = String(item.content || '')
      .replace(/\s+/g, ' ')
      .trim();
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => openDetail(item.id)}
      >
        <View style={[styles.rowIconBox, { backgroundColor: meta.backgroundColor }]}>
          <Ionicons
            name="chatbox-ellipses-outline"
            size={normalize(22)}
            color={meta.color}
            style={styles.rowIcon}
          />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <View style={[styles.badge, { backgroundColor: meta.backgroundColor }]}>
              <Text style={[styles.badgeText, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
            {unread ? <View style={styles.unreadDot} /> : null}
          </View>
          <Text style={styles.preview} numberOfLines={2}>
            {preview || '(내용 없음)'}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={normalize(18)}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <Root
      style={styles.container}
      {...(fullScreenOverlay ? {} : { edges: ['top'] })}
    >
      <SubHeader
        title="문의사항"
        onBack={() => navigation?.goBack?.()}
      />
      {loading ? (
        <View style={styles.emptyWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load({ silent: true });
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                아직 문의 내역이 없습니다.{'\n'}오른쪽 아래 ＋ 버튼으로
                남겨 주세요.
              </Text>
            </View>
          }
          contentContainerStyle={
            items.length === 0
              ? { flexGrow: 1, paddingBottom: normalize(80) }
              : { paddingBottom: normalize(80) }
          }
        />
      )}
      <TouchableOpacity
        style={styles.floatingButton}
        activeOpacity={0.8}
        onPress={openCompose}
      >
        <FontAwesome5
          name="plus"
          size={normalize(24)}
          color={colors.background}
        />
      </TouchableOpacity>
    </Root>
  );
};

export default MyInquiries;

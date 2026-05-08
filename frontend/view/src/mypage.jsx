import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../styles/colors';
import {
  createMyPageStyles,
  getNormalize,
} from '../../styles/mypage.style';
import ProfileCard from '../../components/Profilecard';
import TimetableView from '../../components/Timetableview';
import AppPopupModal from '../../components/common/AppPopupModal';
import { createTimetableViewStyles } from '../../src/screens/timetable/timetable.style';
import { api, clearUserSessionStorage } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const MyPage = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMyPageStyles(normalize), [normalize]);
  const timetableModalStyles = useMemo(
    () => createTimetableViewStyles(normalize),
    [normalize],
  );
  const { logout } = useAuth();
  const TIMETABLE_CACHE_KEY = '@mypage_timetable_cache_v1';
  const TIMETABLE_CACHE_KEY_PREFIX = '@mypage_timetable_cache_v1:';
  const TIMETABLE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const PROFILE_CACHE_KEY = '@mypage_profile_cache_v1';
  const PROFILE_CACHE_TTL_MS = 2 * 60 * 60 * 1000;
  const [userInfo, setUserInfo] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [colorSeed, setColorSeed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [showResetTimetableModal, setShowResetTimetableModal] = useState(false);
  const [timetableCacheKey, setTimetableCacheKey] = useState(TIMETABLE_CACHE_KEY);
  const isSameProfileInfo = (a, b) => {
    if (!a || !b) return false;
    return (
      a.name === b.name &&
      a.username === b.username &&
      a.colorId === b.colorId &&
      a.school === b.school &&
      a.gradeClass === b.gradeClass &&
      a.profileColorHex === b.profileColorHex &&
      a.profileColorId === b.profileColorId &&
      a.profileColorNumber === b.profileColorNumber &&
      a.friendCount === b.friendCount
    );
  };

  const handleLogout = async () => {
    try {
      // 서버 로그아웃은 실패해도 로컬 세션 정리는 진행
      await api.post('/api/auth/logout').catch(() => null);
      await clearUserSessionStorage();
    } catch (error) {
      console.error('로그아웃 처리 실패:', error);
    } finally {
      logout();
    }
  };

  const confirmLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => handleLogout() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 탈퇴',
      '정말 탈퇴하시겠습니까?\n모든 데이터가 삭제되며 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: () => Alert.alert('계정 탈퇴', '계정이 삭제되었습니다.'),
        },
      ]
    );
  };

  useEffect(() => {
    let mounted = true;
    const fetchMeAndTimetable = async () => {
      try {
        setLoading(true);
        let cachedTimetable = null;
        let cachedProfile = null;
        let cachedProfileTs = 0;
        try {
          const rawProfile = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
          if (rawProfile) {
            const parsed = JSON.parse(rawProfile);
            const profileTs = Number(parsed?.ts || 0);
            cachedProfileTs = profileTs;
            if (Date.now() - profileTs < PROFILE_CACHE_TTL_MS) {
              cachedProfile = parsed?.userInfo || null;
              if (mounted && cachedProfile) {
                setUserInfo(cachedProfile);
              }
            }
          }
        } catch (profileCacheErr) {
          console.warn('프로필 캐시 읽기 실패:', profileCacheErr);
        }

        const meRes = await api.get('/api/auth/me');
        // TEMP TEST: /api/auth/me 응답 raw 전체 확인 (확인 후 삭제)
        console.log('[TEMP][MyPage] /api/auth/me raw response =', JSON.stringify(meRes?.data));
        if (!mounted) return;

        const me = meRes.data?.data;
        const userScope =
          me?.id != null ? String(me.id) : me?.username || me?.email || null;
        const scopedTimetableCacheKey = userScope
          ? `${TIMETABLE_CACHE_KEY_PREFIX}${userScope}`
          : TIMETABLE_CACHE_KEY;
        if (mounted) {
          setTimetableCacheKey(scopedTimetableCacheKey);
        }

        try {
          const raw = await AsyncStorage.getItem(scopedTimetableCacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Date.now() - Number(parsed?.ts || 0) < TIMETABLE_CACHE_TTL_MS) {
              cachedTimetable = parsed?.timetable ?? null;
              if (mounted) {
                const normalized =
                  cachedTimetable && Object.keys(cachedTimetable).length > 0
                    ? cachedTimetable
                    : null;
                setTimetable(normalized);
              }
            } else {
              setTimetable(null);
            }
          } else {
            setTimetable(null);
          }
        } catch (cacheErr) {
          console.warn('시간표 캐시 읽기 실패:', cacheErr);
          setTimetable(null);
        }

        if (me) {
          const nextUserInfo = {
            name: me.name,
            username: me.username ? `@${me.username}` : '',
            colorId: me.colorId ?? null,
            school: me.school?.name || '',
            gradeClass:
              me.grade && me.classNumber
                ? `${me.grade}학년 ${me.classNumber}반`
                : '',
            profileColorHex: me.profileColor?.hexCode || null,
            profileColorId: me.profileColor?.id ?? me.colorId ?? null,
            profileColorNumber: me.profileColor?.colorNumber ?? null,
            friendCount: me.friendCount ?? 0,
          };
          setUserInfo(nextUserInfo);
          try {
            const cacheExpired =
              !cachedProfileTs || Date.now() - cachedProfileTs >= PROFILE_CACHE_TTL_MS;
            const profileChanged = !isSameProfileInfo(cachedProfile, nextUserInfo);
            if (cacheExpired || profileChanged || !cachedProfile) {
              await AsyncStorage.setItem(
                PROFILE_CACHE_KEY,
                JSON.stringify({
                  ts: Date.now(),
                  userInfo: nextUserInfo,
                }),
              );
            }
          } catch (profileSaveErr) {
            console.warn('프로필 캐시 저장 실패:', profileSaveErr);
          }
        } else if (!cachedProfile && mounted) {
          setUserInfo(null);
        }

        setTimetableLoading(false);
      } catch (error) {
        console.error('[MyPage] 데이터 로드 실패:', error?.response?.data || error?.message || error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchMeAndTimetable();
    return () => {
      mounted = false;
    };
  }, []);

  // 다른 화면(시간표 선택 등)에서 캐시를 갱신한 뒤 돌아올 때 표시 동기화
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(timetableCacheKey);
          if (!raw || cancelled) return;
          const parsed = JSON.parse(raw);
          if (Date.now() - Number(parsed?.ts || 0) >= TIMETABLE_CACHE_TTL_MS) return;
          const cached = parsed?.timetable ?? null;
          const normalized = cached && Object.keys(cached).length > 0 ? cached : null;
          if (cancelled) return;
          setTimetable(normalized);
        } catch (e) {
          console.warn('[MyPage] 포커스 시 시간표 캐시 동기화 실패:', e);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [timetableCacheKey]),
  );

  const handleNavigateToTimetableEdit = () => {
    navigation.navigate('TimetabelChoice', { timetableCacheKey });
  };

  const handleResetTimetable = () => {
    setShowResetTimetableModal(true);
  };

  const performResetTimetable = async () => {
    setTimetable(null);
    setColorSeed((prev) => prev + 1);
    setShowResetTimetableModal(false);
    try {
      await AsyncStorage.setItem(
        timetableCacheKey,
        JSON.stringify({
          ts: Date.now(),
          timetable: null,
          clearedByUser: true,
        }),
      );
    } catch (error) {
      console.error('시간표 삭제 저장 실패:', error);
    }
  };

  const MenuItem = ({
    icon,
    title,
    subtitle,
    onPress,
    hideChevron = false,
  }) => {
    return (
      <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.menuLeft}>
          <Ionicons
            name={icon}
            size={normalize(22)}
            color={colors.textPrimary}
            style={styles.menuIcon}
          />
          <View>
            <Text style={styles.menuTitle}>{title}</Text>
            {subtitle ? (
              <Text style={styles.menuSubtitle}>{subtitle}</Text>
            ) : null}
          </View>
        </View>
        {!hideChevron && (
          <Ionicons
            name="chevron-forward"
            size={normalize(20)}
            color={colors.textSecondary}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* ── 학생 정보 카드 ── */}
        {userInfo ? (
          <ProfileCard
            userInfo={userInfo}
            navigation={navigation}
            onNavigateToTimetableChoice={handleNavigateToTimetableEdit}
            timetableSection={
              timetableLoading ? (
                <View style={styles.ttSkeletonCard}>
                  <View style={styles.ttSkeletonHeader} />
                  {[...Array(7)].map((_, idx) => (
                    <View style={styles.ttSkeletonRow} key={`tt-sk-${idx}`}>
                      <View style={styles.ttSkeletonCellSmall} />
                      <View style={styles.ttSkeletonCell} />
                      <View style={styles.ttSkeletonCell} />
                      <View style={styles.ttSkeletonCell} />
                      <View style={styles.ttSkeletonCell} />
                      <View style={styles.ttSkeletonCell} />
                    </View>
                  ))}
                  <Text style={styles.ttSkeletonText}>시간표를 불러오는 중입니다...</Text>
                </View>
              ) : timetable ? (
                <TimetableView
                  timetable={timetable}
                  onNavigateToEdit={handleNavigateToTimetableEdit}
                  onResetPress={handleResetTimetable}
                  colorSeed={colorSeed}
                />
              ) : null
            }
          />
        ) : (
          <View style={styles.profileSkeletonCard}>
            <View style={styles.profileSkeletonHeader}>
              <View style={styles.profileSkeletonAvatar} />
              <View style={styles.profileSkeletonInfo}>
                <View style={styles.profileSkeletonName} />
                <View style={styles.profileSkeletonUsername} />
                <View style={styles.profileSkeletonSchool} />
              </View>
            </View>
            <View style={styles.profileSkeletonQuickRow}>
              <View style={styles.profileSkeletonQuickCell} />
              <View style={styles.profileSkeletonQuickCell} />
              <View style={styles.profileSkeletonQuickCell} />
            </View>
          </View>
        )}

        {/* ── 메뉴 ── */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="shield-checkmark-outline"
            title="클린 센터"
            subtitle="내 신고 처리 현황과 제한 내역을 확인해요"
            onPress={() => navigation.navigate('HiddenPostsAppeals')}
          />
          <MenuItem
            icon="notifications-outline"
            title="설정"
            onPress={() =>
              navigation.navigate('NotificationSettings', { variant: 'prefs' })
            }
          />
          <MenuItem
            icon="person-circle-outline"
            title="계정 관리"
            onPress={() =>
              navigation.navigate('NotificationSettings', { variant: 'profile' })
            }
          />
          <MenuItem
            icon="information-circle-outline"
            title="고객 지원"
            onPress={() =>
              navigation.navigate('Info')
            }
          />
          <MenuItem
            icon="log-out-outline"
            title="로그아웃"
            onPress={confirmLogout}
            hideChevron
          />
          <MenuItem
            icon="close-circle-outline"
            title="계정 탈퇴"
            onPress={handleDeleteAccount}
            hideChevron
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <AppPopupModal
        visible={showResetTimetableModal}
        onClose={() => setShowResetTimetableModal(false)}
        dismissOnBackdrop={false}
      >
        <Text
          style={{
            fontSize: 18,
            color: colors.textPrimary,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 10,
          }}
        >
          시간표 삭제
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 16,
          }}
        >
          시간표를 모두 지우고 초기화할까요?
        </Text>
        <View style={timetableModalStyles.timetableResetModalActions}>
          <TouchableOpacity
            style={[
              timetableModalStyles.timetableResetModalCancel,
              {
                height: 42,
                borderRadius: 10,
                backgroundColor: colors.textLight5,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
            onPress={() => setShowResetTimetableModal(false)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                timetableModalStyles.timetableResetModalCancelText,
                { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
              ]}
            >
              취소
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              timetableModalStyles.timetableResetModalDelete,
              {
                height: 42,
                borderRadius: 10,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
            onPress={performResetTimetable}
            activeOpacity={0.85}
          >
            <Text
              style={[
                timetableModalStyles.timetableResetModalDeleteText,
                { fontSize: 14, fontWeight: '700', color: colors.textWhite },
              ]}
            >
              삭제
            </Text>
          </TouchableOpacity>
        </View>
      </AppPopupModal>
    </View>
  );
};

export default MyPage;
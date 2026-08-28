import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../styles/colors';
import { createMyPageStyles, getNormalize } from '../../styles/mypage.style';
import ProfileCard from '../../components/Profilecard';
import TimetableView from '../../components/Timetableview';
import { api, clearUserSessionStorage } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { getDeviceId } from '../../utils/deviceId';
import { getFCMToken } from '../../utils/fcmService';
import { useFocusEffect } from '@react-navigation/native';
import { useGuidePreview } from '../../context/GuidePreviewContext';
import { GuideFocusTarget } from '../../components/guide/GuideFocusTarget';
import { GUIDE_FOCUS_TARGETS as T } from '../../src/screens/UserGuide/guideFocusTargets';
import {
  getGuideMyPageUserInfo,
  getGuideTimetable,
} from '../../src/screens/UserGuide/guidePreviewData';
import { syncTimetableWidgetFromFlat } from '../../utils/widget';
import { hydrateTimetableFromServer } from '../../utils/timetableSync';
import { hydratePeriodTimesFromServer } from '../../utils/widget/periodTimeSettings';
import { buildInviteShareContent } from '../../utils/shareLinks';

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
    a.friendCount === b.friendCount &&
    a.equippedBadge?.key === b.equippedBadge?.key &&
    a.postCount === b.postCount &&
    a.scrapCount === b.scrapCount
  );
};

const MyPage = ({ navigation }) => {
  const { isGuidePreview } = useGuidePreview();
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMyPageStyles(normalize), [normalize]);
  const { logout } = useAuth();
  const TIMETABLE_CACHE_KEY = '@mypage_timetable_cache_v1';
  const TIMETABLE_CACHE_KEY_PREFIX = '@mypage_timetable_cache_v1:';
  const TIMETABLE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const PROFILE_CACHE_KEY = '@mypage_profile_cache_v1';
  const PROFILE_CACHE_TTL_MS = 2 * 60 * 60 * 1000;
  const [userInfo, setUserInfo] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [colorSeed, setColorSeed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timetableLoading, setTimetableLoading] = useState(true);
  const [timetableCacheKey, setTimetableCacheKey] = useState(null);
  const [hasFirstPaint, setHasFirstPaint] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [ttReady, setTtReady] = useState(false);
  const timetableHydratedRef = useRef(false);

  useEffect(() => {
    timetableHydratedRef.current = false;
  }, [timetableCacheKey]);
  const handleLogout = async () => {
    try {
      const deviceId = await getDeviceId();
      const fcmToken = await getFCMToken().catch(() => null);
      await api
        .post('/api/auth/logout', {
          deviceId,
          token: fcmToken || undefined,
        })
        .catch(() => null);
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

  const handleInviteFriends = async () => {
    try {
      const res = await api.get('/api/invite/me');
      const landingUrl = res.data?.data?.landingUrl;
      if (!landingUrl) {
        Alert.alert('친구 초대', '초대 링크를 만들지 못했습니다.');
        return;
      }
      const share = buildInviteShareContent(landingUrl);
      await Share.share(
        Platform.OS === 'ios'
          ? { message: share.message, url: share.url }
          : { message: share.message, title: share.title },
      );
    } catch (e) {
      Alert.alert(
        '친구 초대',
        e.response?.data?.message || '초대 링크를 공유하지 못했습니다.',
      );
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 탈퇴',
      '정말 탈퇴하시겠습니까?\n\n개인정보는 삭제·익명 처리되며, 작성하신 게시글·댓글은 익명으로 남을 수 있습니다.\n탈퇴 후에는 같은 아이디로 로그인할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '계정 탈퇴 확인',
              '탈퇴를 진행하면 되돌릴 수 없습니다. 계속할까요?',
              [
                { text: '취소', style: 'cancel' },
                {
                  text: '탈퇴하기',
                  style: 'destructive',
                  onPress: () => {
                    void (async () => {
                      try {
                        await api.post('/api/auth/withdraw');
                        await clearUserSessionStorage();
                        Alert.alert(
                          '계정 탈퇴',
                          '탈퇴가 완료되었습니다.',
                          [{ text: '확인', onPress: () => logout() }],
                        );
                      } catch (error) {
                        console.error('회원 탈퇴 실패:', error);
                        Alert.alert(
                          '계정 탈퇴',
                          error?.response?.data?.message ||
                            '탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
                        );
                      }
                    })();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const fetchProfile = useCallback(async (opts = {}) => {
    const { silent = false } = opts;
    if (isGuidePreview) {
      setUserInfo(getGuideMyPageUserInfo());
      setTimetable(getGuideTimetable());
      setLoading(false);
      setTimetableLoading(false);
      setProfileReady(true);
      setTtReady(true);
      setHasFirstPaint(true);
      return;
    }
    try {
      if (!silent) setLoading(true);
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
          }
        }
      } catch (profileCacheErr) {
        console.warn('프로필 캐시 읽기 실패:', profileCacheErr);
      }

      const [meRes, statsRes] = await Promise.allSettled([
        api.get('/api/auth/me'),
        api.get('/api/users/me/stats'),
      ]);
      if (meRes.status !== 'fulfilled') {
        throw meRes.reason;
      }
      const me = meRes.value.data?.data;
      const stats =
        statsRes.status === 'fulfilled' ? statsRes.value.data?.data : null;
      const userScope =
        me?.id != null ? String(me.id) : me?.username || me?.email || null;
      const scopedTimetableCacheKey = userScope
        ? `${TIMETABLE_CACHE_KEY_PREFIX}${userScope}`
        : TIMETABLE_CACHE_KEY;
      setTimetableCacheKey(scopedTimetableCacheKey);

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
          friendCount: me.friendCount ?? stats?.friendCount ?? 0,
          equippedBadge: me.equippedBadge ?? null,
          postCount: Number(stats?.postCount ?? 0),
          scrapCount: Number(stats?.scrapCount ?? 0),
        };
        setUserInfo(nextUserInfo);
        try {
          const cacheExpired =
            !cachedProfileTs ||
            Date.now() - cachedProfileTs >= PROFILE_CACHE_TTL_MS;
          const profileChanged = !isSameProfileInfo(
            cachedProfile,
            nextUserInfo,
          );
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
      } else if (!cachedProfile) {
        setUserInfo(null);
      }
    } catch (error) {
      console.error(
        '[MyPage] 데이터 로드 실패:',
        error?.response?.data || error?.message || error,
      );
      setTimetableCacheKey(TIMETABLE_CACHE_KEY);
    } finally {
      if (!silent) setLoading(false);
      setProfileReady(true);
    }
  }, [isGuidePreview]);

  // 탭 복귀마다 프로필 재조회 (하단 탭은 unmount 되지 않음)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (cancelled) return;
        await fetchProfile({ silent: hasFirstPaint });
      })();
      return () => {
        cancelled = true;
      };
    }, [fetchProfile, hasFirstPaint]),
  );

  // 시간표 캐시만 읽음 — 첫 진입·시간표 편집 후 복귀 시 동기화
  useFocusEffect(
    useCallback(() => {
      if (isGuidePreview || !timetableCacheKey) return undefined;
      let cancelled = false;
      const showSkeleton = !timetableHydratedRef.current;

      (async () => {
        if (showSkeleton) setTimetableLoading(true);
        try {
          const scopeFromKey = timetableCacheKey.startsWith(
            TIMETABLE_CACHE_KEY_PREFIX,
          )
            ? timetableCacheKey.slice(TIMETABLE_CACHE_KEY_PREFIX.length)
            : null;
          await hydratePeriodTimesFromServer(scopeFromKey).catch(() => {});
          const hydrated = await hydrateTimetableFromServer(
            timetableCacheKey,
          ).catch(() => null);

          const raw = await AsyncStorage.getItem(timetableCacheKey);
          if (!raw || cancelled) {
            const fromServer =
              hydrated && Object.keys(hydrated).length > 0 ? hydrated : null;
            if (!cancelled) {
              setTimetable(fromServer);
              syncTimetableWidgetFromFlat(fromServer).catch(() => {});
            }
            return;
          }
          const parsed = JSON.parse(raw);
          const cached = parsed?.timetable ?? null;
          const normalized =
            cached && Object.keys(cached).length > 0 ? cached : null;
          const cacheExpired =
            Date.now() - Number(parsed?.ts || 0) >= TIMETABLE_CACHE_TTL_MS;
          const toShow =
            normalized ||
            (hydrated && Object.keys(hydrated).length > 0 ? hydrated : null);
          if (cacheExpired && !toShow) {
            if (!cancelled) setTimetable(null);
            return;
          }
          if (!cancelled) setTimetable(toShow);
          if (!cancelled) {
            const generatedAt =
              parsed?.serverUpdatedAt ||
              (parsed?.ts
                ? new Date(Number(parsed.ts)).toISOString()
                : undefined);
            syncTimetableWidgetFromFlat(toShow, { generatedAt }).catch(
              () => {},
            );
          }
        } catch (e) {
          console.warn('[MyPage] 시간표 캐시 읽기 실패:', e);
          if (!cancelled) setTimetable(null);
          if (!cancelled) {
            syncTimetableWidgetFromFlat(null).catch(() => {});
          }
        } finally {
          if (!cancelled) {
            timetableHydratedRef.current = true;
            setTtReady(true);
            if (showSkeleton) setTimetableLoading(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [timetableCacheKey, isGuidePreview]),
  );

  const handleNavigateToTimetableEdit = () => {
    navigation.navigate('TimetabelChoice', { timetableCacheKey });
  };

  const handleNavigateToTimetableCellEdit = useCallback(() => {
    navigation.navigate('EditTimetable', {
      existingTimetable:
        timetable != null && typeof timetable === 'object' ? timetable : {},
      timetableCacheKey,
      returnToMypage: true,
    });
  }, [navigation, timetable, timetableCacheKey]);

  useEffect(() => {
    if (hasFirstPaint || isGuidePreview) return;
    if (profileReady && ttReady) {
      setHasFirstPaint(true);
    }
  }, [hasFirstPaint, isGuidePreview, profileReady, ttReady]);

  const MenuItem = ({
    icon,
    title,
    subtitle,
    onPress,
    hideChevron = false,
  }) => {
    return (
      <TouchableOpacity
        style={styles.menuItem}
        onPress={onPress}
        activeOpacity={0.7}
      >
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

  const showPageSkeleton = !isGuidePreview && !hasFirstPaint;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {showPageSkeleton ? (
          <>
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
            <View style={[styles.ttSkeletonCard, { marginHorizontal: normalize(16) }]}>
              <View style={styles.ttSkeletonHeader} />
              {[...Array(7)].map((_, idx) => (
                <View style={styles.ttSkeletonRow} key={`page-tt-sk-${idx}`}>
                  <View style={styles.ttSkeletonCellSmall} />
                  <View style={styles.ttSkeletonCell} />
                  <View style={styles.ttSkeletonCell} />
                  <View style={styles.ttSkeletonCell} />
                  <View style={styles.ttSkeletonCell} />
                  <View style={styles.ttSkeletonCell} />
                </View>
              ))}
            </View>
            <View style={styles.menuSection}>
              {[...Array(8)].map((_, idx) => (
                <View
                  key={`menu-sk-${idx}`}
                  style={styles.menuSkeletonItem}
                />
              ))}
            </View>
          </>
        ) : (
          <>
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
                  <Text style={styles.ttSkeletonText}>
                    시간표를 불러오는 중입니다...
                  </Text>
                </View>
              ) : timetable ? (
                <GuideFocusTarget name={T.MYPAGE_TIMETABLE}>
                  <TimetableView
                    timetable={timetable}
                    timetableCacheKey={timetableCacheKey}
                    onNavigateToEdit={handleNavigateToTimetableCellEdit}
                    onPeriodSettingsPress={() =>
                      navigation.navigate('PeriodTimeSettings')
                    }
                    colorSeed={colorSeed}
                  />
                </GuideFocusTarget>
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
            icon="person-add-outline"
            title="친구 초대하기"
            onPress={handleInviteFriends}
          />
          <MenuItem
            icon="ribbon-outline"
            title="배지 관리"
            onPress={() => navigation.navigate('BadgeManage')}
          />
          <MenuItem
            icon="settings-outline"
            title="앱 설정"
            onPress={() =>
              navigation.navigate('NotificationSettings', { variant: 'prefs' })
            }
          />
          <MenuItem
            icon="person-circle-outline"
            title="계정 관리"
            onPress={() =>
              navigation.navigate('NotificationSettings', {
                variant: 'profile',
              })
            }
          />
          <MenuItem
            icon="information-circle-outline"
            title="고객 지원"
            onPress={() => navigation.navigate('Info')}
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
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default MyPage;

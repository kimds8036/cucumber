import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from '@expo/vector-icons/Feather';
import { Ionicons } from '@expo/vector-icons';
import ProfileIcon from '../assets/Profile.svg';
import { getNormalize, createProfileCardStyles } from '../styles/mypage.style';
import { api } from '../utils/api';
import { PROFILE_COUNTS_CACHE_KEY } from '../utils/profileCountsCache';
import { getProfileHexByColorId } from '../utils/profileColor';
import { useGuidePreview } from '../context/GuidePreviewContext';
import EquippedBadge from './EquippedBadge';
import { getGuideMyPageStats } from '../src/screens/UserGuide/guidePreviewData';
import { colors } from '../styles/colors';

const PROFILE_COUNTS_CACHE_TTL_MS = 10 * 60 * 1000;
const ENROLLMENT_TOOLTIP_MS = 3000;

const ProfileCard = ({
  userInfo,
  navigation,
  timetableSection,
  onNavigateToTimetableChoice,
}) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createProfileCardStyles(normalize), [normalize]);
  const seededCounts =
    userInfo?.postCount != null && userInfo?.scrapCount != null;
  const [counts, setCounts] = useState({
    friendCount: Number(userInfo?.friendCount ?? 0),
    postCount: Number(userInfo?.postCount ?? 0),
    scrapCount: Number(userInfo?.scrapCount ?? 0),
  });
  const [countsLoading, setCountsLoading] = useState(!seededCounts);
  const [enrollmentTipVisible, setEnrollmentTipVisible] = useState(false);
  const { isGuidePreview } = useGuidePreview();
  const profileEyeColor = getProfileHexByColorId(userInfo?.colorId);

  const gradeClassLabel =
    userInfo?.gradeClass ||
    (userInfo?.grade && userInfo?.classNumber
      ? `${userInfo.grade}학년 ${userInfo.classNumber}반`
      : '');

  const showEnrollmentTip = useCallback(() => {
    setEnrollmentTipVisible(true);
  }, []);

  useEffect(() => {
    if (!enrollmentTipVisible) return undefined;
    const timer = setTimeout(() => setEnrollmentTipVisible(false), ENROLLMENT_TOOLTIP_MS);
    return () => clearTimeout(timer);
  }, [enrollmentTipVisible]);

  const loadCounts = useCallback(
    async ({ force = false } = {}) => {
      if (isGuidePreview) {
        setCounts(getGuideMyPageStats());
        setCountsLoading(false);
        return;
      }
      const fallbackFriendCount = Number(userInfo?.friendCount ?? 0);
      try {
        const raw = await AsyncStorage.getItem(PROFILE_COUNTS_CACHE_KEY);
        let shouldFetch = true;

        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const cachedCounts = parsed?.counts;
            const ts = Number(parsed?.ts || 0);
            const isFresh = Date.now() - ts < PROFILE_COUNTS_CACHE_TTL_MS;
            if (cachedCounts) {
              setCounts((prev) => ({
                friendCount: Number.isFinite(fallbackFriendCount)
                  ? fallbackFriendCount
                  : Number(cachedCounts.friendCount ?? prev.friendCount ?? 0),
                postCount: Number(cachedCounts.postCount ?? 0),
                scrapCount: Number(cachedCounts.scrapCount ?? 0),
              }));
              setCountsLoading(false);
            }
            shouldFetch = force || !isFresh;
          } catch {
            shouldFetch = true;
          }
        }

        if (!shouldFetch) return;

        const res = await api.get('/api/users/me/stats');
        const nextCounts = {
          friendCount: Number.isFinite(fallbackFriendCount)
            ? fallbackFriendCount
            : Number(res.data?.data?.friendCount ?? 0),
          postCount: Number(res.data?.data?.postCount ?? 0),
          scrapCount: Number(res.data?.data?.scrapCount ?? 0),
        };
        setCounts(nextCounts);
        setCountsLoading(false);
        await AsyncStorage.setItem(
          PROFILE_COUNTS_CACHE_KEY,
          JSON.stringify({
            ts: Date.now(),
            counts: nextCounts,
          }),
        );
      } catch (e) {
        console.warn('[ProfileCard] 통계 로드 실패:', e?.message || e);
        setCountsLoading(false);
      }
    },
    [userInfo?.friendCount, isGuidePreview],
  );

  useEffect(() => {
    loadCounts();
    const unsub = navigation.addListener('focus', () => loadCounts());
    return unsub;
  }, [navigation, loadCounts]);

  useEffect(() => {
    if (
      userInfo?.postCount == null &&
      userInfo?.scrapCount == null &&
      userInfo?.friendCount == null
    ) {
      return;
    }
    setCounts((prev) => ({
      friendCount: Number(userInfo?.friendCount ?? prev.friendCount ?? 0),
      postCount:
        userInfo?.postCount != null
          ? Number(userInfo.postCount)
          : prev.postCount,
      scrapCount:
        userInfo?.scrapCount != null
          ? Number(userInfo.scrapCount)
          : prev.scrapCount,
    }));
    if (userInfo?.postCount != null && userInfo?.scrapCount != null) {
      setCountsLoading(false);
    }
  }, [userInfo?.friendCount, userInfo?.postCount, userInfo?.scrapCount]);

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <View style={[styles.profileCircle]}>
          <ProfileIcon
            width={normalize(70)}
            height={normalize(70)}
            color={profileEyeColor}
          />
        </View>

        <View style={styles.profileInfo}>
          <View style={styles.profileNameRow}>
            <Text style={styles.profileName} numberOfLines={1} ellipsizeMode="tail">
              {userInfo.name}
            </Text>
            <EquippedBadge
              badge={userInfo.equippedBadge}
              size={normalize(18)}
              style={{ flexShrink: 0 }}
            />
            <Text
              style={styles.profileUsername}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {userInfo.username}
            </Text>
          </View>
          {userInfo.school ? (
            <Text style={styles.profileSchoolLine} numberOfLines={2}>
              {userInfo.school}
            </Text>
          ) : null}
          {gradeClassLabel ? (
            <View style={styles.profileEnrollmentBlock}>
              <View style={styles.profileEnrollmentRow}>
                <Text
                  style={styles.profileEnrollmentLine}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {gradeClassLabel}
                </Text>
                <Pressable
                  onPress={showEnrollmentTip}
                  hitSlop={8}
                  style={styles.profileEnrollmentInfoBtn}
                  accessibilityRole="button"
                  accessibilityLabel="학년·반 변경 안내"
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={normalize(15)}
                    color={colors.textLight40}
                  />
                </Pressable>
              </View>
              {enrollmentTipVisible ? (
                <View style={styles.profileInfoTooltip}>
                  <Text style={styles.profileInfoTooltipText}>
                    계정 관리에서 학년·반을 변경할 수 있어요.
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={styles.quickLinksRow}>
            <TouchableOpacity
              style={styles.quickLinkCard}
              onPress={() => navigation.navigate('Friends')}
              activeOpacity={0.7}
              disabled={countsLoading}
            >
              {countsLoading ? (
                <>
                  <View style={styles.quickLinkSkeletonMeta} />
                  <View style={styles.quickLinkSkeletonLabel} />
                </>
              ) : (
                <>
                  <View
                    style={[
                      styles.quickLinkInlineRow,
                      { alignSelf: 'flex-start' },
                    ]}
                  >
                    <Text style={styles.quickLinkLabelInline}>친구</Text>
                    <Text style={styles.quickLinkMetaInline}>
                      {counts.friendCount}
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLinkCard}
              onPress={() => navigation.navigate('MyPosts', { tab: 'written' })}
              activeOpacity={0.7}
              disabled={countsLoading}
            >
              {countsLoading ? (
                <>
                  <View style={styles.quickLinkSkeletonMeta} />
                  <View style={styles.quickLinkSkeletonLabel} />
                </>
              ) : (
                <>
                  <View
                    style={[
                      styles.quickLinkInlineRow,
                      { alignSelf: 'flex-start' },
                    ]}
                  >
                    <Text style={styles.quickLinkLabelInline}>게시글</Text>
                    <Text style={styles.quickLinkMetaInline}>
                      {counts.postCount}
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLinkCard}
              onPress={() =>
                navigation.navigate('MyPosts', { tab: 'scrapped' })
              }
              activeOpacity={0.7}
              disabled={countsLoading}
            >
              {countsLoading ? (
                <>
                  <View style={styles.quickLinkSkeletonMeta} />
                  <View style={styles.quickLinkSkeletonLabel} />
                </>
              ) : (
                <>
                  <View
                    style={[
                      styles.quickLinkInlineRow,
                      { alignSelf: 'flex-start' },
                    ]}
                  >
                    <Text style={styles.quickLinkLabelInline}>스크랩</Text>
                    <Text style={styles.quickLinkMetaInline}>
                      {counts.scrapCount}
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {timetableSection ? (
        timetableSection
      ) : (
        <View style={styles.timetableActionRow}>
          <TouchableOpacity
            style={styles.timetableActionCard}
            onPress={
              onNavigateToTimetableChoice ||
              (() => navigation.navigate('TimetabelChoice'))
            }
            activeOpacity={0.7}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: normalize(4),
              }}
            >
              <Text style={styles.timetableActionMeta}>시간표 추가하기</Text>
              <Feather
                name="plus-circle"
                size={normalize(14)}
                color={styles.timetableActionMeta.color}
              />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default ProfileCard;

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from '@expo/vector-icons/Feather';
import ProfileIcon from '../assets/Profile.svg';
import { getNormalize, createProfileCardStyles } from '../styles/mypage.style';
import { api } from '../utils/api';
import { PROFILE_COUNTS_CACHE_KEY } from '../utils/profileCountsCache';
import { getProfileHexByColorId } from '../utils/profileColor';

const PROFILE_COUNTS_CACHE_TTL_MS = 10 * 60 * 1000;

const ProfileCard = ({
  userInfo,
  navigation,
  timetableSection,
  onNavigateToTimetableChoice,
}) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createProfileCardStyles(normalize),
    [normalize],
  );
  const [counts, setCounts] = useState({
    friendCount: Number(userInfo?.friendCount ?? 0),
    postCount: 0,
    scrapCount: 0,
  });
  const [countsLoading, setCountsLoading] = useState(true);
  const profileEyeColor = getProfileHexByColorId(userInfo?.colorId);

  const loadCounts = useCallback(async ({ force = false } = {}) => {
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
        })
      );
    } catch (e) {
      console.warn('[ProfileCard] 통계 로드 실패:', e?.message || e);
      setCountsLoading(false);
    }
  }, [userInfo?.friendCount]);

  useEffect(() => {
    loadCounts();
    const unsub = navigation.addListener('focus', () => loadCounts());
    return unsub;
  }, [navigation, loadCounts]);

  useEffect(() => {
    const fallbackFriendCount = Number(userInfo?.friendCount ?? 0);
    setCounts((prev) => ({
      ...prev,
      friendCount: Number.isFinite(fallbackFriendCount) ? fallbackFriendCount : prev.friendCount,
    }));
  }, [userInfo?.friendCount]);

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <View style={[styles.profileCircle]}>
          <ProfileIcon width={normalize(70)} height={normalize(70)} color={profileEyeColor} />
        </View>

        <View style={styles.profileInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: normalize(6) }}>
            <Text style={styles.profileName}>{userInfo.name}</Text>
            <Text style={styles.profileUsername}>{userInfo.username}</Text>
          </View>
          <Text style={styles.profileSchool}>
            {userInfo.school} {userInfo.gradeClass}
          </Text>
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
                  <View style={[styles.quickLinkInlineRow, { alignSelf: 'flex-start' }]}>
                    <Text style={styles.quickLinkLabelInline}>친구</Text>
                    <Text style={styles.quickLinkMetaInline}>{counts.friendCount}</Text>
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
                  <View style={[styles.quickLinkInlineRow, { alignSelf: 'flex-start' }]}>
                    <Text style={styles.quickLinkLabelInline}>게시글</Text>
                    <Text style={styles.quickLinkMetaInline}>{counts.postCount}</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLinkCard}
              onPress={() => navigation.navigate('MyPosts', { tab: 'scrapped' })}
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
                  <View style={[styles.quickLinkInlineRow, { alignSelf: 'flex-start' }]}>
                    <Text style={styles.quickLinkLabelInline}>스크랩</Text>
                    <Text style={styles.quickLinkMetaInline}>{counts.scrapCount}</Text>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: normalize(4) }}>
              <Text style={styles.timetableActionMeta}>시간표 추가하기</Text>
              <Feather name="plus-circle" size={normalize(14)} color={styles.timetableActionMeta.color} />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default ProfileCard;

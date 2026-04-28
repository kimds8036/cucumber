import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileIcon from '../assets/Profile.svg';
import { getNormalize, createProfileCardStyles } from '../styles/mypage.style';
import { useFriend } from '../context/FriendContext';
import { api } from '../utils/api';
import { PROFILE_COUNTS_CACHE_KEY } from '../utils/profileCountsCache';
import { getProfileHexByColorId } from '../utils/profileColor';

const PROFILE_COUNTS_CACHE_TTL_MS = 10 * 60 * 1000;

const ProfileCard = ({ userInfo, navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createProfileCardStyles(normalize),
    [normalize],
  );
  const { hasUnreadFriendRequests } = useFriend();
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
              // /api/auth/me 의 friendCount를 우선 신뢰해 캐시 역주입으로 숫자가 되돌아가지 않게 한다.
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
        // 통계 API보다 /api/auth/me 의 최신 friendCount를 우선 사용
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
      // friendCount는 사용자 기본정보가 바뀌면 항상 즉시 동기화
      friendCount: Number.isFinite(fallbackFriendCount) ? fallbackFriendCount : prev.friendCount,
    }));
  }, [userInfo?.friendCount]);

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <View style={[styles.profileCircle]}>
          <ProfileIcon width={normalize(56)} height={normalize(56)} color={profileEyeColor} />
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{userInfo.name}</Text>
          <Text style={styles.profileUsername}>{userInfo.username}</Text>
          <Text style={styles.profileSchool}>
            {userInfo.school} {userInfo.gradeClass}
          </Text>
        </View>
      </View>

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
              <Text style={styles.quickLinkMeta}>{counts.friendCount}</Text>
              <Text style={styles.quickLinkLabel}>친구</Text>
            </>
          )}
          {!countsLoading && hasUnreadFriendRequests ? (
            <View style={styles.quickLinkDot} />
          ) : null}
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
              <Text style={styles.quickLinkMeta}>{counts.postCount}</Text>
              <Text style={styles.quickLinkLabel}>게시글</Text>
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
              <Text style={styles.quickLinkMeta}>{counts.scrapCount}</Text>
              <Text style={styles.quickLinkLabel}>스크랩</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProfileCard;

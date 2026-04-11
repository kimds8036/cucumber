import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../styles/colors';
import MessageTabIcon from '../assets/Group 166.svg';
import { getNormalize, createProfileCardStyles } from '../styles/mypage.style';
import { useFriend } from '../context/FriendContext';
import { api } from '../utils/api';

const ProfileCard = ({ userInfo, navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createProfileCardStyles(normalize),
    [normalize],
  );
  const { hasUnreadFriendRequests } = useFriend();
  const [posts, setPosts] = useState([]);
  const [scrappedPosts, setScrappedPosts] = useState([]);

  const loadPostCounts = useCallback(async () => {
    try {
      const [writtenRes, scrappedRes] = await Promise.all([
        api.get('/api/posts/my', { params: { page: 1, limit: 50 } }),
        api.get('/api/posts/scrapped', { params: { page: 1, limit: 50 } }),
      ]);
      setPosts(writtenRes.data?.data?.posts || []);
      setScrappedPosts(scrappedRes.data?.data?.posts || []);
    } catch (e) {
      console.warn('[ProfileCard] 게시글 수 로드 실패:', e?.message || e);
      setPosts([]);
      setScrappedPosts([]);
    }
  }, []);

  useEffect(() => {
    loadPostCounts();
    const unsub = navigation.addListener('focus', loadPostCounts);
    return unsub;
  }, [navigation, loadPostCounts]);

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <View style={[styles.profileCircle, { backgroundColor: colors.primary }]}>
          <MessageTabIcon
            width={normalize(30)}
            height={normalize(30)}
            color={colors.green}
          />
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
        >
          <Text style={styles.quickLinkMeta}>{userInfo.friendCount ?? 0}</Text>
          <Text style={styles.quickLinkLabel}>친구</Text>
          {hasUnreadFriendRequests ? <View style={styles.quickLinkDot} /> : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickLinkCard}
          onPress={() => navigation.navigate('MyPosts', { tab: 'written' })}
          activeOpacity={0.7}
        >
          <Text style={styles.quickLinkMeta}>{posts.length}</Text>
          <Text style={styles.quickLinkLabel}>게시글</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickLinkCard}
          onPress={() => navigation.navigate('MyPosts', { tab: 'scrapped' })}
          activeOpacity={0.7}
        >
          <Text style={styles.quickLinkMeta}>{scrappedPosts.length}</Text>
          <Text style={styles.quickLinkLabel}>스크랩</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProfileCard;

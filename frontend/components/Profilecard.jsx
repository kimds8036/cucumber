import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import MessageTabIcon from '../assets/Group 166.svg';
import { getNormalize } from '../styles/message.style';
import { useFriend } from '../context/FriendContext';

const ProfileCard = ({ userInfo, navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const { hasUnreadFriendRequests } = useFriend();

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileHeader}>
        {/* 아바타 */}
        <View style={[styles.profileCircle, { backgroundColor: colors.primary }]}>
          <MessageTabIcon
            width={normalize(30)}
            height={normalize(30)}
            color={colors.green}
          />
        </View>

        {/* 이름 / 아이디 / 학교 */}
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{userInfo.name}</Text>
          <Text style={styles.profileUsername}>{userInfo.username}</Text>
          <Text style={styles.profileSchool}>
            {userInfo.school} {userInfo.gradeClass}
          </Text>
        </View>

        {/* 우측: 친구 뱃지 (미확인 친구 요청 있으면 빨간점) */}
        <TouchableOpacity
          style={styles.friendBadge}
          onPress={() => navigation.navigate('Friends')}
          activeOpacity={0.7}
        >
          <Ionicons name="people" size={13} color={colors.textWhite} />
          <Text style={styles.friendBadgeText}>{userInfo.friendCount}</Text>
          {hasUnreadFriendRequests && <View style={styles.friendBadgeDot} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  profileUsername: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  profileSchool: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  friendBadge: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  friendBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  friendBadgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.alert,
  },
});

export default ProfileCard;
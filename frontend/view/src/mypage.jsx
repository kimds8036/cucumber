import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../../styles/colors';
import MessageTabIcon from '../../assets/Group 166.svg';
import { getNormalize } from '../../styles/message.style';

const MyPage = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);

  const userInfo = {
    name: '김은채',
    username: '@euncha015',
    school: '전공고등학교',
    gradeClass: '3학년 4반',
    friendCount: 12,
  };

  const [timetable, setTimetable] = useState(null);

  const days = ['월', '화', '수', '목', '금'];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const getCellContent = (day, period) => {
    if (!timetable) return '';
    const key = `${day}-${period}`;
    return timetable[key] || '';
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => console.log('로그아웃됨'),
      },
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

  const MenuItem = ({ icon, title, subtitle, onPress, iconType = 'ionicons' }) => {
    const IconComponent = iconType === 'material' ? MaterialCommunityIcons : Ionicons;
    return (
      <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <View style={styles.menuLeft}>
          <IconComponent name={icon} size={24} color={colors.textPrimary} style={styles.menuIcon} />
          <View>
            <Text style={styles.menuTitle}>{title}</Text>
            {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const handleAddOrEditTimetable = () => {
    navigation.navigate('AddTimetable', {
      existingTimetable: timetable,
      onSave: (newTimetable) => setTimetable(newTimetable),
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* ── 프로필 카드 ── */}
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
              <Text style={styles.profileSchool}>{userInfo.school} {userInfo.gradeClass}</Text>
            </View>

            {/* 친구 수 — 작은 뱃지 형태 */}
            <TouchableOpacity
              style={styles.friendBadge}
              onPress={() => navigation.navigate('Friends')}
              activeOpacity={0.7}
            >
              <Ionicons name="people" size={13} color={colors.textWhite} />
              <Text style={styles.friendBadgeText}>{userInfo.friendCount}</Text>
            </TouchableOpacity>
          </View>

          {/* 시간표 */}
          {timetable ? (
            <View style={styles.timetableSection}>
              <Text style={styles.timetableTitle}>
                [{userInfo.school} {userInfo.gradeClass} 시간표]
              </Text>

              <View style={styles.timetableContainer}>
                <View style={styles.daysRow}>
                  <View style={styles.periodHeaderCell} />
                  {days.map((day) => (
                    <View key={day} style={styles.dayCell}>
                      <Text style={styles.dayText}>{day}</Text>
                    </View>
                  ))}
                </View>

                {periods.map((period) => (
                  <View key={period} style={styles.row}>
                    <View style={styles.periodCell}>
                      <Text style={styles.periodText}>{period}</Text>
                    </View>
                    {days.map((day) => {
                      const content = getCellContent(day, period);
                      return (
                        <View
                          key={`${day}-${period}`}
                          style={[styles.classCell, content ? styles.classCellFilled : null]}
                        >
                          <Text
                            style={[styles.classCellText, content ? styles.classCellTextFilled : null]}
                            numberOfLines={1}
                          >
                            {content}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.editButton} onPress={handleAddOrEditTimetable}>
                <Text style={styles.editButtonText}>시간표 수정하기</Text>
                <Ionicons name="pencil" size={16} color={colors.textWhite} style={styles.editIcon} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.editButton} onPress={handleAddOrEditTimetable}>
              <Text style={styles.editButtonText}>시간표를 추가하기</Text>
              <Ionicons name="pencil" size={16} color={colors.textWhite} style={styles.editIcon} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── 활동 ── */}
        <SectionHeader title="활동" />
        <View style={styles.menuSection}>
          <MenuItem
            icon="document-text-outline"
            title="내가 쓴 글"
            subtitle="전체 게시글"
            onPress={() => navigation.navigate('MyPosts', { type: '전체' })}
          />
          <MenuItem
            icon="document-text-outline"
            title="내가 쓴 글"
            subtitle="익명 게시판"
            onPress={() => navigation.navigate('MyPosts', { type: '익명' })}
          />
          <MenuItem
            icon="heart-outline"
            title="좋아요 누른글"
            subtitle="전체 게시판"
            onPress={() => navigation.navigate('LikedPosts')}
          />
          <MenuItem
            icon="heart-outline"
            title="좋아요 누른글"
            subtitle="익명 게시판"
            onPress={() => navigation.navigate('LikedPosts')}
          />
        </View>

        {/* ── 설정 ── */}
        <SectionHeader title="설정" />
        <View style={styles.menuSection}>
          <MenuItem
            icon="notifications-outline"
            title="알림 설정"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
          <MenuItem
            icon="lock-closed-outline"
            title="비밀번호 변경"
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            title="학교 변경"
            onPress={() => navigation.navigate('ChangeSchool')}
          />
        </View>

        {/* ── 계정 ── */}
        <SectionHeader title="계정" />
        <View style={styles.menuSection}>
          <MenuItem
            icon="log-out-outline"
            title="로그아웃"
            onPress={handleLogout}
          />
          <MenuItem
            icon="help-circle-outline"
            title="계정 탈퇴"
            onPress={handleDeleteAccount}
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    paddingTop: 8,
  },

  // ── 프로필 카드 ──
  profileCard: {
    backgroundColor: colors.background,
    margin: 16,
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
    alignItems: 'flex-start',
    marginBottom: 16,
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
  profileGradeClass: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  // 친구 뱃지 — 작고 심플하게
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
    alignSelf: 'flex-start',
  },
  friendBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },

  // ── 시간표 ──
  timetableSection: {
    marginTop: 8,
  },
  timetableTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  timetableContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.textLight10,
    marginBottom: 12,
  },
  daysRow: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
  },
  periodHeaderCell: {
    width: 30,
    height: 30,
    backgroundColor: colors.primary,
  },
  dayCell: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.3)',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
  },
  row: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.textLight10,
  },
  periodCell: {
    width: 30,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.textLight5,
  },
  periodText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  classCell: {
    flex: 1,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.textLight10,
    backgroundColor: colors.background,
    padding: 2,
  },
  classCellFilled: {
    backgroundColor: colors.primaryLight30,
  },
  classCellText: {
    fontSize: 10,
    color: colors.textLight20,
    textAlign: 'center',
  },
  classCellTextFilled: {
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  editIcon: {
    marginLeft: 4,
  },

  // ── 메뉴 ──
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  menuSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: colors.background,
    borderRadius: 999,
    marginBottom: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  menuSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bottomPadding: {
    height: 80,
  },
});

export default MyPage;
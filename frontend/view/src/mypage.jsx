import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../../styles/colors';
import ProfileCard from '../../components/Profilecard';
import TimetableView from '../../components/Timetableview';
import { api } from '../../utils/api';

const MyPage = ({ navigation }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    let mounted = true;
    const fetchMeAndTimetable = async () => {
      try {
        setLoading(true);
        const [meRes, timetableRes] = await Promise.all([
          api.get('/api/auth/me'),
          api.get('/api/timetable'),
        ]);

        if (!mounted) return;

        const me = meRes.data?.data;
        if (me) {
          setUserInfo({
            name: me.name,
            username: me.username ? `@${me.username}` : '',
            school: me.school?.name || '',
            gradeClass:
              me.grade && me.classNumber
                ? `${me.grade}학년 ${me.classNumber}반`
                : '',
            friendCount: me.friendCount ?? 0,
          });
        }

        const tt = timetableRes.data?.data?.timetable;
        // 시간표가 비어있으면 null로 두어 "시간표 추가하기" 버튼이 보이도록 처리
        const hasEntries = tt && Object.keys(tt).length > 0;
        setTimetable(hasEntries ? tt : null);
      } catch (error) {
        console.error('마이페이지 데이터 로드 실패:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchMeAndTimetable();
    return () => {
      mounted = false;
    };
  }, []);

  const handleAddOrEditTimetable = () => {
    navigation.navigate('AddTimetable', {
      existingTimetable: timetable,
      onSave: async (newTimetable) => {
        setTimetable(newTimetable);
        try {
          await api.put('/api/timetable', { timetable: newTimetable });
        } catch (error) {
          console.error('시간표 저장 실패:', error);
        }
      },
    });
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* ── 학생 정보 카드 ── */}
        {userInfo ? (
          <ProfileCard userInfo={userInfo} navigation={navigation} />
        ) : (
          <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
            <Text style={{ color: colors.textSecondary }}>프로필 정보를 불러오는 중입니다...</Text>
          </View>
        )}

        {/* ── 시간표 ── */}
        <TimetableView
          timetable={timetable}
          onAddOrEdit={handleAddOrEditTimetable}
        />

        {/* ── 메뉴 ── */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="settings-outline"
            title="설정 및 변경"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
          <MenuItem
            icon="document-text-outline"
            title="활동"
            onPress={() => navigation.navigate('MyPosts', { type: '전체' })}
          />
          <MenuItem
            icon="person-outline"
            title="계정"
            onPress={() => {
              Alert.alert('계정', '선택하세요', [
                { text: '취소', style: 'cancel' },
                { text: '로그아웃', onPress: handleLogout },
                { text: '계정 탈퇴', onPress: handleDeleteAccount, style: 'destructive' },
              ]);
            }}
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
  menuSection: {
    marginHorizontal: 16,
    marginTop: 8,
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
import React, { useState } from 'react';
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

const MyPage = ({ navigation }) => {
  const userInfo = {
    name: '김은채',
    username: '@euncha015',
    joinDate: '가입 3년 9개월 4일',
    period: '2023/03 - 2027/02',
  };

  // 시간표 데이터 상태 (null이면 시간표 없음, 객체면 시간표 있음)
  const [timetable, setTimetable] = useState(null);
  
  // 시간표가 있을 때 샘플 데이터 (실제로는 서버나 AsyncStorage에서 가져옴)
  // const [timetable, setTimetable] = useState({
  //   '월-1': '국어',
  //   '월-2': '수학',
  //   '월-3': '영어',
  //   '화-1': '과학',
  //   '화-2': '사회',
  //   '수-1': '음악',
  //   '수-3': '체육',
  //   '목-2': '미술',
  //   '금-1': '국어',
  //   '금-4': '수학',
  // });

  const days = ['월', '화', '수', '목', '금'];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const getCellContent = (day, period) => {
    if (!timetable) return '';
    const key = `${day}-${period}`;
    return timetable[key] || '';
  };

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: () => {
            // TODO: 실제 로그아웃 처리 (토큰 삭제 등)
            console.log('로그아웃됨');
          },
        },
      ],
    );
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
          onPress: () => {
            // TODO: 실제 계정 삭제 API 연동
            Alert.alert('계정 탈퇴', '계정이 삭제되었습니다.');
          },
        },
      ],
    );
  };

  const MenuItem = ({ icon, title, subtitle, onPress, iconType = 'ionicons' }) => {
    const IconComponent = iconType === 'material' ? MaterialCommunityIcons : Ionicons;
    
    return (
      <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <View style={styles.menuLeft}>
          <IconComponent name={icon} size={24} color="#333" style={styles.menuIcon} />
          <View>
            <Text style={styles.menuTitle}>{title}</Text>
            {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const handleAddOrEditTimetable = () => {
    // AddTimetable 화면으로 이동
    navigation.navigate('AddTimetable', {
      existingTimetable: timetable,
      onSave: (newTimetable) => {
        setTimetable(newTimetable);
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={32} color="#fff" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userInfo.name}</Text>
              <Text style={styles.profileUsername}>{userInfo.username}</Text>
              <Text style={styles.profileDate}>{userInfo.joinDate}</Text>
              <Text style={styles.profilePeriod}>{userInfo.period}</Text>
            </View>
          </View>

          {/* 조건부 렌더링: 시간표가 있으면 보여주고, 없으면 버튼만 */}
          {timetable ? (
            // 시간표가 있을 때
            <View style={styles.timetableSection}>
              <Text style={styles.timetableTitle}>[전공 고등학교 3학년 4반 시간표]</Text>
              
              <View style={styles.timetableContainer}>
                {/* Days Header */}
                <View style={styles.daysRow}>
                  <View style={styles.periodHeaderCell} />
                  {days.map((day) => (
                    <View key={day} style={styles.dayCell}>
                      <Text style={styles.dayText}>{day}</Text>
                    </View>
                  ))}
                </View>

                {/* Timetable Grid */}
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
                          style={[
                            styles.classCell,
                            content ? styles.classCellFilled : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.classCellText,
                              content ? styles.classCellTextFilled : null,
                            ]}
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

              {/* 시간표 수정 버튼 */}
              <TouchableOpacity 
                style={styles.editButton}
                onPress={handleAddOrEditTimetable}
              >
                <Text style={styles.editButtonText}>시간표 수정하기</Text>
                <Ionicons name="pencil" size={16} color="#fff" style={styles.editIcon} />
              </TouchableOpacity>
            </View>
          ) : (
            // 시간표가 없을 때
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleAddOrEditTimetable}
            >
              <Text style={styles.editButtonText}>시간표를 추가하기</Text>
              <Ionicons name="pencil" size={16} color="#fff" style={styles.editIcon} />
            </TouchableOpacity>
          )}
        </View>

        {/* 활동 Section */}
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

        {/* 설정 Section */}
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

        {/* 계정 Section */}
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

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    paddingTop: 8,
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8FD397',
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
    color: '#333',
    marginBottom: 2,
  },
  profileUsername: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  profileDate: {
    fontSize: 12,
    color: '#999',
  },
  profilePeriod: {
    fontSize: 12,
    color: '#999',
  },
  timetableSection: {
    marginTop: 8,
  },
  timetableTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  timetableContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  daysRow: {
    flexDirection: 'row',
    backgroundColor: '#8FD397',
  },
  periodHeaderCell: {
    width: 30,
    height: 30,
    backgroundColor: '#8FD397',
  },
  dayCell: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.3)',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  periodCell: {
    width: 30,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  periodText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
  },
  classCell: {
    flex: 1,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
    backgroundColor: '#fff',
    padding: 2,
  },
  classCellFilled: {
    backgroundColor: '#f0f9f1',
  },
  classCellText: {
    fontSize: 10,
    color: '#ddd',
    textAlign: 'center',
  },
  classCellTextFilled: {
    fontSize: 10,
    color: '#333',
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    backgroundColor: '#8FD397',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  editIcon: {
    marginLeft: 4,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
    borderRadius: 999,
    marginBottom: 10,
    shadowColor: '#000',
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
    color: '#333',
    fontWeight: '500',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  bottomPadding: {
    height: 80,
  },
});

export default MyPage;
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../../styles/colors';
import ProfileCard from '../../components/Profilecard';
import TimetableView from '../../components/Timetableview';
import { api } from '../../utils/api';

const MyPage = ({ navigation }) => {
  const TIMETABLE_CACHE_KEY = '@mypage_timetable_cache_v1';
  const TIMETABLE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const [userInfo, setUserInfo] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [initialTimetable, setInitialTimetable] = useState(null);
  const [editingTimetable, setEditingTimetable] = useState({});
  const [colorSeed, setColorSeed] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [className, setClassName] = useState('');
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
        let cachedTimetable = null;
        try {
          const raw = await AsyncStorage.getItem(TIMETABLE_CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Date.now() - Number(parsed?.ts || 0) < TIMETABLE_CACHE_TTL_MS) {
              cachedTimetable = parsed?.timetable || null;
              if (mounted) {
                const normalized = cachedTimetable && Object.keys(cachedTimetable).length > 0 ? cachedTimetable : null;
                setTimetable(normalized);
                setInitialTimetable(normalized);
              }
            }
          }
        } catch (cacheErr) {
          console.warn('시간표 캐시 읽기 실패:', cacheErr);
        }

        const meRes = await api.get('/api/auth/me');

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

        // 캐시가 만료된 경우에는 빈 시간표(null)로 초기화
        if (!cachedTimetable && mounted) {
          setTimetable(null);
          setInitialTimetable(null);
        }
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

  const handleStartEdit = () => {
    setEditingTimetable(timetable || {});
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingTimetable({});
  };

  const handleSaveEdit = async () => {
    const hasEntries = editingTimetable && Object.keys(editingTimetable).length > 0;
    const next = hasEntries ? editingTimetable : null;
    setTimetable(next);
    setIsEditMode(false);
    try {
      await AsyncStorage.setItem(
        TIMETABLE_CACHE_KEY,
        JSON.stringify({
          ts: Date.now(),
          timetable: next,
        }),
      );
    } catch (error) {
      console.error('시간표 저장 실패:', error);
    }
  };

  const handleResetTimetable = () => {
    Alert.alert(
      '시간표 초기화',
      '시간표를 초기 상태로 되돌릴까요?\n저장한 최신 편집 내용은 사라지고, 과목 색상도 다시 재배치됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            const resetValue = initialTimetable && Object.keys(initialTimetable).length > 0
              ? { ...initialTimetable }
              : null;
            setTimetable(resetValue);
            setEditingTimetable(resetValue || {});
            setIsEditMode(false);
            setColorSeed((prev) => prev + 1);
            try {
              await AsyncStorage.setItem(
                TIMETABLE_CACHE_KEY,
                JSON.stringify({
                  ts: Date.now(),
                  timetable: resetValue,
                }),
              );
            } catch (error) {
              console.error('시간표 초기화 저장 실패:', error);
            }
          },
        },
      ],
    );
  };

  const handleCellPress = (day, period) => {
    if (!isEditMode) return;
    setSelectedDay(day);
    setSelectedPeriod(period);
    const key = `${day}-${period}`;
    setClassName(editingTimetable[key] || '');
    setModalVisible(true);
  };

  const handleApplyCell = () => {
    if (!selectedDay || !selectedPeriod) return;
    const key = `${selectedDay}-${selectedPeriod}`;
    const trimmed = className.trim();
    const next = { ...editingTimetable };
    if (!trimmed) delete next[key];
    else next[key] = trimmed;
    setEditingTimetable(next);
    setModalVisible(false);
    setSelectedDay(null);
    setSelectedPeriod(null);
    setClassName('');
  };

  const handleDeleteCell = () => {
    if (!selectedDay || !selectedPeriod) return;
    const key = `${selectedDay}-${selectedPeriod}`;
    const next = { ...editingTimetable };
    delete next[key];
    setEditingTimetable(next);
    setModalVisible(false);
    setSelectedDay(null);
    setSelectedPeriod(null);
    setClassName('');
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
          timetable={isEditMode ? editingTimetable : timetable}
          onAddOrEdit={handleStartEdit}
          editMode={isEditMode}
          onToggleEdit={handleStartEdit}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          onCellPress={handleCellPress}
          onResetPress={handleResetTimetable}
          colorSeed={colorSeed}
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
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedDay}요일 {selectedPeriod}교시
            </Text>
            <TextInput
              style={styles.input}
              placeholder="과목명을 입력하세요 (비우면 삭제)"
              value={className}
              onChangeText={setClassName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setClassName('');
                }}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteCell}
              >
                <Text style={styles.deleteButtonText}>삭제</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleApplyCell}
              >
                <Text style={styles.confirmButtonText}>적용</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: colors.textLight5,
  },
  deleteButton: {
    backgroundColor: colors.alert,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  deleteButtonText: {
    fontSize: 15,
    color: colors.textWhite,
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 15,
    color: colors.textWhite,
    fontWeight: '600',
  },
});

export default MyPage;
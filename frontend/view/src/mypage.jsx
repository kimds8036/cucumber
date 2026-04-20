import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../styles/colors';
import {
  createMyPageStyles,
  getNormalize,
  themedTextInputProps,
} from '../../styles/mypage.style';
import ProfileCard from '../../components/Profilecard';
// import TimetableView from '../../components/Timetableview'; // 시간표 UI 복구 시 주석 해제
import { api, clearAuthToken } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const MyPage = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createMyPageStyles(normalize), [normalize]);
  const { logout } = useAuth();
  const TIMETABLE_CACHE_KEY = '@mypage_timetable_cache_v1';
  const TIMETABLE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const PROFILE_CACHE_KEY = '@mypage_profile_cache_v1';
  const PROFILE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
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
  const [timetableLoading, setTimetableLoading] = useState(false);

  const handleLogout = async () => {
    try {
      // 서버 로그아웃은 실패해도 로컬 세션 정리는 진행
      await api.post('/api/auth/logout').catch(() => null);
      await clearAuthToken();
      await AsyncStorage.removeItem(TIMETABLE_CACHE_KEY);
      await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
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
        let cachedProfile = null;
        try {
          const rawProfile = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
          if (rawProfile) {
            const parsed = JSON.parse(rawProfile);
            if (Date.now() - Number(parsed?.ts || 0) < PROFILE_CACHE_TTL_MS) {
              cachedProfile = parsed?.userInfo || null;
              if (mounted && cachedProfile) {
                setUserInfo(cachedProfile);
              }
            }
          }
        } catch (profileCacheErr) {
          console.warn('프로필 캐시 읽기 실패:', profileCacheErr);
        }

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
            } else {
              setTimetableLoading(true);
            }
          } else {
            setTimetableLoading(true);
          }
        } catch (cacheErr) {
          console.warn('시간표 캐시 읽기 실패:', cacheErr);
          setTimetableLoading(true);
        }

        const meRes = await api.get('/api/auth/me');
        // TEMP TEST: /api/auth/me 응답 raw 전체 확인 (확인 후 삭제)
        console.log('[TEMP][MyPage] /api/auth/me raw response =', JSON.stringify(meRes?.data));
        if (!mounted) return;

        const me = meRes.data?.data;
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
            friendCount: me.friendCount ?? 0,
          };
          setUserInfo(nextUserInfo);
          try {
            await AsyncStorage.setItem(
              PROFILE_CACHE_KEY,
              JSON.stringify({
                ts: Date.now(),
                userInfo: nextUserInfo,
              }),
            );
          } catch (profileSaveErr) {
            console.warn('프로필 캐시 저장 실패:', profileSaveErr);
          }
        } else if (!cachedProfile && mounted) {
          setUserInfo(null);
        }

        // 캐시가 없거나 비어 있으면 서버 시간표를 1회 조회하여 채운다.
        if ((!cachedTimetable || Object.keys(cachedTimetable || {}).length === 0) && mounted) {
          try {
            const ttRes = await api.get('/api/timetable');
            const tt = ttRes.data?.data?.timetable || {};
            const hasEntries = Object.keys(tt).length > 0;
            const normalized = hasEntries ? tt : null;
            setTimetable(normalized);
            setInitialTimetable(normalized);
            await AsyncStorage.setItem(
              TIMETABLE_CACHE_KEY,
              JSON.stringify({
                ts: Date.now(),
                timetable: normalized,
              }),
            );
          } catch (ttError) {
            console.error('[MyPage] /api/timetable 조회 실패:', ttError?.response?.data || ttError?.message || ttError);
            setTimetable(null);
            setInitialTimetable(null);
          } finally {
            setTimetableLoading(false);
          }
        } else {
          setTimetableLoading(false);
        }
      } catch (error) {
        console.error('[MyPage] 데이터 로드 실패:', error?.response?.data || error?.message || error);
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

  const MenuItem = ({
    icon,
    title,
    subtitle,
    onPress,
    hideChevron = false,
  }) => {
    return (
      <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* ── 학생 정보 카드 ── */}
        {userInfo ? (
          <ProfileCard userInfo={userInfo} navigation={navigation} />
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

        {/* ── 시간표 (일시 비표시 — 복구 시 아래 블록 주석 해제 + TimetableView import 주석 해제) ──
        {timetableLoading && !isEditMode ? (
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
            <Text style={styles.ttSkeletonText}>시간표를 불러오는 중입니다...</Text>
          </View>
        ) : (
          <TimetableView
            timetable={isEditMode ? (editingTimetable || {}) : (timetable || {})}
            onAddOrEdit={handleStartEdit}
            editMode={isEditMode}
            onToggleEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onCellPress={handleCellPress}
            onResetPress={handleResetTimetable}
            colorSeed={colorSeed}
          />
        )}
        */}

        {/* ── 메뉴 ── */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="notifications-outline"
            title="설정"
            onPress={() =>
              navigation.navigate('NotificationSettings', { variant: 'prefs' })
            }
          />
          <MenuItem
            icon="create-outline"
            title="변경"
            onPress={() =>
              navigation.navigate('NotificationSettings', { variant: 'profile' })
            }
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
      </ScrollView>
      {/* 시간표 셀 편집 모달 — 시간표 UI 복구 시 주석 해제
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
              {...themedTextInputProps}
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
      */}

    </View>
  );
};

export default MyPage;
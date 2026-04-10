import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import StudyGrassMap from '../../components/studygrassmap';
import SubHeader from '../frame/subHeader';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createOtherSchoolStyles } from '../../styles/otherschool.style';
import { api } from '../../utils/api';

const OtherSchoolScreen = ({ route, navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createOtherSchoolStyles(normalize), [normalize]);

  const routeName = route?.params?.schoolName ?? '';
  const routeSchoolId = route?.params?.schoolId ?? null;

  const [schoolInfo, setSchoolInfo] = useState({
    name: routeName,
    location: '',
    studentCount: 0,
    postCount: 0,
    mailCount: 0,
    eduOfficeCode: '',
    adminStandardCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [mealLoading, setMealLoading] = useState(false);
  const [nextMeals, setNextMeals] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSchool = async () => {
      if (!routeSchoolId) {
        console.log('[OtherSchool] no schoolId in route params, skip API call');
        return;
      }
      console.log('[OtherSchool] routeSchoolId raw:', routeSchoolId);
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/api/schools/${routeSchoolId}`);
        const data = res.data?.data || {};
        console.log('[OtherSchool] /api/schools response data:', data);
        setSchoolInfo({
          name: data.name || routeName,
          // 백엔드에서 내려주는 address 필드를 우선 사용
          location: data.address || data.location || '',
          studentCount: data.studentCount || 0,
          postCount: data.postCount || 0,
          mailCount: data.mailCount || 0,
          eduOfficeCode: data.eduOfficeCode || data.edu_office_code || '',
          adminStandardCode: data.adminStandardCode || data.admin_standard_code || '',
        });
      } catch (e) {
        console.error('학교 정보 조회 실패:', e?.response?.data || e.message);
        setError('학교 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchSchool();
  }, [routeSchoolId, routeName]);

  useEffect(() => {
    let mounted = true;
    const fetchMeals = async () => {
      if (!routeSchoolId) {
        setNextMeals([]);
        return;
      }
      try {
        setMealLoading(true);
        const res = await api.get(`/api/schools/${routeSchoolId}/meals/next`, {
          params: { count: 3 },
        });
        if (!mounted) return;
        const rows = res.data?.data?.meals || [];
        setNextMeals(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (mounted) setNextMeals([]);
      } finally {
        if (mounted) setMealLoading(false);
      }
    };
    fetchMeals();
    return () => {
      mounted = false;
    };
  }, [routeSchoolId]);

  const mealTypeLabel = {
    breakfast: '조식',
    lunch: '중식',
    dinner: '석식',
  };

  const mealSlotsRaw = nextMeals.map((m) => {
    const ymd = String(m.ymd || '');
    return {
      ymd,
      mealType: mealTypeLabel[m.mealType] || '급식',
      menus: Array.isArray(m.menus) ? m.menus : [],
    };
  });
  const mealSlots = [...mealSlotsRaw];
  while (mealSlots.length < 3) {
    mealSlots.push({ ymd: '', mealType: '급식', menus: [] });
  }
  const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  const getDayBadge = (ymd) => {
    if (!/^\d{8}$/.test(String(ymd || ''))) return '-';
    const date = new Date(
      Number(ymd.slice(0, 4)),
      Number(ymd.slice(4, 6)) - 1,
      Number(ymd.slice(6, 8)),
    );
    return `${weekdayLabels[date.getDay()]}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SubHeader
        title={routeName}
        onBack={() => navigation?.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 학교 정보 카드 */}
        <View style={styles.schoolCardBlock}>
          <View style={styles.schoolCard}>
            {loading ? (
              <View style={{ minHeight: normalize(110), justifyContent: 'center' }}>
                <View style={{ height: normalize(18), width: '45%', backgroundColor: '#ECECEC', borderRadius: 6, marginBottom: 10 }} />
                <View style={{ height: normalize(14), width: '65%', backgroundColor: '#F0F0F0', borderRadius: 6, marginBottom: 12 }} />
                <View style={styles.schoolInfoDivider} />
                <View style={styles.statsContainer}>
                  {[0, 1, 2].map((idx) => (
                    <View key={idx} style={styles.statItem}>
                      <View style={{ height: normalize(16), width: normalize(58), backgroundColor: '#F0F0F0', borderRadius: 6 }} />
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <>
                <View style={styles.schoolNameRow}>
                  <Text style={styles.schoolName}>{schoolInfo.name}</Text>
                </View>
                <View style={styles.locationContainer}>
                  <Ionicons name="location-outline" size={normalize(14)} color={colors.textSecondary} />
                  <Text style={styles.locationText}>{schoolInfo.location}</Text>
                </View>
                <View style={styles.schoolInfoDivider} />
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <View style={styles.statValueContainer}>
                      <Ionicons name="person" size={normalize(16)} color={colors.primary} />
                      <Text style={styles.statValue}>{schoolInfo.studentCount}명</Text>
                    </View>
                  </View>
                  <View style={styles.statItem}>
                    <View style={styles.statValueContainer}>
                      <Ionicons name="chatbubbles" size={normalize(16)} color={colors.primary} />
                      <Text style={styles.statValue}>{schoolInfo.postCount}개</Text>
                    </View>
                  </View>
                  <View style={styles.statItem}>
                    <View style={styles.statValueContainer}>
                      <Ionicons name="mail" size={normalize(16)} color={colors.primary} />
                      <Text style={styles.statValue}>{schoolInfo.mailCount}개</Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* 급식 카드 */}
        <View style={styles.mealCardBlock}>
          <View style={styles.mealSectionCard}>
            <View style={styles.mealSectionHeader}>
              <Text style={styles.mealSectionTitle}>급식</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  navigation?.navigate('MealCalendar', {
                    schoolId: routeSchoolId,
                    schoolName: schoolInfo.name || routeName,
                  })
                }
              >
                <Text style={styles.mealSectionMore}>자세히 →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mealSlotsRow}>
              {mealLoading ? (
                [0, 1, 2].map((idx) => (
                  <View key={`meal-skeleton-${idx}`} style={[styles.mealSlot, idx === 2 && styles.mealSlotLast]}>
                    <View style={styles.mealCard}>
                      <View style={{ height: normalize(14), width: '45%', backgroundColor: '#ECECEC', borderRadius: 6, marginBottom: 8 }} />
                      <View style={{ height: normalize(12), width: '90%', backgroundColor: '#F0F0F0', borderRadius: 6, marginBottom: 6 }} />
                      <View style={{ height: normalize(12), width: '80%', backgroundColor: '#F0F0F0', borderRadius: 6 }} />
                    </View>
                  </View>
                ))
              ) : (
                mealSlots.map((slot, index) => (
                <View
                  key={`${slot.ymd}-${slot.mealType}-${index}`}
                  style={[
                    styles.mealSlot,
                    index === mealSlots.length - 1 && styles.mealSlotLast,
                  ]}
                >
                  <View style={[styles.mealCard, { minHeight: normalize(96) }]}>
                    <View style={styles.mealSlotHeader}>
                      <View style={styles.mealSlotTitleRow}>
                        <MaterialCommunityIcons
                          name="rice"
                          size={normalize(14)}
                          color={colors.primary}
                        />
                        <Text style={styles.mealSlotTitle}>{slot.mealType}</Text>
                      </View>
                      <View style={styles.mealSlotBadge}>
                        <Text style={styles.mealSlotBadgeText}>{getDayBadge(slot.ymd)}</Text>
                      </View>
                    </View>

                    <View style={styles.mealSlotMenus}>
                      {slot.menus && slot.menus.length > 0 ? (
                        slot.menus.map((menu, idx) => (
                          <Text
                            key={`${idx}-${menu}`}
                            style={styles.mealSlotMenuText}
                            numberOfLines={1}
                          >
                            {menu}
                          </Text>
                        ))
                      ) : (
                        <Text style={styles.mealSlotEmptyText}>정보 없음</Text>
                      )}
                    </View>
                  </View>
                </View>
                ))
              )}
            </View>
          </View>
        </View>

        {/* 공부 잔디 카드 */}
        <View style={styles.grassCard}>
          <Text style={styles.grassCardTitle}>우리 학교 공부 잔디밭</Text>
          <StudyGrassMap />
        </View>

        {/* 학교 우편함 (전체 너비 가로) */}
        <View style={styles.mailboxWideBlock}>
          <TouchableOpacity
            style={styles.mailboxWideButton}
            activeOpacity={0.7}
            onPress={() =>
              navigation?.navigate('SchoolMailbox', {
                schoolName: schoolInfo.name || routeName,
                schoolId: routeSchoolId,
              })
            }
          >
            <View style={styles.mailboxWideIconWrap}>
              <Ionicons name="mail" size={normalize(26)} color={colors.primary} />
            </View>
            <View style={styles.mailboxWideTextCol}>
              <Text style={styles.mailboxWideTitle}>학교 우편함</Text>
            </View>
            <View style={styles.mailboxWideChevronWrap}>
              <Ionicons name="chevron-forward" size={normalize(22)} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OtherSchoolScreen;


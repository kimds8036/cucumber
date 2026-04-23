import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';
import { colors, fontSizes, fonts } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createOurSchoolStyles } from '../../styles/school.style';
import { createOtherSchoolStyles } from '../../styles/otherschool.style';
import { api } from '../../utils/api';
import StudyGrassMap from '../../components/studygrassmap';

const OtherSchoolScreen = ({ route, navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createOurSchoolStyles(normalize), [normalize]);
  const otherSchoolStyles = useMemo(
    () => createOtherSchoolStyles(normalize),
    [normalize],
  );

  const routeName = route?.params?.schoolName ?? '';
  const routeSchoolId = route?.params?.schoolId ?? null;

  const [schoolInfo, setSchoolInfo] = useState({
    id: routeSchoolId,
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
  const [selectedMealSlot, setSelectedMealSlot] = useState(null);
  const [grassDays, setGrassDays] = useState([]);
  const getCurrentSemesterDays = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    let start;
    let end;
    if (month >= 3 && month <= 8) {
      start = new Date(year, 2, 1);
      end = new Date(year, 7, 31);
    } else if (month >= 9) {
      start = new Date(year, 8, 1);
      end = new Date(year + 1, 2, 0);
    } else {
      start = new Date(year - 1, 8, 1);
      end = new Date(year, 2, 0);
    }
    const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    return diffDays;
  };

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
          id: data.id ?? data.school_id ?? routeSchoolId,
          name: data.name || routeName,
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

  useEffect(() => {
    let mounted = true;
    const fetchStudyGrass = async () => {
      if (!routeSchoolId) {
        setGrassDays([]);
        return;
      }
      try {
        const res = await api.get(`/api/schools/${routeSchoolId}/study-grass`, {
          params: { days: getCurrentSemesterDays() },
        });
        if (!mounted) return;
        const series = res.data?.data?.series || [];
        const mapped = Array.isArray(series)
          ? series.map((row) => ({
              dayKey: row?.dayKey,
              totalElapsedMs: row?.totalElapsedMs,
            }))
          : [];
        setGrassDays(mapped);
      } catch (e) {
        if (mounted) setGrassDays([]);
      }
    };
    fetchStudyGrass();
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

  const grassTitle = `${schoolInfo.name || routeName || '학교'} 공부 잔디밭`;

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
        {/* 학교 정보 카드 — 우리 학교 화면과 동일 */}
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

        {error ? (
          <View style={{ marginBottom: normalize(12), paddingHorizontal: normalize(4) }}>
            <Text style={{ fontSize: normalize(fontSizes.lg), color: colors.alert, fontFamily: fonts.regular }}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* 급식 카드 — 우리 학교 화면과 동일(모달·스켈레톤·슬롯 터치) */}
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
                    <View style={[styles.mealCard, { minHeight: normalize(96) }]}>
                      <View style={styles.mealSlotHeader}>
                        <View style={styles.mealSlotTitleRow}>
                          <View
                            style={{
                              height: normalize(fontSizes.xl),
                              width: '58%',
                              backgroundColor: '#ECECEC',
                              borderRadius: 6,
                            }}
                          />
                        </View>
                        <View style={styles.mealSlotBadge}>
                          <View
                            style={{
                              height: normalize(fontSizes.lg),
                              width: normalize(32),
                              backgroundColor: '#E8E8E8',
                              borderRadius: 6,
                            }}
                          />
                        </View>
                      </View>
                      <View style={styles.mealSlotMenus}>
                        {[0, 1, 2, 3].map((line) => (
                          <View
                            key={`meal-skel-line-${idx}-${line}`}
                            style={{
                              height: normalize(fontSizes.lg),
                              marginBottom: normalize(2),
                              width: line === 3 ? '62%' : '100%',
                              backgroundColor: '#F0F0F0',
                              borderRadius: 4,
                            }}
                          />
                        ))}
                      </View>
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
                    <TouchableOpacity
                      style={styles.mealSlotTouch}
                      activeOpacity={0.85}
                      onPress={() => setSelectedMealSlot(slot)}
                    >
                      <View style={[styles.mealCard, { minHeight: normalize(96) }]}>
                        <View style={styles.mealSlotHeader}>
                          <View style={styles.mealSlotTitleRow}>
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
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>

        {/* 공부 잔디 카드 — 우리 학교 화면과 동일 */}
        <View style={styles.grassCard}>
          <Text style={styles.grassCardTitle}>{grassTitle}</Text>
          <StudyGrassMap days={grassDays} />
        </View>

        {/* 학교 우편함 — 이전 가로형 카드 디자인 */}
        <View style={otherSchoolStyles.mailboxWideBlock}>
          <TouchableOpacity
            style={otherSchoolStyles.mailboxWideButton}
            activeOpacity={0.7}
            onPress={() =>
              navigation?.navigate('SchoolMailbox', {
                schoolName: schoolInfo.name || routeName,
                schoolId: routeSchoolId,
              })
            }
          >
            <View style={otherSchoolStyles.mailboxWideIconWrap}>
              <Ionicons name="mail" size={normalize(26)} color={colors.primary} />
            </View>
            <View style={otherSchoolStyles.mailboxWideTextCol}>
              <Text style={otherSchoolStyles.mailboxWideTitle}>학교 우편함</Text>
            </View>
            <View style={otherSchoolStyles.mailboxWideChevronWrap}>
              <Ionicons
                name="chevron-forward"
                size={normalize(22)}
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={Boolean(selectedMealSlot)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMealSlot(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedMealSlot(null)}>
          <View style={styles.mealModalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.mealModalCard}>
                <View style={styles.mealModalHeader}>
                  <View style={styles.mealModalTitleRow}>
                    <Text style={styles.mealModalTitle}>
                      {selectedMealSlot?.mealType || '급식'}
                    </Text>
                  </View>
                  <View style={styles.mealModalBadge}>
                    <Text style={styles.mealModalBadgeText}>
                      {getDayBadge(selectedMealSlot?.ymd)}
                    </Text>
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {selectedMealSlot?.menus?.length > 0 ? (
                    selectedMealSlot.menus.map((menu, idx) => (
                      <Text
                        key={`${idx}-${menu}`}
                        style={styles.mealModalMenuText}
                      >
                        {menu}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.mealModalEmptyText}>
                      정보 없음
                    </Text>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default OtherSchoolScreen;

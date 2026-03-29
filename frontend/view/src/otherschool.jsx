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

  const routeName = route?.params?.schoolName ?? '진관고등학교';
  const routeSchoolId = route?.params?.schoolId ?? null;

  const [schoolInfo, setSchoolInfo] = useState({
    name: routeName,
    location: '',
    studentCount: 0,
    postCount: 0,
    mailCount: 0,
  });
  const [loading, setLoading] = useState(false);
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

  const schoolMealTypes = ['중식', '석식'];

  const mealData = [
    {
      조식: ['토스트', '우유', '샐러드'],
      중식: ['김치찌개', '잡채', '계란말이', '흰쌀밥'],
      석식: ['부대찌개', '깍두기', '어묵볶음', '흰쌀밥'],
    },
    {
      조식: ['식빵', '우유', '요거트'],
      중식: ['된장찌개', '멸치볶음', '시금치나물', '흰쌀밥'],
      석식: ['순두부찌개', '김치', '제육볶음', '흰쌀밥'],
    },
    {
      조식: ['크로와상', '오렌지주스', '과일'],
      중식: ['비빔밥', '미역국', '깍두기', '흰쌀밥'],
      석식: ['감자탕', '콩나물무침', '김치', '흰쌀밥'],
    },
  ];

  const getCurrentSlots = () => {
    const now = new Date();
    const hour = now.getHours();
    const allTypes = ['조식', '중식', '석식'];

    let baseDayIndex = 0;
    let baseMealType = '조식';

    if (hour < 10) {
      baseMealType = '조식';
    } else if (hour < 14) {
      baseMealType = '중식';
    } else if (hour < 20) {
      baseMealType = '석식';
    } else {
      baseDayIndex = 1;
      baseMealType = schoolMealTypes[0];
    }

    const ensureSupported = (dayIndex, mealType) => {
      if (schoolMealTypes.includes(mealType)) {
        return { dayIndex, mealType };
      }
      for (let i = 0; i < allTypes.length; i++) {
        const t = allTypes[i];
        if (schoolMealTypes.includes(t)) {
          return { dayIndex, mealType: t };
        }
      }
      return { dayIndex, mealType: schoolMealTypes[0] };
    };

    const start = ensureSupported(baseDayIndex, baseMealType);

    const slots = [];
    let dayIndex = start.dayIndex;
    let typeIndex = schoolMealTypes.indexOf(start.mealType);
    if (typeIndex < 0) typeIndex = 0;

    while (slots.length < 3) {
      if (dayIndex > 2) break;

      const mealType = schoolMealTypes[typeIndex];
      const dayData = mealData[dayIndex];
      const menus = dayData && dayData[mealType] ? dayData[mealType] : [];

      slots.push({ dayIndex, mealType, menus });

      typeIndex += 1;
      if (typeIndex >= schoolMealTypes.length) {
        typeIndex = 0;
        dayIndex += 1;
      }
    }

    while (slots.length < 3) {
      slots.push({ dayIndex: 2, mealType: schoolMealTypes[0], menus: [] });
    }

    return slots;
  };

  const mealSlots = getCurrentSlots();
  const weekdayLabels = ['월', '화', '수', '목', '금'];
  const getDayBadge = (dayIndex) => {
    const date = new Date();
    date.setDate(date.getDate() + dayIndex);
    const day = date.getDay();
    return `${weekdayLabels[day]}`;
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
          </View>
        </View>

        {/* 급식 카드 */}
        <View style={styles.mealCardBlock}>
          <View style={styles.mealSectionCard}>
            <View style={styles.mealSectionHeader}>
              <Text style={styles.mealSectionTitle}>급식</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation?.navigate('MealCalendar')}
              >
                <Text style={styles.mealSectionMore}>자세히 →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mealSlotsRow}>
              {mealSlots.map((slot, index) => (
                <View
                  key={`${slot.dayIndex}-${slot.mealType}-${index}`}
                  style={[
                    styles.mealSlot,
                    index === mealSlots.length - 1 && styles.mealSlotLast,
                  ]}
                >
                  <View style={styles.mealCard}>
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
                        <Text style={styles.mealSlotBadgeText}>{getDayBadge(slot.dayIndex)}</Text>
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
              ))}
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


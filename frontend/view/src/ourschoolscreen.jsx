import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import StudyGrassMap from '../../components/studygrassmap';
import { api } from '../../utils/api';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createOurSchoolStyles } from '../../styles/school.style';

const OurSchoolScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createOurSchoolStyles(normalize), [normalize]);
  const [schoolInfo, setSchoolInfo] = useState({
    name: '진관고등학교',
    location: '서울 은평구 진관동',
    studentCount: 532,
    postCount: 525,
    mailCount: 525,
  });
  const [popularPosts, setPopularPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchSchool = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/schools/me');
        if (!mounted) return;
        const data = res.data?.data;
        if (data) {
          setSchoolInfo({
            name: data.name ?? '',
            location: data.address || data.region || '',
            studentCount: data.studentCount ?? 0,
            postCount: data.postCount ?? 0,
            mailCount: data.mailCount ?? 0,
          });

          try {
            const postsRes = await api.get('/api/posts', {
              params: {
                boardType: 'school',
                schoolId: data.id,
                sort: 'popular',
                page: 1,
                limit: 5,
              },
            });
            if (!mounted) return;
            const apiPosts = postsRes.data?.data?.posts || [];
            const mapped = apiPosts.map((p) => ({
              id: p.id,
              title: (p.content || '').split('\n')[0].slice(0, 40) || '제목 없음',
              type: 'post',
              likes: p.like_count,
              comments: p.comment_count,
            }));
            setPopularPosts(mapped);
          } catch (err) {
            console.error('학교 인기 게시글 로드 실패:', err);
          }
        }
      } catch (error) {
        console.error('학교 정보 로드 실패:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSchool();
    return () => {
      mounted = false;
    };
  }, []);

  // 학교가 제공하는 끼니 종류 (학교마다 다름)
  const schoolMealTypes = ['중식', '석식']; // 예시

  // 날짜별 끼니 메뉴 (0 = 오늘, 1 = 내일, 2 = 모레)
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
  const weekdayLabels = ['월', '화', '수', '목', '금', '토', '일'];
  const getDayBadge = (dayIndex) => {
    const date = new Date();
    date.setDate(date.getDate() + dayIndex);
    const day = date.getDay();
    return `${weekdayLabels[day]}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 학교 정보 카드 — 풀 너비 단독 */}
        <View style={styles.schoolCardBlock}>
          <View style={styles.schoolCard}>
            <View style={styles.schoolNameRow}>
              <Text style={styles.schoolName}>{schoolInfo.name}</Text>
            </View>
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={normalize(14)} color={colors.textSecondary} />
              <Text style={styles.locationText}>{schoolInfo.location}</Text>
            </View>
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

        {/* 급식 카드 (상단 타이틀 박스 안에 3개 슬롯 수평 배치) */}
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

        {/* 게시판 / 우편함 바로가기 */}
        <View style={styles.shortcutContainer}>
          <TouchableOpacity
            style={styles.shortcutButton}
            activeOpacity={0.7}
            onPress={() => navigation?.navigate('SchoolBoardAll')}
          >
            <View style={styles.shortcutTopRow}>
              <Ionicons name="chatbubbles" size={normalize(22)} color={colors.primary} />
              <Text style={styles.shortcutTitle}>학교 게시판</Text>
            </View>
            <Text style={styles.shortcutSubtitle}>→ 보러 가기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutButton}
            activeOpacity={0.7}
            onPress={() => navigation?.navigate('SchoolMailbox')}
          >
            <View style={styles.shortcutTopRow}>
              <Ionicons name="mail" size={normalize(22)} color={colors.primary} />
              <Text style={styles.shortcutTitle}>학교 우편함</Text>
            </View>
            <Text style={styles.shortcutSubtitle}>→ 보러 가기</Text>
          </TouchableOpacity>
        </View>

        {/* 실시간 인기 */}
        <View style={styles.popularSection}>
          <View style={styles.popularHeader}>
            <Ionicons name="flame" size={normalize(20)} color={colors.alert} />
            <Text style={styles.popularTitle}>실시간 인기</Text>
          </View>

          {popularPosts.length > 0 ? (
            popularPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.popularItem}
                activeOpacity={0.7}
                onPress={() =>
                  navigation?.navigate('BoardDetail', {
                    post: {
                      id: post.id,
                      author: '익명',
                      time: '',
                      location: '',
                      content: '',
                      likes: post.likes,
                      comments: post.comments,
                    },
                    isMyPost: false,
                  })
                }
              >
                <View style={styles.popularItemLeft}>
                  <Ionicons
                    name="chatbubble-ellipses"
                    size={18}
                    color="#4CAF50"
                  />
                  <Text style={styles.popularItemTitle}>{post.title}</Text>
                </View>

                <View style={styles.popularItemRight}>
                  {post.likes > 0 && (
                    <View style={styles.countBadge}>
                      <Ionicons name="heart-outline" size={14} color="#FF6B6B" />
                      <Text style={styles.countText}>{post.likes}</Text>
                    </View>
                  )}
                  <View style={styles.countBadge}>
                    <Ionicons name="chatbubble-outline" size={14} color="#FFA726" />
                    <Text style={styles.countText}>{post.comments}</Text>
                  </View>
                  <Ionicons
                    name="bookmark-outline"
                    size={normalize(14)}
                    color={colors.scrap}
                  />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#999' }}>
                아직 인기 게시글이 없습니다.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default OurSchoolScreen;
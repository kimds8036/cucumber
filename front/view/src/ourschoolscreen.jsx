import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { api } from '../../utils/api';
import { colors, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createOurSchoolStyles } from '../../styles/school.style';
import StudyGrassMap from '../../components/studygrassmap';
import Skeleton from '../../components/common/Skeleton';
import { useGuidePreview } from '../../context/GuidePreviewContext';
import { GuideFocusTarget } from '../../components/guide/GuideFocusTarget';
import { GUIDE_FOCUS_TARGETS as T } from '../../src/screens/UserGuide/guideFocusTargets';
import {
  getGuideSchoolInfo,
  getGuideSchoolMeals,
  getGuideStudyGrassDays,
} from '../../src/screens/UserGuide/guidePreviewData';

const OurSchoolScreen = ({ navigation }) => {
  const { isGuidePreview, guideSchoolScrollTo } = useGuidePreview();
  const scrollRef = useRef(null);
  const SCHOOL_CACHE_KEY = '@our_school_screen_cache_v1';
  const MEAL_CACHE_KEY_PREFIX = '@our_school_meal_cache_v1_';
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createOurSchoolStyles(normalize), [normalize]);
  const [schoolInfo, setSchoolInfo] = useState({
    id: null,
    name: '',
    location: '',
    studentCount: 0,
    postCount: 0,
    mailCount: 0,
    eduOfficeCode: '',
    adminStandardCode: '',
  });
  const [popularPosts, setPopularPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mealLoading, setMealLoading] = useState(false);
  const [nextMeals, setNextMeals] = useState([]);
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
    const diffDays =
      Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    return diffDays;
  };

  const isFreshCache = (ts) => {
    if (!ts) return false;
    return Date.now() - Number(ts) < CACHE_TTL_MS;
  };

  const applyGuideScroll = useCallback(() => {
    if (!isGuidePreview || guideSchoolScrollTo !== 'shortcuts') return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    });
  }, [isGuidePreview, guideSchoolScrollTo]);

  useEffect(() => {
    applyGuideScroll();
  }, [applyGuideScroll, schoolInfo.name, grassDays.length, nextMeals.length]);

  useEffect(() => {
    let mounted = true;

    const fetchSchool = async () => {
      if (isGuidePreview) {
        setSchoolInfo(getGuideSchoolInfo());
        setPopularPosts([]);
        setLoading(false);
        return;
      }
      let usedCache = false;
      try {
        setLoading(true);
        const cachedRaw = await AsyncStorage.getItem(SCHOOL_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached?.ts && isFreshCache(cached.ts)) {
            if (cached.schoolInfo) setSchoolInfo(cached.schoolInfo);
            if (Array.isArray(cached.popularPosts))
              setPopularPosts(cached.popularPosts);
            usedCache = true;
            if (mounted) setLoading(false);
          }
        }
        const res = await api.get('/api/schools/me');
        if (!mounted) return;
        const data = res.data?.data;
        if (data) {
          const nextSchoolInfo = {
            id: data.id ?? null,
            name: data.name ?? '',
            location: data.address || data.region || '',
            studentCount: data.studentCount ?? 0,
            postCount: data.postCount ?? 0,
            mailCount: data.mailCount ?? 0,
            eduOfficeCode: data.eduOfficeCode || data.edu_office_code || '',
            adminStandardCode:
              data.adminStandardCode || data.admin_standard_code || '',
          };
          setSchoolInfo(nextSchoolInfo);

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
              title:
                (p.content || '').split('\n')[0].slice(0, 40) || '제목 없음',
              type: 'post',
              likes: p.like_count,
              comments: p.comment_count,
              scrapCount: p.scrapCount ?? 0,
            }));
            setPopularPosts(mapped);
            await AsyncStorage.setItem(
              SCHOOL_CACHE_KEY,
              JSON.stringify({
                ts: Date.now(),
                schoolInfo: nextSchoolInfo,
                popularPosts: mapped,
              }),
            );
          } catch (err) {
            console.error('학교 인기 게시글 로드 실패:', err);
          }
        }
      } catch (error) {
        console.error('학교 정보 로드 실패:', error);
      } finally {
        if (mounted && !usedCache) setLoading(false);
      }
    };

    fetchSchool();
    return () => {
      mounted = false;
    };
  }, [isGuidePreview]);

  useEffect(() => {
    let mounted = true;
    const fetchMeals = async () => {
      if (isGuidePreview) {
        setNextMeals(getGuideSchoolMeals());
        setMealLoading(false);
        return;
      }
      if (!schoolInfo.id) {
        setNextMeals([]);
        return;
      }
      const mealCacheKey = `${MEAL_CACHE_KEY_PREFIX}${schoolInfo.id}`;
      let usedCache = false;
      try {
        setMealLoading(true);
        const cachedRaw = await AsyncStorage.getItem(mealCacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (
            cached?.ts &&
            isFreshCache(cached.ts) &&
            Array.isArray(cached.meals)
          ) {
            setNextMeals(cached.meals);
            usedCache = true;
            if (mounted) setMealLoading(false);
          }
        }
        const res = await api.get('/api/schools/me/meals/next', {
          params: { count: 3 },
        });
        if (!mounted) return;
        const rows = res.data?.data?.meals || [];
        const meals = Array.isArray(rows) ? rows : [];
        setNextMeals(meals);
        await AsyncStorage.setItem(
          mealCacheKey,
          JSON.stringify({ ts: Date.now(), meals }),
        );
      } catch (e) {
        if (mounted) setNextMeals([]);
      } finally {
        if (mounted && !usedCache) setMealLoading(false);
      }
    };
    fetchMeals();
    return () => {
      mounted = false;
    };
  }, [schoolInfo.id, isGuidePreview]);

  useEffect(() => {
    let mounted = true;
    const fetchStudyGrass = async () => {
      if (isGuidePreview) {
        setGrassDays(getGuideStudyGrassDays());
        return;
      }
      try {
        const res = await api.get('/api/schools/me/study-grass', {
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
      } catch (error) {
        if (mounted) setGrassDays([]);
      }
    };
    fetchStudyGrass();
    return () => {
      mounted = false;
    };
  }, [isGuidePreview]);

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

  const showInitialSkeleton =
    loading &&
    !schoolInfo.name &&
    popularPosts.length === 0 &&
    nextMeals.length === 0 &&
    grassDays.length === 0;

  if (showInitialSkeleton) {
    return (
      <View style={styles.container}>
        <View
          style={{
            paddingHorizontal: normalize(16),
            paddingTop: normalize(12),
          }}
        >
          <Skeleton
            width="100%"
            height={normalize(130)}
            borderRadius={normalize(14)}
            style={{ marginBottom: normalize(12) }}
          />
          <Skeleton
            width="100%"
            height={normalize(180)}
            borderRadius={normalize(14)}
            style={{ marginBottom: normalize(12) }}
          />
          <Skeleton
            width="100%"
            height={normalize(140)}
            borderRadius={normalize(14)}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!isGuidePreview}
        onContentSizeChange={applyGuideScroll}
      >
        {/* 학교 정보 카드 — 풀 너비 단독 */}
        <View style={styles.schoolCardBlock}>
          <View style={styles.schoolCard}>
            {loading ? (
              <View
                style={{ minHeight: normalize(110), justifyContent: 'center' }}
              >
                <View
                  style={{
                    height: normalize(18),
                    width: '45%',
                    backgroundColor: colors.disabled,
                    borderRadius: 6,
                    marginBottom: 10,
                  }}
                />
                <View
                  style={{
                    height: normalize(14),
                    width: '65%',
                    backgroundColor: colors.surface,
                    borderRadius: 6,
                    marginBottom: 12,
                  }}
                />
                <View style={styles.schoolInfoDivider} />
                <View style={styles.statsContainer}>
                  {[0, 1, 2].map((idx) => (
                    <View key={idx} style={styles.statItem}>
                      <View
                        style={{
                          height: normalize(16),
                          width: normalize(58),
                          backgroundColor: colors.surface,
                          borderRadius: 6,
                        }}
                      />
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
                  <Ionicons
                    name="location-outline"
                    size={normalize(14)}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.locationText}>{schoolInfo.location}</Text>
                </View>
                <View style={styles.schoolInfoDivider} />
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <View style={styles.statValueContainer}>
                      <Ionicons
                        name="person"
                        size={normalize(18)}
                        color={colors.primary}
                      />
                      <Text style={styles.statValue}>
                        {schoolInfo.studentCount}명
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statItem}>
                    <View style={styles.statValueContainer}>
                      <Ionicons
                        name="chatbubbles"
                        size={normalize(18)}
                        color={colors.primary}
                      />
                      <Text style={styles.statValue}>
                        {schoolInfo.postCount}개
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statItem}>
                    <View style={styles.statValueContainer}>
                      <Ionicons
                        name="mail"
                        size={normalize(18)}
                        color={colors.primary}
                      />
                      <Text style={styles.statValue}>
                        {schoolInfo.mailCount}개
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* 급식 카드 (상단 타이틀 박스 안에 3개 슬롯 수평 배치) */}
        <View style={styles.mealCardBlock}>
          <View style={styles.mealSectionCard}>
            <View style={styles.mealSectionHeader}>
              <Text style={styles.mealSectionTitle}>급식</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  navigation?.navigate('MealCalendar', {
                    schoolId: schoolInfo.id,
                    schoolName: schoolInfo.name,
                  })
                }
              >
                <Text style={styles.mealSectionMore}>자세히 →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mealSlotsRow}>
              {mealLoading
                ? [0, 1, 2].map((idx) => (
                    <View
                      key={`meal-skeleton-${idx}`}
                      style={[
                        styles.mealSlot,
                        idx === 2 && styles.mealSlotLast,
                      ]}
                    >
                      <View
                        style={[styles.mealCard, { minHeight: normalize(96) }]}
                      >
                        <View style={styles.mealSlotHeader}>
                          <View style={styles.mealSlotTitleRow}>
                            <View
                              style={{
                                height: normalize(fontSizes.xl),
                                width: '58%',
                                backgroundColor: colors.disabled,
                                borderRadius: 6,
                              }}
                            />
                          </View>
                          <View style={styles.mealSlotBadge}>
                            <View
                              style={{
                                height: normalize(fontSizes.lg),
                                width: normalize(32),
                                backgroundColor: colors.border,
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
                                backgroundColor: colors.surface,
                                borderRadius: 4,
                              }}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                  ))
                : mealSlots.map((slot, index) => (
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
                        <View
                          style={[
                            styles.mealCard,
                            { minHeight: normalize(96) },
                          ]}
                        >
                          <View style={styles.mealSlotHeader}>
                            <View style={styles.mealSlotTitleRow}>
                              <Text style={styles.mealSlotTitle}>
                                {slot.mealType}
                              </Text>
                            </View>
                            <View style={styles.mealSlotBadge}>
                              <Text style={styles.mealSlotBadgeText}>
                                {getDayBadge(slot.ymd)}
                              </Text>
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
                              <Text style={styles.mealSlotEmptyText}>
                                정보 없음
                              </Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ))}
            </View>
          </View>
        </View>

        {/* 공부 잔디 카드 */}
        <GuideFocusTarget name={T.SCHOOL_GRASS_CARD} style={styles.grassCard}>
          <Text style={styles.grassCardTitle}>우리 학교 공부 잔디밭</Text>
          <StudyGrassMap days={grassDays} />
        </GuideFocusTarget>

        {/* 게시판 / 우편함 바로가기 */}
        <View style={styles.shortcutContainer}>
          <GuideFocusTarget
            name={T.SCHOOL_SHORTCUT_BOARD}
            style={styles.shortcutButton}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={0.7}
              onPress={() => navigation?.navigate('SchoolBoardAll')}
            >
            <View style={styles.shortcutTopRow}>
              <Ionicons
                name="chatbubbles"
                size={normalize(22)}
                color={colors.primary}
              />
              <Text style={styles.shortcutTitle}>학교 게시판</Text>
            </View>
            <Text style={styles.shortcutSubtitle}>→ 보러 가기</Text>
            </TouchableOpacity>
          </GuideFocusTarget>

          <GuideFocusTarget
            name={T.SCHOOL_SHORTCUT_MAIL}
            style={styles.shortcutButton}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={0.7}
              onPress={() =>
                navigation?.navigate('SchoolMailbox', {
                  schoolId: schoolInfo.id,
                  schoolName: schoolInfo.name,
                })
              }
            >
            <View style={styles.shortcutTopRow}>
              <Ionicons
                name="mail"
                size={normalize(22)}
                color={colors.primary}
              />
              <Text style={styles.shortcutTitle}>학교 우편함</Text>
            </View>
            <Text style={styles.shortcutSubtitle}>→ 보러 가기</Text>
            </TouchableOpacity>
          </GuideFocusTarget>
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
                    color={colors.primary}
                  />
                  <Text style={styles.popularItemTitle}>{post.title}</Text>
                </View>

                <View style={styles.popularItemRight}>
                  <View style={styles.countBadge}>
                    <Ionicons
                      name="heart-outline"
                      size={14}
                      color={colors.alert}
                    />
                    <Text style={styles.countText}>{post.likes ?? 0}</Text>
                  </View>
                  <View style={styles.countBadge}>
                    <Ionicons
                      name="chatbubble-outline"
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={styles.countText}>{post.comments ?? 0}</Text>
                  </View>
                  <View style={styles.countBadge}>
                    <Ionicons
                      name="bookmark-outline"
                      size={normalize(14)}
                      color={colors.scrap}
                    />
                    <Text style={styles.countText}>{post.scrapCount ?? 0}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text
                style={{
                  fontSize: normalize(fontSizes.md),
                  color: colors.textSecondary,
                }}
              >
                아직 인기 게시글이 없습니다.
              </Text>
            </View>
          )}
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
                    <Text style={styles.mealModalEmptyText}>정보 없음</Text>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default OurSchoolScreen;

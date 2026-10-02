import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/search.style';
import { createSearchResultStyles } from '../../styles/result.style';
import { createBoardStyles } from '../../styles/board.style';
import { api } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Skeleton from '../../components/common/Skeleton';
import TopAdBanner from '../../components/ads/TopAdBanner';
import BoardPostCard from '../../components/Boardpostcard';
import BoardPostCardSkeleton from '../../components/board/BoardPostCardSkeleton';
import SearchSubHeader from '../frame/SearchSubHeader';
import { getSchoolMailFromLabel } from './utils/schoolMailFromLabel';

const TABS_FOR_TEXT = [
  '전체',
  '전체게시판',
  '학생게시판',
  '학교게시판',
  '학교우편함',
];
const TABS_FOR_HASHTAG = [
  '전체',
  '전체게시판',
  '학생게시판',
  '학교게시판',
  '학교우편함',
];
const RECENT_KEY = '@search_recent_keywords';
const SECTIONS_WITH_EXTRA_GAP = [
  '전체게시판',
  '학생게시판',
  '학교게시판',
  '학교우편함',
];
const SECTION_BY_BOARD_TYPE = {
  national: '전체게시판',
  student: '학생게시판',
  school: '학교게시판',
};
const MAIL_SECTION = '학교우편함';

/** 레이아웃 확인용. 크기에 영향 없는 outline·글자 배경만 쓴다. 확인 후 false */
const SHOW_LAYOUT_BORDERS = __DEV__ && false;
const debugBox = (color = '#FF3B30') =>
  SHOW_LAYOUT_BORDERS
    ? { outlineWidth: 1, outlineStyle: 'solid', outlineColor: color }
    : null;
const debugText = (color = '#007AFF') =>
  SHOW_LAYOUT_BORDERS ? { backgroundColor: `${color}33` } : null;

function normalizeSearchText(q) {
  return String(q ?? '').trim();
}

function parseSearchIntent(rawQuery) {
  const raw = normalizeSearchText(rawQuery);
  const isHashtag = raw.startsWith('#');
  const keyword = isHashtag ? raw.replace(/^#+/, '').trim() : raw;
  return { raw, isHashtag, keyword };
}

function getTagLabels(item) {
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  return tags
    .map((tag) =>
      tag != null && typeof tag === 'object'
        ? String(tag.name ?? '').trim()
        : String(tag ?? '').trim(),
    )
    .filter(Boolean);
}

function includesIgnoreCase(text, query) {
  return String(text ?? '')
    .toLowerCase()
    .includes(String(query ?? '').toLowerCase());
}

function getLikeCount(item) {
  const count = item?.likeCount ?? item?.like_count ?? 0;
  return Number.isFinite(Number(count)) ? Number(count) : 0;
}

function getCommentCount(item) {
  const count = item?.commentCount ?? item?.comment_count ?? 0;
  return Number.isFinite(Number(count)) ? Number(count) : 0;
}

function getTimeText(item) {
  return formatTimeAgo(item?.createdAt ?? item?.created_at);
}

// BoardAll / boardDetail 과 동일한 created_at → 한국 기준 상대 시간 포맷
function formatTimeAgo(createdAt) {
  if (!createdAt) return '';
  let dateStr =
    typeof createdAt === 'string' ? createdAt.trim() : String(createdAt);
  if (!dateStr) return '';
  if (
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dateStr) &&
    !/[Z+-]/.test(dateStr)
  ) {
    dateStr = dateStr.replace(' ', 'T') + 'Z';
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

const SNIPPET_LEAD_CHARS = 20;

/** 검색어가 카드 3줄 안에 보이도록 검색어 앞 SNIPPET_LEAD_CHARS자 전부터 자른다 */
function makeSnippet(content, query) {
  const text = String(content ?? '');
  const q = String(query ?? '').trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx <= SNIPPET_LEAD_CHARS) return text;
  const lineStart = text.lastIndexOf('\n', idx - 1) + 1;
  const start = Math.max(idx - SNIPPET_LEAD_CHARS, lineStart);
  return start > 0 ? `…${text.slice(start)}` : text;
}

/** 검색 응답 게시글·우편 → BoardPostCard가 읽는 모양 */
function mapResultForCard(item, isMail, snippetQuery) {
  return {
    id: item.id,
    content: makeSnippet(item.content, snippetQuery),
    time: getTimeText(item),
    likes: getLikeCount(item),
    comments: getCommentCount(item),
    scrapCount: isMail ? 0 : Number(item.scrapCount) || 0,
    tags: isMail ? [] : item.tags,
    thumbnail: isMail ? null : item.thumbnail,
    fromLabel: isMail ? getSchoolMailFromLabel(item, item.schoolId) : '',
  };
}

export default function SearchResult({ route, navigation }) {
  const initialFromRoute = normalizeSearchText(route?.params?.query ?? '');
  const initialSearchType = normalizeSearchText(
    route?.params?.searchType ?? '',
  ).toLowerCase();
  const initialForcedHashtag = initialSearchType === 'hashtag';
  const [searchText, setSearchText] = useState(initialFromRoute);
  const [committedQuery, setCommittedQuery] = useState(initialFromRoute);
  const [forceHashtagMode, setForceHashtagMode] =
    useState(initialForcedHashtag);
  const [mode, setMode] = useState('result'); // 'input' | 'result'
  const [activeTab, setActiveTab] = useState('전체');
  const [sections, setSections] = useState({});
  const [matchedSchools, setMatchedSchools] = useState([]);
  const [schoolMails, setSchoolMails] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitialRenderReady, setIsInitialRenderReady] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [recommendedTags, setRecommendedTags] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const searchIntent = useMemo(() => {
    const parsed = parseSearchIntent(committedQuery);
    if (!forceHashtagMode) {
      return parsed;
    }
    return {
      ...parsed,
      isHashtag: true,
    };
  }, [committedQuery, forceHashtagMode]);
  const activeTabs = useMemo(
    () =>
      (searchIntent.isHashtag ? TABS_FOR_HASHTAG : TABS_FOR_TEXT).filter(
        (tab) => tab === '전체' || (sections[tab] || []).length > 0,
      ),
    [searchIntent.isHashtag, sections],
  );

  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const s = useMemo(() => createSearchResultStyles(normalize, width), [normalize, width]);

  const boardStyles = useMemo(
    () => createBoardStyles(width, normalize),
    [width, normalize],
  );

  const renderResultCard = (section, item) => {
    const isMail = section === MAIL_SECTION;
    const highlightQuery = searchIntent.isHashtag ? '' : normalizedQuery;
    const card = mapResultForCard(item, isMail, highlightQuery);
    return (
      <View key={item.id} style={[s.cardGutter, debugBox('#AF52DE')]}>
        <BoardPostCard
          post={card}
          normalize={normalize}
          styles={boardStyles}
          authorLabel={card.fromLabel}
          hideDistanceBadge
          highlightQuery={highlightQuery}
          highlightStyle={s.highlightText}
          onPress={() => {
            if (isMail) {
              navigation.navigate('SchoolMailDetail', {
                mailId: item.id,
                schoolId: item.schoolId,
                schoolName: item.schoolName,
              });
              return;
            }
            navigation.navigate('BoardDetail', {
              postId: item.id,
              fromSearch: true,
            });
          }}
        />
      </View>
    );
  };

  const normalizedQuery = searchIntent.keyword;

  const saveRecent = async (list) => {
    try {
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  };

  const fetchSearch = async (nextPage = 1, options = {}) => {
    const { markInitialReady = false } = options;
    if (!normalizedQuery) return;
    try {
      console.log('[SearchResult] fetchSearch called', {
        query: normalizedQuery,
        page: nextPage,
        mode,
      });
      setLoading(true);
      const res = await api.get('/api/search/posts', {
        params: {
          query: committedQuery,
          page: nextPage,
          limit: 20,
          searchType: searchIntent.isHashtag ? 'hashtag' : 'text',
        },
      });
      const data = res.data?.data || {};
      const posts = Array.isArray(data.posts) ? data.posts : [];
      const mails = Array.isArray(data.schoolMails) ? data.schoolMails : [];
      const filteredPosts = searchIntent.isHashtag
        ? posts
        : posts.filter((post) =>
            includesIgnoreCase(post?.content, normalizedQuery),
          );
      const filteredMails = searchIntent.isHashtag
        ? []
        : mails.filter((mail) =>
            includesIgnoreCase(mail?.content, normalizedQuery),
          );
      setMatchedSchools(
        searchIntent.isHashtag
          ? []
          : Array.isArray(data.matchedSchools)
            ? data.matchedSchools
            : [],
      );

      const nextSections = nextPage === 1 ? {} : { ...sections };
      filteredPosts.forEach((p) => {
        const key = SECTION_BY_BOARD_TYPE[p.boardType] ?? '전체게시판';
        if (!nextSections[key]) nextSections[key] = [];
        nextSections[key].push(p);
      });
      if (nextPage === 1 && !searchIntent.isHashtag) {
        if (filteredMails.length > 0) {
          nextSections[MAIL_SECTION] = filteredMails;
        }
      } else if (!searchIntent.isHashtag && filteredMails.length > 0) {
        const prevMails = nextSections[MAIL_SECTION] || [];
        nextSections[MAIL_SECTION] = [...prevMails, ...filteredMails];
      }

      setSections(nextSections);
      setPage(nextPage);
      setHasMore(!!data.pagination?.hasMore);
    } catch (e) {
      console.error('검색 결과 조회 실패:', e?.response?.data || e.message);
    } finally {
      setLoading(false);
      if (markInitialReady) {
        setIsInitialRenderReady(true);
      }
    }
  };

  useEffect(() => {
    // 최근 검색어 로드
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecentSearches(parsed);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setTrendingLoading(true);
        const res = await api.get('/api/search/trending', {
          params: { limit: 10 },
        });
        const hashtags = Array.isArray(res?.data?.data?.hashtags)
          ? res.data.data.hashtags
          : [];
        const tags = hashtags
          .map((tag) =>
            String(tag || '')
              .trim()
              .replace(/^#+/, ''),
          )
          .filter(Boolean);
        setRecommendedTags(tags);
      } catch {
        setRecommendedTags([]);
      } finally {
        setTrendingLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const q = normalizeSearchText(route?.params?.query ?? '');
    const routeSearchType = normalizeSearchText(
      route?.params?.searchType ?? '',
    ).toLowerCase();
    const isForcedHashtag = routeSearchType === 'hashtag';
    setSearchText(q);
    setCommittedQuery(q);
    setForceHashtagMode(isForcedHashtag);
  }, [route?.params?.query, route?.params?.searchType]);

  useEffect(() => {
    if (!activeTabs.includes(activeTab)) {
      setActiveTab('전체');
    }
  }, [activeTab, activeTabs]);

  useEffect(() => {
    if (!normalizedQuery) {
      setIsInitialRenderReady(true);
      return;
    }
    console.log('[SearchResult] normalizedQuery changed, trigger search', {
      query: normalizedQuery,
    });
    setIsInitialRenderReady(false);
    setSections({});
    setMatchedSchools([]);
    setPage(1);
    setMode('result');
    fetchSearch(1, { markInitialReady: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedQuery]);

  const hasResults = useMemo(
    () =>
      matchedSchools.length > 0 ||
      Object.values(sections).some((v) => v.length > 0),
    [sections, matchedSchools],
  );

  /** 현재 탭 스크롤에 실제로 보이는 결과가 있을 때만 하단 안내 표시 */
  const hasVisibleResultsInTab = useMemo(() => {
    if (activeTab === '전체') return hasResults;
    return (sections[activeTab] || []).length > 0;
  }, [activeTab, hasResults, sections]);

  const sortedSections = useMemo(
    () => Object.entries(sections).sort(([, a], [, b]) => b.length - a.length),
    [sections],
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={s.container} edges={['top']}>
        <KeyboardAvoidingView
          style={s.flexOne}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SearchSubHeader
            onBack={() => {
              if (mode === 'input') {
                setSearchText(normalizeSearchText(committedQuery));
                setMode('result');
              } else {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Main' }],
                });
              }
            }}
            value={searchText}
            onChangeText={(t) => setSearchText(t)}
            onFocus={() => {
              const q = normalizeSearchText(searchText || committedQuery);
              navigation.navigate('SearchScreen', {
                query: q,
                focusInput: true,
              });
            }}
            onSubmit={() => {
              const q = normalizeSearchText(searchText);
              if (!q) return;
              if (forceHashtagMode && !q.startsWith('#')) return;
              setCommittedQuery(q);
              setSearchText(q);
              setMode('result');
              setRecentSearches((prev) => {
                const filtered = prev.filter((item) => item !== q);
                const next = [q, ...filtered].slice(0, 10);
                saveRecent(next);
                return next;
              });
            }}
            autoFocus={false}
            showClear={false}
            placeholder="검색어를 입력하세요"
          />

          {mode === 'input' && <TopAdBanner />}

          {mode === 'result' && (
            <ScrollView
              style={[s.resultScrollView, debugBox('#8E8E93')]}
              stickyHeaderIndices={[1]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <TopAdBanner />

              {/* 탭 — 맨 위에 닿으면 고정 */}
              <View
                style={[s.tabBar, debugBox('#FF9500')]}
                collapsable={false}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[s.tabContent, debugBox('#34C759')]}
                >
                  {activeTabs.map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[
                          s.tabBtn,
                          isActive && s.tabBtnActive,
                          debugBox(),
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            s.tabText,
                            isActive && s.tabTextActive,
                            debugText(),
                          ]}
                        >
                          {tab}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={debugBox('#5856D6')}>
                {!isInitialRenderReady ? (
                  <View>
                    {[0, 1, 2, 3].map((idx) => (
                      <View
                        key={`search-skel-${idx}`}
                        style={[s.cardGutter, debugBox('#AF52DE')]}
                      >
                        <BoardPostCardSkeleton
                          styles={boardStyles}
                          normalize={normalize}
                        />
                      </View>
                    ))}
                  </View>
                ) : (
                  <>
                    {/* 학교 매칭 카드들 (최대 5개) */}
                    {activeTab === '전체' && matchedSchools.length > 0 && (
                      <View
                        style={[
                          s.section,
                          s.sectionGapAfterSchool,
                          debugBox('#FF2D55'),
                        ]}
                      >
                        <View style={[s.sectionHeader, debugBox('#FF9500')]}>
                          <View style={[s.sectionTitleRow, debugBox('#34C759')]}>
                            <Text style={[s.sectionTitle, debugText()]}>
                              학교
                            </Text>
                          </View>
                          <View style={[s.countBadge, debugBox()]}>
                            <Text style={[s.countBadgeText, debugText()]}>
                              {matchedSchools.length}건
                            </Text>
                          </View>
                        </View>
                        {matchedSchools.map((school) => (
                          <TouchableOpacity
                            key={school.schoolId}
                            style={[s.schoolCard, debugBox('#AF52DE')]}
                            activeOpacity={0.7}
                            onPress={() =>
                              navigation.navigate('OtherSchool', {
                                schoolId: school.schoolId,
                                schoolName: school.name,
                              })
                            }
                          >
                            <View style={[s.schoolIconBox, debugBox()]}>
                              <Ionicons
                                name="school-outline"
                                size={normalize(16)}
                                color={colors.textLight4}
                              />
                            </View>
                            <Text style={[s.schoolName, debugText()]}>
                              {school.name}
                            </Text>
                            <Ionicons
                              name="chevron-forward"
                              size={normalize(16)}
                              color={colors.textLight2}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* 전체 탭 */}
                    {activeTab === '전체' &&
                      sortedSections.map(([section, items]) => (
                        <View
                          key={section}
                          style={[
                            s.section,
                            SECTIONS_WITH_EXTRA_GAP.includes(section) &&
                              s.sectionGapBetweenTargetSections,
                            debugBox('#FF2D55'),
                          ]}
                        >
                          <View style={[s.sectionHeader, debugBox('#FF9500')]}>
                            <View
                              style={[s.sectionTitleRow, debugBox('#34C759')]}
                            >
                              <Text style={[s.sectionTitle, debugText()]}>
                                {section}
                              </Text>
                            </View>
                            <View style={[s.countBadge, debugBox()]}>
                              <Text style={[s.countBadgeText, debugText()]}>
                                {items.length}건
                              </Text>
                            </View>
                          </View>

                          {items
                            .slice(0, 3)
                            .map((item) => renderResultCard(section, item))}

                          {items.length > 3 && (
                            <TouchableOpacity
                              style={[s.moreBtn, debugBox()]}
                              onPress={() => setActiveTab(section)}
                              activeOpacity={0.7}
                            >
                              <Text style={[s.moreBtnText, debugText()]}>
                                {section} 결과 더보기
                              </Text>
                              <Ionicons
                                name="chevron-forward"
                                size={normalize(13)}
                                color={colors.textLight4}
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}

                    {/* 개별 탭 */}
                    {activeTab !== '전체' &&
                      sections[activeTab] &&
                      sections[activeTab].length > 0 && (
                        <View style={[s.section, debugBox('#FF2D55')]}>
                          {sections[activeTab].map((item) =>
                            renderResultCard(activeTab, item),
                          )}
                        </View>
                      )}

                    {/* 로딩 */}
                    {loading && (
                      <View style={[s.centerBox, debugBox()]}>
                        <Skeleton
                          width={normalize(16)}
                          height={normalize(16)}
                          borderRadius={normalize(8)}
                        />
                      </View>
                    )}

                    {/* 결과 없음 */}
                    {!loading && !hasResults && (
                      <View style={[s.emptyBox, debugBox('#FF2D55')]}>
                        <View style={[s.emptyIconBox, debugBox()]}>
                          <Ionicons
                            name="search-outline"
                            size={normalize(26)}
                            color={colors.textLight2}
                          />
                        </View>
                        <Text style={[s.emptyTitle, debugText()]}>
                          검색 결과가 없습니다
                        </Text>
                        <Text style={[s.emptyDesc, debugText()]}>
                          다른 검색어로 다시 시도해보세요
                        </Text>
                      </View>
                    )}

                    {/* 결과 있음 + 마지막 페이지: 안내 */}
                    {!loading && hasVisibleResultsInTab && !hasMore && (
                      <View style={[s.endOfResultsBox, debugBox()]}>
                        <Text style={[s.endOfResultsText, debugText()]}>
                          검색 결과를 모두 확인했습니다
                        </Text>
                      </View>
                    )}

                    {/* 더 불러오기 */}
                    {hasMore && !loading && (
                      <View style={[s.centerBox, debugBox()]}>
                        <TouchableOpacity
                          style={[s.loadMoreBtn, debugBox('#FF9500')]}
                          onPress={() => fetchSearch(page + 1)}
                          activeOpacity={0.7}
                        >
                          <Text style={[s.loadMoreText, debugText()]}>
                            더 불러오기
                          </Text>
                          <Ionicons
                            name="chevron-down"
                            size={normalize(14)}
                            color={colors.textLight4}
                            style={s.loadMoreChevron}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                    <View style={[s.scrollBottomSpacer, debugBox('#8E8E93')]} />
                  </>
                )}
              </View>
            </ScrollView>
          )}

          {mode === 'input' && (
            <ScrollView
              style={s.scrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {/* 최근 검색어 */}
              {recentSearches.length > 0 && (
                <View style={s.section}>
                  <View style={s.sectionHeader}>
                    <Text style={s.sectionTitle}>최근 검색어</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setRecentSearches([]);
                        saveRecent([]);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={s.dimAction}>전체 삭제</Text>
                    </TouchableOpacity>
                  </View>
                  {recentSearches.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={s.recentRow}
                      onPress={() => {
                        const q = normalizeSearchText(item);
                        setSearchText(q);
                        setCommittedQuery(q);
                        setMode('result');
                      }}
                      activeOpacity={0.6}
                    >
                      <Ionicons
                        name="time-outline"
                        size={normalize(15)}
                        color={colors.textLight2}
                      />
                      <Text style={s.recentText}>{item}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          const next = recentSearches.filter(
                            (_, i) => i !== index,
                          );
                          setRecentSearches(next);
                          saveRecent(next);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={s.recentDeleteBtn}
                      >
                        <Ionicons
                          name="close"
                          size={normalize(15)}
                          color={colors.textLight2}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* 추천 검색어 태그 */}
              <View style={s.sectionRecommendTags}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>인기 해시태그</Text>
                </View>
                <View style={s.tagRow}>
                  {trendingLoading ? (
                    <Text style={s.dimAction}>불러오는 중...</Text>
                  ) : recommendedTags.length > 0 ? (
                    recommendedTags.map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        style={s.tag}
                        onPress={() => {
                          const q = normalizeSearchText(`#${tag}`);
                          setSearchText(q);
                          setCommittedQuery(q);
                          setMode('result');
                          setRecentSearches((prev) => {
                            const filtered = prev.filter((item) => item !== q);
                            const next = [q, ...filtered].slice(0, 10);
                            saveRecent(next);
                            return next;
                          });
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={s.tagText}># {tag}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('BoardWrite')}
                      activeOpacity={0.7}
                    >
                      <Text style={s.dimAction}>
                        해시태그를 첨부하여 글을 작성해보세요!
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

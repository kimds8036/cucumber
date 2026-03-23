import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';
import { colors } from '../../styles/colors';
import { api } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TABS = ['전체', '전체게시판', '학교게시판', '학교우편'];
const RECENT_KEY = '@search_recent_keywords';

const SECTION_ICON = {
  '전체게시판': 'globe-outline',
  '학교게시판': 'school-outline',
  '개인우편':   'mail-outline',
  '학교우편':   'mail-open-outline',
};

function highlight(text, query) {
  if (!query) return <Text style={s.cardTitle}>{text}</Text>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <Text style={s.cardTitle}>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <Text key={i} style={s.highlightText}>{p}</Text>
        ) : (
          <Text key={i}>{p}</Text>
        )
      )}
    </Text>
  );
}

function highlightFull(text, query) {
  if (!query) return <Text style={s.fullTitle}>{text}</Text>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <Text style={s.fullTitle}>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <Text key={i} style={s.highlightText}>{p}</Text>
        ) : (
          <Text key={i}>{p}</Text>
        )
      )}
    </Text>
  );
}

function makeSnippet(content, query) {
  const text = content || '';
  const q = (query || '').trim();
  if (!q) return text.slice(0, 80);
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx === -1) return text.slice(0, 80);
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + q.length + 20);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

function getTitle(item) {
  return (item.content || '').split('\n')[0] || '제목 없음';
}

// BoardAll / boardDetail 과 동일한 created_at → 한국 기준 상대 시간 포맷
function formatTimeAgo(createdAt) {
  if (!createdAt) return '';
  let dateStr = typeof createdAt === 'string' ? createdAt.trim() : String(createdAt);
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dateStr) && !/[Z+-]/.test(dateStr)) {
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

function formatMeta(item) {
  const parts = [formatTimeAgo(item.createdAt)];
  if (item.likeCount != null) parts.push(`좋아요 ${item.likeCount}`);
  if (item.commentCount != null) parts.push(`댓글 ${item.commentCount}`);
  return parts.join(' · ');
}

export default function SearchResult({ route, navigation }) {
  const routeQuery = route?.params?.query ?? '';
  const [searchText, setSearchText] = useState(routeQuery);
  const [committedQuery, setCommittedQuery] = useState(routeQuery);
  const [mode, setMode] = useState('result'); // 'input' | 'result'
  const [activeTab, setActiveTab] = useState('전체');
  const [expandedSection, setExpandedSection] = useState(null);
  const [sections, setSections] = useState({});
  const [matchedSchools, setMatchedSchools] = useState([]);
  const [schoolMails, setSchoolMails] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  const normalizedQuery = committedQuery.trim();

  const saveRecent = async (list) => {
    try {
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  };

  const fetchSearch = async (nextPage = 1) => {
    if (!normalizedQuery) return;
    try {
      console.log('[SearchResult] fetchSearch called', {
        query: normalizedQuery,
        page: nextPage,
        mode,
      });
      setLoading(true);
      const res = await api.get('/api/search/posts', {
        params: { query: normalizedQuery, page: nextPage, limit: 20 },
      });
      const data = res.data?.data || {};
      const posts = Array.isArray(data.posts) ? data.posts : [];
      const mails = Array.isArray(data.schoolMails) ? data.schoolMails : [];
      setMatchedSchools(Array.isArray(data.matchedSchools) ? data.matchedSchools : []);

      const nextSections = nextPage === 1 ? {} : { ...sections };
      posts.forEach((p) => {
        const key = p.boardType === 'school' ? '학교게시판' : '전체게시판';
        if (!nextSections[key]) nextSections[key] = [];
        nextSections[key].push(p);
      });
      if (nextPage === 1) {
        if (mails.length > 0) {
          nextSections['학교우편'] = mails;
        }
      } else if (mails.length > 0) {
        const prevMails = nextSections['학교우편'] || [];
        nextSections['학교우편'] = [...prevMails, ...mails];
      }

      setSections(nextSections);
      setPage(nextPage);
      setHasMore(!!data.pagination?.hasMore);
    } catch (e) {
      console.error('검색 결과 조회 실패:', e?.response?.data || e.message);
    } finally {
      setLoading(false);
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
    if (!normalizedQuery) return;
    console.log('[SearchResult] normalizedQuery changed, trigger search', {
      query: normalizedQuery,
    });
    setSections({});
    setMatchedSchools([]);
    setPage(1);
    setMode('result');
    fetchSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedQuery]);

  const hasResults = useMemo(
    () => Object.values(sections).some((v) => v.length > 0),
    [sections],
  );

  const sortedSections = useMemo(
    () => Object.entries(sections).sort(([, a], [, b]) => b.length - a.length),
    [sections],
  );

  /* ── 섹션 전체 보기 ── */
  if (expandedSection) {
    const items = sections[expandedSection] || [];
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <SubHeader title={expandedSection} onBack={() => setExpandedSection(null)} />
        <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>
          {items.map((item, idx) => (
            <View
              key={item.id}
              style={[s.fullCard, idx < items.length - 1 && s.fullCardBorder]}
            >
              {highlightFull(getTitle(item), searchText)}
              <Text style={s.fullSnippet}>{makeSnippet(item.content, searchText)}</Text>
              <Text style={s.metaText}>{formatMeta(item)}</Text>
            </View>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ── 기본 검색 결과 + 입력 모드 ── */
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.searchBarWrapper}>
        <View style={s.searchInputRow}>
          <Ionicons name="search-outline" size={18} color="#AAAAAA" />
          <TextInput
            style={s.searchInput}
            placeholder="게시글, 우편함 검색"
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setMode('input')}
            onSubmitEditing={() => {
              const q = searchText.trim();
              if (!q) return;
              setCommittedQuery(q);
              setMode('result');
              setRecentSearches((prev) => {
                const filtered = prev.filter((item) => item !== q);
                const next = [q, ...filtered].slice(0, 10);
                saveRecent(next);
                return next;
              });
            }}
            placeholderTextColor="#BBBBBB"
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={17} color="#CCCCCC" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => {
            if (mode === 'input') {
              // 편집 취소: 이전 검색어로 복원
              setSearchText(committedQuery);
              setMode('result');
            } else {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            }
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginLeft: 10 }}
        >
          <Text style={s.searchCloseText}>닫기</Text>
        </TouchableOpacity>
      </View>

      {mode === 'result' && (
        <>
          {/* 탭 */}
          <View style={s.tabBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.tabContent}
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[s.tabBtn, isActive && s.tabBtnActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.tabText, isActive && s.tabTextActive]}>{tab}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>

        {/* 학교 매칭 카드들 (최대 5개) */}
        {activeTab === '전체' && matchedSchools.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionTitleRow}>
                <Ionicons name="business-outline" size={14} color="#888888" style={{ marginRight: 6 }} />
                <Text style={s.sectionTitle}>학교</Text>
              </View>
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>{matchedSchools.length}건</Text>
              </View>
            </View>
            {matchedSchools.map((school) => (
              <TouchableOpacity
                key={school.schoolId}
                style={s.schoolCard}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('OtherSchool', {
                    schoolId: school.schoolId,
                    schoolName: school.name,
                  })
                }
              >
                <View style={s.schoolIconBox}>
                  <Ionicons name="school-outline" size={18} color="#555555" />
                </View>
                <Text style={s.schoolName}>{school.name}</Text>
                <Ionicons name="chevron-forward" size={16} color="#CCCCCC" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 전체 탭 */}
        {activeTab === '전체' &&
          sortedSections.map(([section, items]) => (
            <View key={section} style={s.section}>
              <View style={s.sectionHeader}>
                <View style={s.sectionTitleRow}>
                  <Ionicons
                    name={SECTION_ICON[section] || 'document-outline'}
                    size={14}
                    color="#888888"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={s.sectionTitle}>{section}</Text>
                </View>
                <View style={s.countBadge}>
                  <Text style={s.countBadgeText}>{items.length}건</Text>
                </View>
              </View>

              {items.slice(0, 3).map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[s.card, idx < Math.min(items.length, 3) - 1 && s.cardBorder]}
                  activeOpacity={0.7}
                  onPress={() => {
                    navigation.navigate('BoardDetail', {
                      postId: item.id,
                      fromSearch: true,
                    });
                  }}
                >
                  {highlight(getTitle(item), searchText)}
                  <Text style={s.cardSnippet} numberOfLines={2}>
                    {makeSnippet(item.content, searchText)}
                  </Text>
                  <Text style={s.metaText}>{formatMeta(item)}</Text>
                </TouchableOpacity>
              ))}

              {items.length > 3 && (
                <TouchableOpacity
                  style={s.moreBtn}
                  onPress={() => setExpandedSection(section)}
                  activeOpacity={0.7}
                >
                  <Text style={s.moreBtnText}>{section} 결과 더보기</Text>
                  <Ionicons name="chevron-forward" size={13} color="#888888" />
                </TouchableOpacity>
              )}
            </View>
          ))}

        {/* 개별 탭 */}
        {activeTab !== '전체' &&
          sections[activeTab] &&
          sections[activeTab].length > 0 && (
            <View style={s.section}>
              {sections[activeTab].map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    s.fullCard,
                    idx < sections[activeTab].length - 1 && s.fullCardBorder,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    navigation.navigate('BoardDetail', {
                      postId: item.id,
                      fromSearch: true,
                    });
                  }}
                >
                  {highlightFull(getTitle(item), searchText)}
                  <Text style={s.fullSnippet}>
                    {makeSnippet(item.content, searchText)}
                  </Text>
                  <Text style={s.metaText}>{formatMeta(item)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

        {/* 로딩 */}
        {loading && (
          <View style={s.centerBox}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {/* 결과 없음 */}
        {!loading && !hasResults && (
          <View style={s.emptyBox}>
            <View style={s.emptyIconBox}>
              <Ionicons name="search-outline" size={26} color="#CCCCCC" />
            </View>
            <Text style={s.emptyTitle}>검색 결과가 없습니다</Text>
            <Text style={s.emptyDesc}>다른 검색어로 다시 시도해보세요</Text>
          </View>
        )}

        {/* 더 불러오기 */}
        {hasMore && !loading && (
          <View style={s.centerBox}>
            <TouchableOpacity
              style={s.loadMoreBtn}
              onPress={() => fetchSearch(page + 1)}
              activeOpacity={0.7}
            >
              <Text style={s.loadMoreText}>더 불러오기</Text>
              <Ionicons name="chevron-down" size={14} color="#666666" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
      </>
      )}

      {mode === 'input' && (
        <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>
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
                  <Text style={s.clearButton}>전체 삭제</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={s.recentRow}
                  onPress={() => {
                    const q = item;
                    setSearchText(q);
                    setCommittedQuery(q);
                    setMode('result');
                  }}
                  activeOpacity={0.6}
                >
                  <Ionicons name="time-outline" size={15} color="#CCCCCC" />
                  <Text style={s.recentText}>{item}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const next = recentSearches.filter((_, i) => i !== index);
                      setRecentSearches(next);
                      saveRecent(next);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginLeft: 'auto' }}
                  >
                    <Ionicons name="close" size={15} color="#DDDDDD" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 추천 검색어 태그 */}
          <View style={[s.section, { paddingBottom: 28 }]}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>추천 검색어</Text>
            </View>
            <View style={s.tagRow}>
              {['급식메뉴', '시험일정', '동아리', '축제', '학생회'].map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={s.tag}
                  onPress={() => {
                    const q = tag;
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
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },

  /* ── 검색창 영역 (SearchScreen 과 유사) ── */
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
  },
  searchCloseText: {
    fontSize: 13,
    color: '#666666',
  },

  /* ── 탭바 ── */
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F3F3',
  },
  tagText: {
    fontSize: 13,
    color: '#555555',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F5F5F5',
    gap: 8,
  },
  recentText: {
    fontSize: 14,
    color: '#333333',
  },
  tabContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F3F3',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8E8',
  },
  tabBtnActive: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#777777',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  /* ── 섹션 공통 ── */
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F3F3',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: '#F3F3F3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '500',
  },

  /* ── 학교 카드 ── */
  schoolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  schoolIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  schoolName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  /* ── 검색 결과 카드 (전체탭 미리보기) ── */
  card: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  cardBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F3F3',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    lineHeight: 20,
  },
  cardSnippet: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 18,
    marginBottom: 6,
  },
  highlightText: {
    color: '#4CAF50',
    fontWeight: '700',
  },

  /* ── 전체 보기 카드 ── */
  fullCard: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  fullCardBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F3F3',
  },
  fullTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
    lineHeight: 22,
  },
  fullSnippet: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 19,
    marginBottom: 8,
  },

  /* ── 메타 ── */
  metaText: {
    fontSize: 12,
    color: '#BBBBBB',
  },

  /* ── 더보기 버튼 ── */
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F3F3',
    gap: 4,
  },
  moreBtnText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },

  /* ── 더 불러오기 ── */
  centerBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  loadMoreText: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '500',
  },

  /* ── 결과 없음 ── */
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#AAAAAA',
  },
});


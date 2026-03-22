import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const RECENT_KEY = '@search_recent_keywords';

const SearchScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecentSearches(parsed);
      } catch {}
    })();
  }, []);

  // 학교 미리보기(드롭다운)는 SearchResult에서 처리하므로 SearchScreen에서는 사용하지 않음

  const saveRecent = async (list) => {
    try {
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch {}
  };

  const runSearch = (keyword) => {
    const q = (keyword || searchText).trim();
    if (!q) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item !== q);
      const next = [q, ...filtered].slice(0, 10);
      saveRecent(next);
      return next;
    });
    navigation.navigate('SearchResult', { query: q });
  };

  const handleChangeText = (text) => {
    // SearchScreen에서는 단순히 텍스트 상태만 업데이트 (미리보기 API 호출 없음)
    setSearchText(text);
  };

  const handleClearAll = () => {
    setRecentSearches([]);
    saveRecent([]);
  };

  const handleDeleteRecent = (index) => {
    const next = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(next);
    saveRecent(next);
  };

  const getTrendMeta = (trend) => {
    switch (trend) {
      case 'up':   return { icon: 'caret-up',   color: '#E85C4A' };
      case 'down': return { icon: 'caret-down',  color: '#4A90E2' };
      case 'new':  return { icon: null,           color: '#E8A020', label: 'NEW' };
      default:     return { icon: null,           color: '#BBBBBB', label: '—' };
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchInputRow}>
            <Ionicons name="search-outline" size={18} color="#AAAAAA" />
            <TextInput
              style={styles.searchInput}
              placeholder="게시글, 우편함 검색"
              value={searchText}
              onChangeText={handleChangeText}
              onSubmitEditing={() => runSearch()}
              placeholderTextColor="#BBBBBB"
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchText('');
                  setShowPreview(false);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={17} color="#CCCCCC" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              })
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginLeft: 10 }}
          >
            <Text style={styles.dimAction}>닫기</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 최근 검색어 */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>최근 검색어</Text>
                <TouchableOpacity onPress={handleClearAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.dimAction}>전체 삭제</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentRow}
                  onPress={() => { setSearchText(search); runSearch(search); }}
                  activeOpacity={0.6}
                >
                  <Ionicons name="time-outline" size={15} color="#CCCCCC" />
                  <Text style={styles.recentText}>{search}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteRecent(index)}
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
          <View style={[styles.section, { paddingBottom: 28 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>추천 검색어</Text>
            </View>
            <View style={styles.tagRow}>
              {['급식메뉴', '시험일정', '동아리', '축제', '학생회'].map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.tag}
                  onPress={() => { setSearchText(tag); runSearch(tag); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tagText}># {tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },

  /* ── 검색창 영역 ── */
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
    zIndex: 10,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#222222',
    paddingVertical: 0,
  },

  /* ── 미리보기 드롭다운 ── */
  previewDropdown: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
    // 그림자 (iOS)
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    // 그림자 (Android)
    elevation: 4,
  },
  previewGroupLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  previewRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F2',
  },
  previewSchoolIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPostIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRowText: {
    flex: 1,
    fontSize: 14,
    color: '#222222',
    lineHeight: 20,
  },
  previewDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EDEDED',
    marginHorizontal: 14,
    marginVertical: 4,
  },

  /* ── 공통 섹션 ── */
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingTop: 20,
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
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  dimAction: {
    fontSize: 13,
    color: '#BBBBBB',
  },
  dimMeta: {
    fontSize: 12,
    color: '#CCCCCC',
  },

  /* ── 최근 검색어 ── */
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F5F5F5',
  },
  recentText: {
    fontSize: 14,
    color: '#333333',
  },

  /* ── 인기 검색어 ── */
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  popularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingHorizontal: 18,
    paddingVertical: 11,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F5F5F5',
  },
  popularRank: {
    fontSize: 15,
    fontWeight: '700',
    color: '#CCCCCC',
    width: 20,
    textAlign: 'center',
  },
  popularRankTop: {
    color: '#4CAF50',
  },
  popularKeyword: {
    flex: 1,
    fontSize: 14,
    color: '#222222',
  },
  popularTrend: {
    width: 20,
    alignItems: 'center',
  },
  trendLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* ── 추천 태그 ── */
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  tag: {
    backgroundColor: '#F3F3F3',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8E8',
  },
  tagText: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '500',
  },
});

export default SearchScreen;
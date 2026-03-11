import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';
import { api } from '../../utils/api';

/** 서버 created_at(UTC)을 "n분 전" 형식으로 변환. 화면에서는 기기 로컬 시간 기준으로 계산 */
function formatTimeAgo(createdAt) {
  if (!createdAt) return '';
  let dateStr = typeof createdAt === 'string' ? createdAt.trim() : String(createdAt);
  if (!dateStr) return '';
  // MySQL "YYYY-MM-DD HH:mm:ss" 또는 "YYYY-MM-DDTHH:mm:ss" 형태이고
  // 타임존 문자가 없으면 UTC로 간주해 Z(=+00:00) 를 붙인다.
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

const SearchScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [recentSearches, setRecentSearches] = useState([
    '체육대회',
    '급식',
    '시험 일정',
    '동아리 모집',
  ]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const popularSearches = [
    { rank: 1, keyword: '수학 시험', trend: 'up' },
    { rank: 2, keyword: '급식 메뉴', trend: 'up' },
    { rank: 3, keyword: '체육대회', trend: 'down' },
    { rank: 4, keyword: '방과후 신청', trend: 'new' },
    { rank: 5, keyword: '자습실 예약', trend: 'up' },
    { rank: 6, keyword: '축제', trend: 'same' },
    { rank: 7, keyword: '동아리 활동', trend: 'up' },
    { rank: 8, keyword: '학생회', trend: 'down' },
  ];

  const handleDeleteRecent = (index) => {
    const newSearches = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(newSearches);
  };

  const handleClearAll = () => {
    setRecentSearches([]);
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return { name: 'trending-up', color: '#FF6B6B' };
      case 'down':
        return { name: 'trending-down', color: '#4A90E2' };
      case 'new':
        return { name: 'sparkles', color: '#FFA726' };
      default:
        return { name: 'remove', color: '#999' };
    }
  };

  const runSearch = async (keyword) => {
    const q = (keyword || searchText).trim();
    if (!q) return;
    try {
      setLoading(true);
      const res = await api.get('/api/posts', {
        params: {
          search: q,
          page: 1,
          limit: 50,
          sort: 'latest',
        },
      });
      const posts = res.data?.data?.posts || [];
      const mapped = posts.map((p) => ({
        id: p.id,
        title: (p.content || '').split('\n')[0].slice(0, 40) || '제목 없음',
        snippet: (p.content || '').slice(0, 80),
        time: formatTimeAgo(p.created_at),
        likeCount: p.like_count,
        commentCount: p.comment_count,
      }));
      setResults(mapped);

      // 최근 검색어 업데이트 (중복 제거, 앞에 추가)
      setRecentSearches((prev) => {
        const filtered = prev.filter((item) => item !== q);
        return [q, ...filtered].slice(0, 10);
      });
    } catch (error) {
      console.error('게시글 검색 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <SubHeader title="검색" onBack={() => navigation?.goBack()} />

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* 검색창 */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="게시글, 우편함 검색"
                value={searchText}
                onChangeText={setSearchText}
                onSubmitEditing={() => runSearch()}
                placeholderTextColor="#999"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 최근 검색어 */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>최근 검색어</Text>
                <TouchableOpacity onPress={handleClearAll}>
                  <Text style={styles.clearButton}>전체 삭제</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.recentSearchContainer}>
                {recentSearches.map((search, index) => (
                  <View key={index} style={styles.recentSearchItem}>
                    <TouchableOpacity
                      style={styles.recentSearchButton}
                      onPress={() => {
                        setSearchText(search);
                        runSearch(search);
                      }}
                    >
                      <Ionicons name="time-outline" size={16} color="#666" />
                      <Text style={styles.recentSearchText}>{search}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteRecent(index)}
                      style={styles.deleteButton}>
                      <Ionicons name="close" size={16} color="#999" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 인기 검색어 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>실시간 인기 검색어</Text>
              <Text style={styles.updateTime}>1분 전 업데이트</Text>
            </View>

            <View style={styles.popularSearchContainer}>
              {popularSearches.map((item) => {
                const trendIcon = getTrendIcon(item.trend);
                return (
                  <TouchableOpacity
                    key={item.rank}
                    style={styles.popularSearchItem}
                    onPress={() => {
                      setSearchText(item.keyword);
                      runSearch(item.keyword);
                    }}
                  >
                    <View style={styles.popularSearchLeft}>
                      <Text
                        style={[
                          styles.rank,
                          item.rank <= 3 && styles.topRank,
                        ]}>
                        {item.rank}
                      </Text>
                      <Text style={styles.popularKeyword}>{item.keyword}</Text>
                    </View>
                    <Ionicons name={trendIcon.name} size={18} color={trendIcon.color} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 추천 검색어 */}
          <View style={[styles.section, styles.lastSection]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>추천 검색어</Text>
            </View>

            <View style={styles.recommendContainer}>
              {['#급식메뉴', '#시험일정', '#동아리', '#축제', '#학생회'].map(
                (tag, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.tagButton}
                    onPress={() => {
                      const pure = tag.replace(/^#/, '');
                      setSearchText(pure);
                      runSearch(pure);
                    }}
                  >
                    <Text style={styles.tagText}>{tag}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>

          {/* 검색 결과 */}
          {results.length > 0 && (
            <View style={[styles.section, styles.lastSection]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>게시글 결과</Text>
              </View>
              {loading && (
                <View style={styles.resultLoading}>
                  <Ionicons name="time-outline" size={18} color="#999" />
                  <Text style={styles.resultLoadingText}>검색 중...</Text>
                </View>
              )}
              {results.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.resultItem}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('BoardDetail', {
                      post: {
                        id: item.id,
                        author: '익명',
                        content: item.snippet,
                      },
                      isMyPost: false,
                    })
                  }
                >
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.resultSnippet} numberOfLines={2}>
                    {item.snippet}
                  </Text>
                  <View style={styles.resultMeta}>
                    <Text style={styles.resultTime}>{item.time}</Text>
                    <View style={styles.resultStats}>
                      <Ionicons name="heart-outline" size={14} color="#FF6B6B" />
                      <Text style={styles.resultStatText}>{item.likeCount}</Text>
                      <Ionicons
                        name="chatbubble-outline"
                        size={14}
                        color="#8FD397"
                        style={{ marginLeft: 8 }}
                      />
                      <Text style={styles.resultStatText}>{item.commentCount}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingBottom: 20,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  lastSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  clearButton: {
    fontSize: 14,
    color: '#999',
  },
  updateTime: {
    fontSize: 12,
    color: '#999',
  },
  recentSearchContainer: {
    paddingHorizontal: 16,
  },
  recentSearchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  recentSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  recentSearchText: {
    fontSize: 15,
    color: '#333',
  },
  deleteButton: {
    padding: 4,
  },
  popularSearchContainer: {
    paddingHorizontal: 16,
  },
  popularSearchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  popularSearchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999',
    width: 24,
    textAlign: 'center',
  },
  topRank: {
    color: '#4CAF50',
    fontSize: 18,
  },
  popularKeyword: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  recommendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  tagButton: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  resultLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  resultLoadingText: {
    fontSize: 13,
    color: '#999',
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  resultSnippet: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTime: {
    fontSize: 12,
    color: '#999',
  },
  resultStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultStatText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
});

export default SearchScreen;
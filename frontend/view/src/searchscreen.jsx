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

const SearchScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [recentSearches, setRecentSearches] = useState([
    '체육대회',
    '급식',
    '시험 일정',
    '동아리 모집',
  ]);

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

  // 공통 검색 실행 함수: 검색어를 SearchResult 화면으로 넘긴다.
  const handleSearch = (keyword) => {
    const q = (keyword ?? '').trim();
    if (!q) return;
    navigation.navigate('SearchResult', { query: q });
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
                placeholderTextColor="#999"
                returnKeyType="search"
                onSubmitEditing={() => handleSearch(searchText)}
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
                      onPress={() => handleSearch(search)}
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
                    onPress={() => handleSearch(item.keyword)}
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
                    onPress={() => handleSearch(tag)}
                  >
                    <Text style={styles.tagText}>{tag}</Text>
                  </TouchableOpacity>
                )
              )}
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
});

export default SearchScreen;
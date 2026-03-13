import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SubHeader from '../frame/subHeader';
import { getNormalize, createSearchScreenStyles } from '../../styles/search.style';

const SearchScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createSearchScreenStyles(width, normalize), [width, normalize]);

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
                  <View
                    key={index}
                    style={[
                      styles.recentSearchItem,
                      index === recentSearches.length - 1 && styles.recentSearchItemLast,
                    ]}
                  >
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

          {/*
          // 실시간 인기 검색어 (추후 사용할 수 있어 주석만 유지)
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
          */}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default SearchScreen;
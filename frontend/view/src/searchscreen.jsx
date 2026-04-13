import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { getNormalize, createSearchScreenStyles } from '../../styles/search.style';
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

function normalizeSearchText(q) {
  return String(q ?? '').trim();
}

const SearchScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createSearchScreenStyles(width, normalize), [width, normalize]);

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

  const saveRecent = async (list) => {
    try {
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch {}
  };

  const runSearch = (keyword) => {
    const raw =
      keyword !== undefined && keyword !== null && String(keyword).length > 0
        ? keyword
        : searchText;
    const q = normalizeSearchText(raw);
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
      case 'up':   return { icon: 'caret-up',   color: colors.alert };
      case 'down': return { icon: 'caret-down',  color: colors.subcolor };
      case 'new':  return { icon: null,           color: colors.scrap, label: 'NEW' };
      default:     return { icon: null,           color: colors.background2, label: '—' };
    }
  };

  return (
    <View style={styles.root}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <KeyboardAvoidingView
            style={styles.flexOne}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
        <View style={styles.searchBarWrapper}>
          <TouchableOpacity
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              })
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.searchBackButton}
          >
            <Ionicons name="chevron-back" size={normalize(24)} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.searchInputRow}>
            <Ionicons name="search-outline" size={normalize(18)} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="게시글, 우편함 검색"
              value={searchText}
              onChangeText={handleChangeText}
              onSubmitEditing={() => runSearch()}
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchText('');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={normalize(17)} color={colors.textLight20} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
                  onPress={() => {
                    const q = normalizeSearchText(search);
                    setSearchText(q);
                    runSearch(q);
                  }}
                  activeOpacity={0.6}
                >
                  <Ionicons name="time-outline" size={normalize(15)} color={colors.textLight20} />
                  <Text style={styles.recentText}>{search}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteRecent(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.recentDeleteBtn}
                  >
                    <Ionicons name="close" size={normalize(15)} color={colors.textLight20} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.sectionRecommendTags}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>추천 검색어</Text>
            </View>
            <View style={styles.tagRow}>
              {['급식메뉴', '시험일정', '동아리', '축제', '학생회'].map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.tag}
                  onPress={() => {
                    const q = normalizeSearchText(`#${tag}`);
                    setSearchText(q);
                    runSearch(q);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tagText}># {tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </View>
  );
};

export default SearchScreen;

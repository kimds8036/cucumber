import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import SearchSubHeader from '../frame/SearchSubHeader';
import { createSearchStyles, getNormalize } from '../../styles/search.style';

const mockData = {
  전체게시판: [
    { id: 1, title: '기말고사 수학 족보 공유합니다', content: '2학년 수학 기말 대비 족보인데 아이폰17 케이스처럼 생긴 문제 나온대요 ㅋㅋ', time: '2시간 전', likes: 34 },
    { id: 2, title: '아이폰17 케이스 공동구매 하실 분?', content: '학교 근처 공동구매 모집합니다. 투명 케이스 5000원에 같이 사요~', time: '5시간 전', likes: 21 },
    { id: 3, title: '도서관 자리 맡아놓기 진짜 그만해라', content: '아이폰17 케이스 놔두고 자리만 맡는 사람 있더라 ㅋㅋ', time: '1일 전', likes: 87 },
  ],
  학교게시판: [
    { id: 1, title: '[공지] 1학기 수강신청 일정 안내', content: '수강신청은 3월 20일부터 시작합니다. 필수과목 먼저 담으세요.', time: '3시간 전', likes: 56 },
    { id: 2, title: '아이폰17 케이스 분실물 발견', content: '검정 아이폰17 케이스 학생회관 앞에서 주웠습니다. 연락주세요.', time: '1일 전', likes: 12 },
  ],
  개인우편: [
    { id: 1, title: '아이폰17 케이스 공구 관련', content: '안녕하세요! 공구 참여하고 싶은데 입금 계좌 알려주실 수 있나요?', time: '30분 전', from: '익명' },
    { id: 2, title: '케이스 수령 확인해주세요', content: '어제 말씀드린 케이스 받으셨나요? 확인 부탁드려요~', time: '4시간 전', from: '익명2' },
    { id: 3, title: '같이 공부할 사람 구해요', content: '도서관에서 같이 공부할 스터디원 모집합니다!', time: '1일 전', from: '익명3' },
  ],
  학교우편: [
    { id: 1, title: '[장학팀] 장학금 신청 안내', content: '이번 학기 성적 장학금 신청 기간입니다. 포털에서 신청해주세요.', time: '2일 전', from: '장학팀' },
  ],
};

const TABS = ['전체', '전체게시판', '학교게시판', '개인우편', '학교우편'];

function highlight(text, query, styles) {
  if (!query) return <Text>{text}</Text>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <Text>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <Text key={i} style={styles.highlightText}>{p}</Text>
        ) : (
          <Text key={i}>{p}</Text>
        )
      )}
    </Text>
  );
}

export default function SearchResult({ route, navigation }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createSearchStyles(width, normalize), [width, normalize]);

  const routeQuery = route?.params?.query ?? '';
  const [searchText, setSearchText] = useState(routeQuery);
  const [activeTab, setActiveTab] = useState('전체');
  const [expandedSection, setExpandedSection] = useState(null);

  // 2. 검색어를 포함하는 데이터만 필터링 (제목 또는 내용 또는 from 에 searchText 포함)
  const normalizedQuery = searchText.trim().toLowerCase();
  const filteredMockData = useMemo(() => {
    if (!normalizedQuery) return {};
    const result = {};
    Object.entries(mockData).forEach(([section, items]) => {
      const filtered = items.filter((item) => {
        const inTitle = item.title.toLowerCase().includes(normalizedQuery);
        const inContent = item.content.toLowerCase().includes(normalizedQuery);
        const inFrom = item.from
          ? String(item.from).toLowerCase().includes(normalizedQuery)
          : false;
        return inTitle || inContent || inFrom;
      });
      if (filtered.length > 0) {
        result[section] = filtered;
      }
    });
    return result;
  }, [normalizedQuery]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filteredMockData).map(([k, v]) => [k, v.length]),
      ),
    [filteredMockData],
  );

  const sortedSections = useMemo(
    () => Object.entries(filteredMockData).sort(([, a], [, b]) => b.length - a.length),
    [filteredMockData],
  );

  // 섹션 전체 보기 모드
  if (expandedSection) {
    const items = filteredMockData[expandedSection] || [];
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* 1. 서브헤더 적용 (일반 제목 모드) */}
        <SubHeader
          title={expandedSection}
          onBack={() => setExpandedSection(null)}
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {items.map((item) => (
            <View key={item.id} style={styles.fullCard}>
              {item.from ? (
                <View style={styles.fromBadge}>
                  <Text style={styles.fromBadgeText}>{item.from}</Text>
                </View>
              ) : null}
              <Text style={styles.fullTitle}>
                {highlight(item.title, searchText, styles)}
              </Text>
              <Text style={styles.fullContent}>{item.content}</Text>
              <Text style={styles.meta}>
                {item.time}
                {item.likes !== undefined && ` · 좋아요 ${item.likes}`}
              </Text>
            </View>
          ))}

          {/* 연관 검색어 해시태그 */}
          <View style={styles.searchFooter}>
            <Text style={styles.searchFooterLabel}>연관 검색어</Text>
            <View style={styles.searchFooterTagRow}>
              {/* TODO: 실제 연관 검색어 데이터로 대체 */}
              <TouchableOpacity
                style={styles.searchFooterTagChip}
                activeOpacity={0.8}
                onPress={() => setSearchText('케이스')}
              >
                <Text style={styles.searchFooterTagText}>#케이스</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.searchFooterTagChip}
                activeOpacity={0.8}
                onPress={() => setSearchText('휴대폰악세사리')}
              >
                <Text style={styles.searchFooterTagText}>#휴대폰악세사리</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.searchFooterTagChip}
                activeOpacity={0.8}
                onPress={() => setSearchText('공동구매')}
              >
                <Text style={styles.searchFooterTagText}>#공동구매</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 검색 결과 요약 문구 (별도 박스) */}
          <View style={styles.searchFooterSummaryBox}>
            <Text style={styles.searchFooterSummary}>검색 결과를 모두 확인했습니다</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 기본 검색 결과 화면
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 상단: 검색 전용 서브헤더 */}
      <SearchSubHeader
        onBack={() => navigation.goBack()}
        value={searchText}
        onChangeText={setSearchText}
        onSubmit={() => {}}
        autoFocus={false}
      />

      {/* 탭: boardAll 정렬 버튼처럼 컴팩트 + 가로 스크롤 */}
      <View style={{  justifyContent: 'flex-start' }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.searchTabsContainer}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.searchTabButton,
                activeTab === tab && styles.searchTabButtonActive,  
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.searchTabButtonText,
                  activeTab === tab && styles.searchTabButtonTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === '전체' ? (
          sortedSections.map(([section, items]) => (
            <View key={section} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section}</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{items.length}건</Text>
                </View>
              </View>
              {items.slice(0, 3).map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {highlight(item.title, searchText, styles)}
                  </Text>
                  <Text style={styles.cardContent}>
                    {item.content.slice(0, 48)}...
                  </Text>
                  <Text style={styles.meta}>{item.time}</Text>
                </View>
              ))}
              {items.length > 3 && (
                <TouchableOpacity
                  onPress={() => setExpandedSection(section)}
                  style={styles.moreButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moreButtonText}>
                    {section} 더보기 →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <View style={styles.section}>
            {(mockData[activeTab] || []).map((item) => (
              <View key={item.id} style={styles.fullCard}>
                <Text style={styles.fullTitle}>
                  {highlight(item.title, searchText, styles)}
                </Text>
                <Text style={styles.fullContent}>{item.content}</Text>
                <Text style={styles.meta}>
                  {item.time}
                  {item.likes !== undefined && ` · 좋아요 ${item.likes}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 연관 검색어 해시태그 */}
        <View style={styles.searchFooter}>
          <Text style={styles.searchFooterLabel}>연관 검색어</Text>
          <View style={styles.searchFooterTagRow}>
            {/* TODO: 실제 연관 검색어 데이터로 대체 */}
            <TouchableOpacity
              style={styles.searchFooterTagChip}
              activeOpacity={0.8}
              onPress={() => setSearchText('케이스')}
            >
              <Text style={styles.searchFooterTagText}>#케이스</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.searchFooterTagChip}
              activeOpacity={0.8}
              onPress={() => setSearchText('휴대폰악세사리')}
            >
              <Text style={styles.searchFooterTagText}>#휴대폰악세사리</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.searchFooterTagChip}
              activeOpacity={0.8}
              onPress={() => setSearchText('공동구매')}
            >
              <Text style={styles.searchFooterTagText}>#공동구매</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 검색 결과 요약 문구 (별도 박스) */}
        <View style={styles.searchFooterSummaryBox}>
          <Text style={styles.searchFooterSummary}>검색 결과를 모두 확인했습니다</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


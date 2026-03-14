import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import StudyGrassMap from '../../components/studygrassmap';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createOurSchoolStyles } from '../../styles/school.style';

const OurSchoolScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createOurSchoolStyles(normalize), [normalize]);
  // 샘플 데이터
  const schoolInfo = {
    name: '진관고등학교',
    location: '서울 은평구 진관동',
    studentCount: 532,
    postCount: 525,
    mailCount: 525,
  };

  const mealInfo = {
    items: ['김치찌개', '잡채', '계란말이', '흰쌀밥'],
    type: '중식',
  };

  const popularPosts = [
    { id: 1, title: '지금 안 자는 사람', type: 'post', likes: 1, comments: 1 },
    { id: 2, title: '지금 안 자는 사람', type: 'post', likes: 1, comments: 1 },
    { id: 3, title: '지금 안 자는 사람', type: 'mail', likes: 0, comments: 1 },
    { id: 4, title: '지금 안 자는 사람', type: 'mail', likes: 0, comments: 1 },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 상단: 학교 정보 카드(좌 1.1) + 급식 카드(우 1) 분리, gap으로 간격 */}
        <View style={styles.topRow}>
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
          <View style={styles.mealCard}>
            <View style={styles.mealCardTop}>
              <View style={styles.mealTypeRow}>
                <MaterialCommunityIcons name="rice" size={normalize(16)} color={colors.primary} />
                <Text style={styles.mealType}>{mealInfo.type}</Text>
              </View>
            </View>
            <View style={styles.mealItemsWrap}>
              {mealInfo.items.map((item, index) => (
                <Text key={index} style={styles.mealItem}>{item}</Text>
              ))}
            </View>
            <Text style={styles.mealMore}>자세히 →</Text>
          </View>
        </View>

        {/* 공부 잔디 카드 — 풀 너비 */}
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

          {popularPosts.map((post) => (
            <TouchableOpacity key={post.id} style={styles.popularItem}>
              <View style={styles.popularItemLeft}>
                <Ionicons
                  name={post.type === 'post' ? 'chatbubble-ellipses' : 'mail'}
                  size={normalize(18)}
                  color={post.type === 'post' ? colors.primary : colors.primaryDark}
                />
                <Text style={styles.popularItemTitle}>{post.title}</Text>
              </View>

              <View style={styles.popularItemRight}>
                {post.likes > 0 && (
                  <View style={styles.countBadge}>
                    <Ionicons name="heart-outline" size={normalize(14)} color={colors.alert} />
                    <Text style={styles.countText}>{post.likes}</Text>
                  </View>
                )}
                <View style={styles.countBadge}>
                  <Ionicons name="chatbubble-outline" size={normalize(14)} color={colors.primaryDark} />
                  <Text style={styles.countText}>{post.comments}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default OurSchoolScreen;
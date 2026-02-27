import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StudyGrassMap from '../../components/studygrassmap';

const OurSchoolScreen = ({ navigation }) => {
  // 샘플 데이터
  const schoolInfo = {
    name: '진관고등학교',
    location: '서울 은평구 진관동',
    postCount: 525,
    mailCount: 525,
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
        {/* 학교 정보 카드 — 잔디밭 포함 */}
        <View style={styles.schoolCard}>
          <Text style={styles.schoolName}>{schoolInfo.name}</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.locationText}>{schoolInfo.location}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>학생</Text>
              <View style={styles.statValueContainer}>
                <Ionicons name="person" size={16} color="#4A90E2" />
                <Text style={styles.statValue}>{schoolInfo.studentCount}명</Text>
              </View>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>게시글</Text>
              <View style={styles.statValueContainer}>
                <Ionicons name="document-text-outline" size={16} color="#4A90E2" />
                <Text style={styles.statValue}>{schoolInfo.postCount}개</Text>
              </View>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>우편</Text>
              <View style={styles.statValueContainer}>
                <Ionicons name="mail-outline" size={16} color="#4A90E2" />
                <Text style={styles.statValue}>{schoolInfo.mailCount}개</Text>
              </View>
            </View>
          </View>

          {/* ✅ 잔디밭 — 카드 내부 */}
          <StudyGrassMap />
        </View>

        {/* 바로가기 버튼 */}
        <View style={styles.shortcutContainer}>
          <TouchableOpacity
            style={styles.shortcutButton}
            activeOpacity={0.7}
            onPress={() => navigation?.navigate('SchoolBoardAll')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="chatbubbles" size={28} color="#4CAF50" />
            </View>
            <Text style={styles.shortcutTitle}>학교 게시판</Text>
            <Text style={styles.shortcutSubtitle}>→ 보러 가기</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shortcutButton}>
            <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="mail" size={28} color="#4CAF50" />
            </View>
            <Text style={styles.shortcutTitle}>학교 우편함</Text>
            <Text style={styles.shortcutSubtitle}>→ 보러 가기</Text>
          </TouchableOpacity>
        </View>

        {/* 실시간 인기 */}
        <View style={styles.popularSection}>
          <View style={styles.popularHeader}>
            <Ionicons name="flame" size={20} color="#FF6B6B" />
            <Text style={styles.popularTitle}>실시간 인기</Text>
          </View>

          {popularPosts.map((post) => (
            <TouchableOpacity key={post.id} style={styles.popularItem}>
              <View style={styles.popularItemLeft}>
                <Ionicons
                  name={post.type === 'post' ? 'chatbubble-ellipses' : 'mail'}
                  size={18}
                  color={post.type === 'post' ? '#4CAF50' : '#FFA726'}
                />
                <Text style={styles.popularItemTitle}>{post.title}</Text>
              </View>

              <View style={styles.popularItemRight}>
                {post.likes > 0 && (
                  <View style={styles.countBadge}>
                    <Ionicons name="heart-outline" size={14} color="#FF6B6B" />
                    <Text style={styles.countText}>{post.likes}</Text>
                  </View>
                )}
                <View style={styles.countBadge}>
                  <Ionicons name="chatbubble-outline" size={14} color="#FFA726" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  schoolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#A5D6A7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  schoolName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  shortcutContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  shortcutButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  shortcutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  shortcutSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  popularSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  popularHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  popularTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  popularItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  popularItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  popularItemTitle: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  popularItemRight: {
    flexDirection: 'row',
    gap: 8,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  countText: {
    fontSize: 12,
    color: '#666',
  },
});

export default OurSchoolScreen;
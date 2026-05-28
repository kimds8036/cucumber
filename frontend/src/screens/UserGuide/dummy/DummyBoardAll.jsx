import React, { useMemo } from 'react';
import { FlatList, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { colors } from '../../../../styles/colors';
import { createBoardStyles, getNormalize } from '../../../../styles/board.style';

const POSTS = [
  {
    id: 1,
    content:
      '학생들만의 고민을 익명으로 자유롭게 나누고 친구들과 생각을 공유해 보세요.',
    likes: 13,
    comments: 54,
    distance: '3km',
  },
  {
    id: 2,
    content: '중간고사 D-7 같이 공부하실 분?...',
    likes: null,
    comments: 89,
    distance: '24m',
    tags: ['#공부', '#중간고사'],
  },
  {
    id: 3,
    content: '오늘 공부 인증합니다',
    likes: 10,
    comments: null,
    distance: '12km',
    tags: ['#타이머', '#공부', '#공친구함'],
  },
  {
    id: 4,
    content: '남친이 시험기간이라...',
    likes: 213,
    comments: 89,
    distance: '87km',
  },
];

export default function DummyBoardAll() {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createBoardStyles(width, normalize), [width, normalize]);

  return (
    <View style={styles.container}>
      <View style={styles.sortContainer}>
        <TouchableOpacity style={[styles.sortButton, styles.sortButtonActive]} activeOpacity={1}>
          <Text style={[styles.sortButtonText, styles.sortButtonTextActive]}>최신</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortButton} activeOpacity={1}>
          <Text style={styles.sortButtonText}>인기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortButton} activeOpacity={1}>
          <Text style={styles.sortButtonText}>근처</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.postList}
        data={POSTS}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.postItem}>
            <View style={styles.postHeader}>
              <View style={styles.postAuthorRow}>
                <Text style={styles.postAuthor}>익명</Text>
                <Text style={styles.postDot}>·</Text>
                <Text style={styles.postTime}>2시간 전</Text>
              </View>
              <View style={styles.distanceBadgeChip}>
                <Ionicons name="location-outline" size={normalize(12)} color={colors.primaryDark} />
                <Text style={styles.distanceBadgeNumber}>{item.distance}</Text>
              </View>
            </View>
            <Text style={styles.postContent} numberOfLines={2}>
              {item.content}
            </Text>
            {item.tags?.length ? (
              <View style={styles.postTagsWrap}>
                {item.tags.map((tag) => (
                  <Text key={tag} style={styles.postTagText}>
                    {tag}
                  </Text>
                ))}
              </View>
            ) : null}
            <View style={styles.postDivider} />
            <View style={styles.postFooter}>
              <View style={styles.postStats}>
                {item.likes != null ? (
                  <View style={styles.postStatItem}>
                    <Ionicons name="heart-outline" size={normalize(14)} color={colors.textSecondary} />
                    <Text style={styles.postStatText}>{item.likes}</Text>
                  </View>
                ) : null}
                {item.comments != null ? (
                  <View style={styles.postStatItem}>
                    <Ionicons name="chatbubble-outline" size={normalize(14)} color={colors.textSecondary} />
                    <Text style={styles.postStatText}>{item.comments}</Text>
                  </View>
                ) : null}
              </View>
              <Ionicons name="ellipsis-horizontal" size={normalize(16)} color={colors.textSecondary} />
            </View>
          </View>
        )}
      />

      <View style={styles.floatingButton}>
        <FontAwesome5 name="plus" size={normalize(22)} color={colors.background} />
      </View>
    </View>
  );
}

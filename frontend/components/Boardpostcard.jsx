import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors, fonts } from '../styles/colors';

/**
 * BoardPostCard
 *
 * Props:
 *  - post         : 게시글 객체 { …, thumbnail?, tags? }
 *  - normalize    : 반응형 크기 함수
 *  - styles       : createBoardStyles 로 생성된 스타일 객체
 *  - onPress      : 카드 클릭 핸들러 (post) => void
 *  - onScrapPress : 스크랩 토글 (post) => void
 */
const BoardPostCard = ({ post, normalize, styles, onPress, onScrapPress }) => {
  const hasThumb =
    typeof post.thumbnail === 'string' && post.thumbnail.trim().length > 0;

  return (
    <TouchableOpacity
      style={styles.postItem}
      activeOpacity={0.7}
      onPress={() => onPress?.(post)}
    >
      {/* 헤더: 좌측 작성자|시간(·위치), 우측 거리 배지 */}
      <View style={styles.postHeader}>
        <View style={styles.postAuthorRow}>
          <Text
            style={
              post.author === '작성자' ? styles.postAuthorVerified : styles.postAuthor
            }
            numberOfLines={1}
          >
            {post.author}
          </Text>
          <Text style={styles.postDot}>•</Text>
          <Text style={styles.postTime} numberOfLines={1}>
            {post.time}
          </Text>
          {post.location ? (
            <View style={[styles.postTimeRow, { flexShrink: 1 }]}>
              <Text style={styles.postTime}>{' · '}</Text>
              <Text
                style={[styles.postLocationText, { flexShrink: 1, minWidth: 0 }]}
                numberOfLines={1}
              >
                {post.location}
              </Text>
            </View>
          ) : null}
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: normalize(8),
            flexShrink: 0,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: normalize(1),
              backgroundColor: colors.primaryLight30,
              borderRadius: normalize(10),
              paddingHorizontal: normalize(7),
              paddingVertical: normalize(2),
            }}
          >
            <MaterialIcons name="location-on" size={normalize(12)} color={colors.primaryDark} />
            <Text
              style={{
                fontSize: normalize(11),
                fontFamily: fonts.regular,
                color: colors.primaryDark,
              }}
            >
              10km
            </Text>
          </View>
        </View>
      </View>

      {/* 본문·해시태그·푸터(세로) + 썸네일(가로) 한 상자 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
        }}
      >
        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: 'column',
            minHeight: hasThumb ? normalize(70) : undefined,
            justifyContent: hasThumb ? 'space-between' : 'flex-start',
            marginRight: hasThumb ? normalize(10) : 0,
          }}
        >
          <Text
            style={[styles.postContent, { marginBottom: normalize(6) }]}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {post.content}
          </Text>

          {Array.isArray(post.tags) && post.tags.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: normalize(6),
                marginBottom: normalize(7),
              }}
            >
              {post.tags.map((tag, idx) => {
                const label =
                  tag != null && typeof tag === 'object'
                    ? String(tag.name ?? '')
                    : String(tag ?? '');
                if (!label.trim()) return null;
                return (
                  <View
                    key={tag?.id != null ? `tag-${tag.id}` : `tag-${idx}-${label}`}
                    style={{
                      backgroundColor: colors.primaryLight30,
                      borderRadius: normalize(12),
                      paddingHorizontal: normalize(8),
                      paddingVertical: normalize(1),
                    }}
                  >
                    <Text
                      style={{
                        fontSize: normalize(10),
                        fontFamily: fonts.regular,
                        color: colors.primaryDark,
                      }}
                    >
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={[styles.postFooter, { justifyContent: 'flex-start' }]}>
            <View style={styles.postStats}>
              <View style={styles.postStatItem}>
                <FontAwesome
                  name={post.liked ? 'heart' : 'heart-o'}
                  size={normalize(14)}
                  color={colors.alert}
                />
                <Text style={styles.postStatText}>{post.likes}</Text>
              </View>
              <View style={styles.postStatItem}>
                <Ionicons name="chatbubble-outline" size={normalize(15)} color={colors.primary} />
                <Text style={styles.postStatText}>{post.comments}</Text>
              </View>
              <TouchableOpacity
                style={styles.postStatItem}
                onPress={() => onScrapPress && onScrapPress(post)}
              >
                <Ionicons
                  name={post.scrapped ? 'bookmark' : 'bookmark-outline'}
                  size={normalize(14)}
                  color={colors.scrap}
                />
                <Text style={styles.postStatText}>{post.scrapCount ?? 0}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {hasThumb ? (
          <Image
            source={{ uri: post.thumbnail.trim() }}
            style={{
              width: normalize(70),
              height: normalize(70),
              borderRadius: normalize(8),
              backgroundColor: colors.textLight10 ?? '#EEE',
              alignSelf: 'flex-start',
              marginTop: normalize(2),
            }}
            resizeMode="cover"
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export default BoardPostCard;

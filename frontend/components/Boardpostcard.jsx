import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Entypo } from '@expo/vector-icons';
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
 *  - onMenuPress  : 햄버거 메뉴 클릭 핸들러 (post, ref) => void
 *  - onScrapPress : 스크랩 토글 (post) => void
 */
const BoardPostCard = ({ post, normalize, styles, onPress, onMenuPress, onScrapPress }) => {
  const menuButtonRef = useRef(null);

  return (
    <TouchableOpacity
      style={styles.postItem}
      activeOpacity={0.7}
      onPress={() => onPress?.(post)}
    >
      {/* 헤더: 좌측 작성자, 우측 시간(·위치) */}
      <View style={styles.postHeader}>
        <View style={styles.postAuthorInfo}>
          <Text style={styles.postAuthor}>{post.author}</Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: normalize(6),
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: normalize(4),
              backgroundColor: colors.primaryLight30,
              borderRadius: normalize(10),
              paddingHorizontal: normalize(7),
              paddingVertical: normalize(2),
            }}
          >
            <Ionicons name="navigate-outline" size={normalize(11)} color={colors.primary} />
            <Text
              style={{
                fontSize: normalize(11),
                fontFamily: fonts.regular,
                color: colors.primary,
              }}
            >
              10km
            </Text>
          </View>
          <View style={styles.postTimeRow}>
            <Text style={styles.postTime}>{post.time}</Text>
            {post.location ? (
              <>
                <Text style={styles.postTime}>{' · '}</Text>
                <Ionicons name="location-sharp" size={normalize(12)} color={colors.textSecondary} />
                <Text style={styles.postLocationText}>{post.location}</Text>
              </>
            ) : null}
          </View>
        </View>
      </View>

      {/* 본문 + 목록용 썸네일(첫 장만) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginBottom: normalize(10),
        }}
      >
        <Text
          style={[styles.postContent, { flex: 1, marginRight: post.thumbnail ? normalize(10) : 0 }]}
          numberOfLines={5}
          ellipsizeMode="tail"
        >
          {post.content}
        </Text>
        {typeof post.thumbnail === 'string' && post.thumbnail.trim() ? (
          <Image
            source={{ uri: post.thumbnail.trim() }}
            style={{
              width: normalize(76),
              height: normalize(76),
              borderRadius: normalize(8),
              backgroundColor: colors.textLight10 ?? '#EEE',
            }}
            resizeMode="cover"
          />
        ) : null}
      </View>

      {Array.isArray(post.tags) && post.tags.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: normalize(6),
            marginBottom: normalize(10),
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
                  paddingVertical: normalize(3),
                }}
              >
                <Text
                  style={{
                    fontSize: normalize(11),
                    fontFamily: fonts.regular,
                    color: colors.primary,
                  }}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* 경계선 */}
      <View style={styles.postDivider} />

      {/* 푸터: 좋아요 & 댓글 / 햄버거 */}
      <View style={styles.postFooter}>
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

        <View ref={menuButtonRef} collapsable={false}>
          <TouchableOpacity
            style={styles.menuButton}
            activeOpacity={0.7}
            onPress={() => onMenuPress?.(post, menuButtonRef.current)}
            hitSlop={{
              top: normalize(12),
              bottom: normalize(12),
              left: normalize(12),
              right: normalize(12),
            }}
          >
            <Entypo name="dots-three-vertical" size={normalize(14)} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default BoardPostCard;
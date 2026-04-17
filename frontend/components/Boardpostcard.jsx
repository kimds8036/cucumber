import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '../styles/colors';
import { normalizeTagsFromApi } from '../utils/normalizePostTags';

/**
 * BoardPostCard
 *
 * Props:
 *  - post         : 게시글 객체 { …, thumbnail?, tags? }
 *  - normalize    : 반응형 크기 함수
 *  - styles       : createBoardStyles 로 생성된 스타일 객체
 *  - onPress      : 카드 클릭 핸들러 (post) => void
 *  - onScrapPress : 스크랩 토글 (post) => void
 *  - onLayoutStable : (postId, layoutEpoch) => void — 태그 줄·칩 측정이 끝난 뒤(또는 태그 없음) 1회
 *  - layoutStableEpoch : 목록이 배치한 로드 배치 번호(부모 ref). 콜백과 짝을 맞출 때 사용
 */
const BoardPostCard = ({
  post,
  normalize,
  styles,
  onPress,
  onScrapPress,
  onLayoutStable,
  layoutStableEpoch = 0,
}) => {
  const hasThumb =
    typeof post.thumbnail === 'string' && post.thumbnail.trim().length > 0;
  const [containerWidth, setContainerWidth] = useState(0);
  const [tagWidths, setTagWidths] = useState([]);
  const [measureBypass, setMeasureBypass] = useState(false);

  const tags = useMemo(() => {
    const rawList = normalizeTagsFromApi(post.tags);
    return rawList
      .map((tag) =>
        tag != null && typeof tag === 'object'
          ? String(tag.name ?? '').trim()
          : String(tag ?? '').trim(),
      )
      .filter(Boolean);
  }, [post.tags]);

  useEffect(() => {
    setMeasureBypass(false);
    if (tags.length === 0) return undefined;
    const id = setTimeout(() => setMeasureBypass(true), 450);
    return () => clearTimeout(id);
  }, [post?.id, tags.length]);
  const TAG_GAP = normalize(6);
  const MORE_BADGE_WIDTH = normalize(36);

  useEffect(() => {
    setTagWidths(new Array(tags.length).fill(0));
  }, [tags.length]);

  const allMeasured =
    tags.length > 0 &&
    tagWidths.length === tags.length &&
    tagWidths.every((w) => typeof w === 'number' && w > 0);

  const { visibleCount, hiddenTagCount } = useMemo(() => {
    if (!allMeasured || containerWidth <= 0) {
      return { visibleCount: tags.length, hiddenTagCount: 0 };
    }

    const totalWidth =
      tagWidths.reduce((sum, width) => sum + width, 0) +
      TAG_GAP * Math.max(0, tags.length - 1);

    if (totalWidth <= containerWidth) {
      return { visibleCount: tags.length, hiddenTagCount: 0 };
    }

    let used = 0;
    let count = 0;

    for (let i = 0; i < tags.length; i += 1) {
      const gapBefore = count > 0 ? TAG_GAP : 0;
      const remainingAfterCurrent = tags.length - (i + 1);
      const reserveForMore =
        remainingAfterCurrent > 0 ? TAG_GAP + MORE_BADGE_WIDTH : 0;
      const nextUsed = used + gapBefore + tagWidths[i];

      if (nextUsed + reserveForMore <= containerWidth) {
        used = nextUsed;
        count += 1;
      } else {
        break;
      }
    }

    return {
      visibleCount: count,
      hiddenTagCount: Math.max(0, tags.length - count),
    };
  }, [
    allMeasured,
    containerWidth,
    tagWidths,
    tags.length,
    TAG_GAP,
    MORE_BADGE_WIDTH,
  ]);

  const isMeasuring =
    tags.length > 0 && !measureBypass && (!allMeasured || containerWidth <= 0);

  const layoutStableKeyRef = useRef('');
  const layoutStable = tags.length === 0 || !isMeasuring;
  useEffect(() => {
    if (!onLayoutStable) return undefined;
    if (!layoutStable) return undefined;
    const key = `${layoutStableEpoch}:${post?.id}`;
    if (layoutStableKeyRef.current === key) return undefined;
    layoutStableKeyRef.current = key;
    const id = post?.id;
    const epoch = layoutStableEpoch;
    const raf = requestAnimationFrame(() => {
      onLayoutStable(id, epoch);
    });
    return () => {
      cancelAnimationFrame(raf);
      layoutStableKeyRef.current = '';
    };
  }, [layoutStable, layoutStableEpoch, onLayoutStable, post?.id]);

  const km = post.distanceKm;
  const hasKm = typeof km === 'number' && !Number.isNaN(km);
  let distanceNumberText = '';
  let distanceUnitText = '';
  if (hasKm && km < 1) {
    distanceNumberText = '1';
    distanceUnitText = 'km 미만';
  } else if (hasKm) {
    distanceNumberText = String(Math.round(km));
    distanceUnitText = 'km';
  }

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
              post.author === '작성자'
                ? styles.postAuthorVerified
                : styles.postAuthor
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
            <View style={[styles.postTimeRow, styles.postLocationWrap]}>
              <Text style={styles.postTime}>{' · '}</Text>
              <Text
                style={[styles.postLocationText, styles.postLocationInlineText]}
                numberOfLines={1}
              >
                {post.location}
              </Text>
            </View>
          ) : null}
        </View>
        {hasKm ? (
          <View style={styles.distanceBadgeWrap}>
            <View style={styles.distanceBadgeChip}>
              <MaterialIcons
                name="location-on"
                size={normalize(10)}
                color={colors.primaryDark}
              />
              <View style={styles.distanceBadgeTextRow}>
                <Text style={styles.distanceBadgeNumber}>
                  {distanceNumberText}
                </Text>
                <Text style={styles.distanceBadgeUnit}>{distanceUnitText}</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {/* 본문/푸터(세로) + 썸네일(가로) */}
      <View style={styles.postBodyRow}>
        <View
          style={[
            styles.postBodyColumn,
            hasThumb && styles.postBodyColumnWithThumb,
          ]}
        >
          <Text
            style={[styles.postContent, styles.postContentCompact]}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {post.content}
          </Text>

          {tags.length > 0 ? (
            <View
              style={styles.postTagsWrap}
              onLayout={({ nativeEvent: { layout } }) => {
                if (layout.width !== containerWidth)
                  setContainerWidth(layout.width);
              }}
            >
              {tags.map((label, idx) => {
                if (!isMeasuring && idx >= visibleCount) return null;
                return (
                  <View
                    key={`tag-${idx}-${label}`}
                    style={[
                      styles.postTagChip,
                      isMeasuring && styles.postTagMeasureHidden,
                    ]}
                    onLayout={({ nativeEvent: { layout } }) => {
                      const measuredWidth = layout.width;
                      setTagWidths((prev) => {
                        if (
                          !Array.isArray(prev) ||
                          prev.length !== tags.length
                        ) {
                          const next = new Array(tags.length).fill(0);
                          next[idx] = measuredWidth;
                          return next;
                        }
                        if (prev[idx] === measuredWidth) return prev;
                        const next = [...prev];
                        next[idx] = measuredWidth;
                        return next;
                      });
                    }}
                  >
                    <Text style={styles.postTagText}>{label}</Text>
                  </View>
                );
              })}
              {!isMeasuring && hiddenTagCount > 0 ? (
                <View style={[styles.postTagChip, styles.postTagMoreChip]}>
                  <Text style={styles.postTagText}>+{hiddenTagCount}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.postFooter, styles.postFooterStart]}>
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
                <Ionicons
                  name="chatbubble-outline"
                  size={normalize(15)}
                  color={colors.primary}
                />
                <Text style={styles.postStatText}>{post.comments}</Text>
              </View>
              <View style={styles.postStatItem}>
                <Ionicons
                  name={post.scrapped ? 'bookmark' : 'bookmark-outline'}
                  size={normalize(14)}
                  color={colors.scrap}
                />
                <Text style={styles.postStatText}>{post.scrapCount ?? 0}</Text>
              </View>
            </View>
          </View>
        </View>

        {hasThumb ? (
          <Image
            source={{ uri: post.thumbnail.trim() }}
            style={styles.postThumb}
            resizeMode="cover"
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export default BoardPostCard;

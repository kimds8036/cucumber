import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors, fonts, fontSizes } from '../styles/colors';
import { normalizeTagsFromApi } from '../utils/normalizePostTags';
import DistanceBadge from './DistanceBadge';
import EquippedBadge from './EquippedBadge';

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
 *  - hideDistanceBadge : true면 우측 거리(km) 뱃지만 숨김
 *  - showDistanceBadge : 위치 권한 등으로 배지 영역 표시
 *  - distanceStale : 좌표 없음(주황 칩), coords 있으면 캐시·GPS 모두 초록
 *  - distanceLoading : 거리 미계산 시 주황 칩 + 점 로딩
 */
const BoardPostCard = ({
  post,
  normalize,
  styles,
  onPress,
  onScrapPress,
  onLayoutStable,
  layoutStableEpoch = 0,
  hideDistanceBadge = false,
  showDistanceBadge = true,
  distanceStale = false,
  distanceLoading = false,
}) => {
  const hasThumb =
    typeof post.thumbnail === 'string' && post.thumbnail.trim().length > 0;
  const [containerWidth, setContainerWidth] = useState(0);
  const [tagWidths, setTagWidths] = useState([]);
  const [measureFallback, setMeasureFallback] = useState(false);
  const measureOkRef = useRef(false);

  const TAG_GAP = normalize(6);
  const WIDTH_FIT_EPSILON = 1;
  const MORE_CHIP_RESERVE = normalize(40);

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

  const tagsSignature = useMemo(() => tags.join('\u0001'), [tags]);

  const allMeasured =
    tags.length > 0 &&
    tagWidths.length === tags.length &&
    tagWidths.every((w) => typeof w === 'number' && w > 0);

  useEffect(() => {
    setContainerWidth(0);
    setTagWidths(new Array(tags.length).fill(0));
    setMeasureFallback(false);
    measureOkRef.current = false;
  }, [tagsSignature, tags.length, post?.id]);

  useEffect(() => {
    measureOkRef.current = containerWidth > 0 && allMeasured;
    if (measureOkRef.current) {
      setMeasureFallback(false);
    }
  }, [containerWidth, allMeasured, tags.length]);

  useEffect(() => {
    setMeasureFallback(false);
    if (tags.length === 0) return undefined;
    const t = setTimeout(() => {
      if (!measureOkRef.current) {
        setMeasureFallback(true);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [tagsSignature, post?.id, tags.length]);

  const layoutComplete = containerWidth > 0 && allMeasured;
  const useFallbackDisplay = measureFallback && !layoutComplete;

  const visibleCount = useMemo(() => {
    if (tags.length === 0) return 0;
    if (!layoutComplete || useFallbackDisplay) {
      return tags.length;
    }

    const totalWidth =
      tagWidths.reduce((sum, width) => sum + width, 0) +
      TAG_GAP * Math.max(0, tags.length - 1);

    if (totalWidth <= containerWidth + WIDTH_FIT_EPSILON) {
      return tags.length;
    }

    let used = 0;
    let count = 0;

    for (let i = 0; i < tags.length; i += 1) {
      const gapBefore = count > 0 ? TAG_GAP : 0;
      const remainingAfterThis = tags.length - i - 1;
      const reserveForMore =
        remainingAfterThis > 0 ? TAG_GAP + MORE_CHIP_RESERVE : 0;
      const nextUsed = used + gapBefore + tagWidths[i] + reserveForMore;

      if (nextUsed <= containerWidth + WIDTH_FIT_EPSILON) {
        used += gapBefore + tagWidths[i];
        count += 1;
      } else {
        break;
      }
    }

    return Math.max(1, count);
  }, [
    layoutComplete,
    useFallbackDisplay,
    containerWidth,
    tagWidths,
    tags.length,
    TAG_GAP,
    WIDTH_FIT_EPSILON,
    MORE_CHIP_RESERVE,
  ]);

  const hiddenTagCount =
    layoutComplete && !useFallbackDisplay && tags.length > visibleCount
      ? tags.length - visibleCount
      : 0;

  const showAllTagsForMeasure =
    tags.length > 0 && !layoutComplete && !useFallbackDisplay;

  const layoutStable =
    tags.length === 0 || layoutComplete || useFallbackDisplay;

  const layoutStableKeyRef = useRef('');
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

  const likesCount = Number(post.likes) || 0;
  const commentsCount = Number(post.comments) || 0;
  const scrapCount = Number(post.scrapCount) || 0;
  const hasVisibleStats = likesCount > 0 || commentsCount > 0 || scrapCount > 0;

  return (
    <TouchableOpacity
      style={styles.postItem}
      activeOpacity={0.7}
      onPress={() => onPress?.(post)}
    >
      {/* 헤더: 좌측 작성자|시간(·위치), 우측 거리 배지 */}
      <View style={styles.postHeader}>
        <View style={styles.postAuthorRow}>
          <Text style={styles.postAuthor} numberOfLines={1}>
            {post.author}
          </Text>
          <EquippedBadge
            badge={post.equippedBadge}
            size={normalize(13)}
            style={{ marginLeft: normalize(3) }}
          />
          <Text style={styles.postDot}>•</Text>
          <Text style={styles.postTime} numberOfLines={1}>
            {post.time}
          </Text>
          {post.location ? (
            <View style={[styles.postTimeRow, styles.postLocationWrap]}>
              <Text style={styles.postDot}>•</Text>
              <Text
                style={[styles.postLocationText, styles.postLocationInlineText]}
                numberOfLines={1}
              >
                {post.location}
              </Text>
            </View>
          ) : null}
        </View>
        {!hideDistanceBadge && showDistanceBadge ? (
          <DistanceBadge
            distanceKm={hasKm ? km : null}
            stale={distanceStale}
            loading={distanceLoading}
            normalize={normalize}
            wrapStyle={styles.distanceBadgeWrap}
            chipStyle={styles.distanceBadgeChip}
          />
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
                const w = layout.width;
                if (w > 0 && w !== containerWidth) {
                  setContainerWidth(w);
                }
              }}
            >
              {tags.map((label, idx) => {
                if (showAllTagsForMeasure) {
                  return (
                    <View
                      key={`tag-${post?.id}-${idx}`}
                      style={styles.postTagChip}
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
                }
                if (useFallbackDisplay) {
                  return (
                    <View
                      key={`tag-${post?.id}-${idx}`}
                      style={styles.postTagChip}
                    >
                      <Text style={styles.postTagText} numberOfLines={1}>
                        {label}
                      </Text>
                    </View>
                  );
                }
                if (idx < visibleCount) {
                  return (
                    <View
                      key={`tag-${post?.id}-${idx}`}
                      style={styles.postTagChip}
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
                      <Text style={styles.postTagText} numberOfLines={1}>
                        {label}
                      </Text>
                    </View>
                  );
                }
                return null;
              })}
              {hiddenTagCount > 0 ? (
                <View style={[styles.postTagChip, styles.postTagMoreChip]}>
                  <Text
                    style={{
                      fontSize: normalize(fontSizes.md),
                      fontFamily: fonts.bold,
                      color: colors.primaryDark,
                      paddingHorizontal: normalize(6),
                      paddingVertical: normalize(2),
                    }}
                    numberOfLines={1}
                  >
                    +{hiddenTagCount}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {hasVisibleStats ? (
            <View style={[styles.postFooter, styles.postFooterStart]}>
              <View style={styles.postStats}>
                {likesCount > 0 ? (
                  <View style={styles.postStatItem}>
                    <FontAwesome
                      name="heart-o"
                      size={normalize(14)}
                      color={colors.alert}
                    />
                    <Text style={styles.postStatText}>{likesCount}</Text>
                  </View>
                ) : null}
                {commentsCount > 0 ? (
                  <View style={styles.postStatItem}>
                    <Ionicons
                      name="chatbubble-outline"
                      size={normalize(15)}
                      color={colors.primary}
                    />
                    <Text style={styles.postStatText}>{commentsCount}</Text>
                  </View>
                ) : null}
                {scrapCount > 0 ? (
                  <View style={styles.postStatItem}>
                    <Ionicons
                      name="bookmark-outline"
                      size={normalize(14)}
                      color={colors.scrap}
                    />
                    <Text style={styles.postStatText}>{scrapCount}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}
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

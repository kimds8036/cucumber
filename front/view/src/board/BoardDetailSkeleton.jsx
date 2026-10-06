import React from 'react';
import { View } from 'react-native';
import Skeleton from '../../../components/common/Skeleton';
import { colors } from '../../../styles/colors';

/** 게시글 상세 로딩 스켈레톤 — BoardPostContent · TopAdBanner · 댓글 헤더 · BoardCommentTree 모양 */
export default function BoardDetailSkeleton({
  styles,
  normalize,
  width,
  showDistanceBadge = true,
  showImage = true,
  showScrap = true,
}) {
  const statCount = showScrap ? 3 : 2;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: colors.white,
      }}
    >
      <View style={styles.contentSection}>
        <View style={styles.detailHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Skeleton
              width={normalize(52)}
              height={normalize(13)}
              borderRadius={normalize(6)}
            />
            <Skeleton
              width={normalize(36)}
              height={normalize(11)}
              borderRadius={normalize(5)}
              style={{ marginLeft: normalize(6) }}
            />
          </View>
          {showDistanceBadge ? (
            <Skeleton
              width={normalize(44)}
              height={normalize(18)}
              borderRadius={normalize(9)}
            />
          ) : null}
        </View>
        <Skeleton
          width="100%"
          height={normalize(14)}
          borderRadius={normalize(6)}
          style={{ marginBottom: normalize(6) }}
        />
        <Skeleton
          width="90%"
          height={normalize(14)}
          borderRadius={normalize(6)}
          style={{ marginBottom: normalize(6) }}
        />
        <Skeleton
          width="55%"
          height={normalize(14)}
          borderRadius={normalize(6)}
          style={{ marginBottom: normalize(13) }}
        />
        {showImage ? (
          <Skeleton
            width="100%"
            height={normalize(200)}
            borderRadius={normalize(10)}
            style={{ marginBottom: normalize(10) }}
          />
        ) : null}
        <View style={styles.detailFooter}>
          <View style={styles.detailStats}>
            {Array.from({ length: statCount }, (_, idx) => (
              <Skeleton
                key={`detail-stat-skel-${idx}`}
                width={normalize(30)}
                height={normalize(14)}
                borderRadius={normalize(6)}
              />
            ))}
          </View>
          <Skeleton
            width={normalize(14)}
            height={normalize(14)}
            borderRadius={normalize(7)}
          />
        </View>
      </View>

      <Skeleton
        width={width * 0.92}
        height={normalize(80)}
        borderRadius={normalize(20)}
        style={{ marginHorizontal: width * 0.04, marginVertical: normalize(10) }}
      />

      <View style={styles.commentGutter}>
        <View style={styles.commentListHeader}>
          <Skeleton
            width={normalize(44)}
            height={normalize(14)}
            borderRadius={normalize(6)}
          />
        </View>
      </View>

      {[0, 1, 2].map((idx) => (
        <View key={`detail-comment-skel-${idx}`}>
          <View style={styles.commentRow}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: normalize(4),
                minHeight: normalize(18),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Skeleton
                  width={normalize(60)}
                  height={normalize(12)}
                  borderRadius={normalize(6)}
                />
                <Skeleton
                  width={normalize(36)}
                  height={normalize(10)}
                  borderRadius={normalize(5)}
                  style={{ marginLeft: normalize(10) }}
                />
              </View>
              <Skeleton
                width={normalize(36)}
                height={normalize(12)}
                borderRadius={normalize(6)}
              />
            </View>
            <Skeleton
              width="100%"
              height={normalize(13)}
              borderRadius={normalize(6)}
              style={{ marginBottom: normalize(6) }}
            />
            <Skeleton
              width="65%"
              height={normalize(13)}
              borderRadius={normalize(6)}
            />
          </View>
          {idx < 2 ? <View style={styles.commentRowDividerInset} /> : null}
        </View>
      ))}
    </View>
  );
}

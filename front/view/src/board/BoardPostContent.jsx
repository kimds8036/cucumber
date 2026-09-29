import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '../../../styles/colors';
import DistanceBadge from '../../../components/DistanceBadge';
import EquippedBadge from '../../../components/EquippedBadge';
import PostImageSlider, {
  collectPostImageUris,
} from '../../../components/board/PostImageSlider';

/** 통계 숫자 — 99 초과는 99+ (칸 폭 고정용) */
function formatStatCount(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return '0';
  if (v > 99) return '99+';
  return String(Math.floor(v));
}

export default function BoardPostContent({
  post,
  postLiked,
  postScrapped,
  onLike,
  onScrap,
  onMenu,
  onTagPress,
  onImagePress,
  onImageLoad,
  imageRatios,
  styles,
  normalize,
  postMenuButtonRef,
  distanceStale = false,
  distanceLoading = false,
  showDistanceBadge = true,
}) {
  const distanceValid =
    typeof post.distanceKm === 'number' && !Number.isNaN(post.distanceKm);
  const imageUris = collectPostImageUris(post);
  const singleRatio = imageRatios?.[imageUris[0]];
  const singleIsPortrait = typeof singleRatio === 'number' && singleRatio < 1;
  return (
    <View style={styles.contentSection}>
      <View style={styles.detailHeader}>
        <View style={[styles.detailAuthorRow, { flex: 1, minWidth: 0 }]}>
          <Text style={styles.detailAuthorAnonymous} numberOfLines={1}>
            {post.author}
          </Text>
          <EquippedBadge
            badge={post.equippedBadge}
            size={normalize(13)}
            style={{ marginLeft: normalize(3), alignSelf: 'center' }}
          />
          <Text
            style={[styles.detailTime, { marginLeft: normalize(6) }]}
            numberOfLines={1}
          >
            {post.time}
          </Text>
          {post.location ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                flexShrink: 1,
              }}
            >
              <Text
                style={[
                  styles.detailLocationText,
                  { flexShrink: 1, minWidth: 0, marginLeft: normalize(10) },
                ]}
                numberOfLines={1}
              >
                {post.location}
              </Text>
            </View>
          ) : null}
        </View>
        {showDistanceBadge ? (
          <DistanceBadge
            distanceKm={distanceValid ? post.distanceKm : null}
            stale={distanceStale}
            loading={distanceLoading}
            normalize={normalize}
            wrapStyle={styles.distanceBadgeWrap}
            chipStyle={styles.distanceBadgeChip}
          />
        ) : null}
      </View>

      <Text style={[styles.detailBody, { marginBottom: normalize(7) }]}>
        {post.content}
      </Text>
      {imageUris.length === 1 ? (
        <View style={styles.detailImagesWrap}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onImagePress?.(imageUris[0])}
            style={styles.detailImageFrame}
          >
            <Image
              source={{ uri: imageUris[0] }}
              style={[
                styles.detailImage,
                singleIsPortrait
                  ? { aspectRatio: 1 }
                  : singleRatio
                    ? { aspectRatio: singleRatio }
                    : styles.detailImageFallback,
                styles.detailImageLast,
              ]}
              onLoad={(e) => onImageLoad?.(imageUris[0], e)}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      ) : null}
      {imageUris.length > 1 ? (
        <PostImageSlider
          uris={imageUris}
          height={normalize(200)}
          borderRadius={normalize(10)}
          onPress={(uri) => onImagePress?.(uri)}
          onFirstImageLoad={onImageLoad}
          style={styles.detailImagesWrap}
        />
      ) : null}
      {Array.isArray(post.tags) && post.tags.length > 0 ? (
        <View style={styles.detailTagsWrap}>
          {post.tags.map((tag, idx) => {
            const label =
              tag != null && typeof tag === 'object'
                ? String(tag.name ?? '')
                : String(tag ?? '');
            if (!label.trim()) return null;
            return (
              <TouchableOpacity
                key={tag?.id != null ? `tag-${tag.id}` : `tag-${idx}-${label}`}
                style={styles.detailTagChip}
                activeOpacity={0.7}
                onPress={() => onTagPress(label)}
              >
                <Text style={styles.detailTagText}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
      <View style={styles.detailFooter}>
        <View style={styles.detailStats}>
          <TouchableOpacity
            style={styles.detailStatItem}
            onPress={onLike}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.detailStatIcon}>
              <FontAwesome
                name={postLiked ? 'heart' : 'heart-o'}
                size={normalize(14)}
                color={colors.alert}
              />
            </View>
            <Text style={styles.detailStatText}>
              {formatStatCount(post.likes)}
            </Text>
          </TouchableOpacity>
          <View style={styles.detailStatItem}>
            <View style={styles.detailStatIcon}>
              <Ionicons
                name="chatbubble-outline"
                size={normalize(15)}
                color={colors.primary}
              />
            </View>
            <Text style={styles.detailStatText}>
              {formatStatCount(post.comments)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.detailStatItem}
            onPress={onScrap}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.detailStatIcon}>
              <Ionicons
                name={postScrapped ? 'bookmark' : 'bookmark-outline'}
                size={normalize(14)}
                color={colors.scrap}
              />
            </View>
            <Text style={styles.detailStatText}>
              {formatStatCount(post.scraps ?? 0)}
            </Text>
          </TouchableOpacity>
        </View>
        <View ref={postMenuButtonRef} collapsable={false}>
          <TouchableOpacity
            style={styles.detailMenuBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={onMenu}
          >
            <Entypo
              name="dots-three-vertical"
              size={normalize(14)}
              color={colors.textLight4}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

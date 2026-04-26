import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors, fonts } from '../../../styles/colors';

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
}) {
  return (
    <View style={styles.contentSection}>
      <View style={styles.detailHeader}>
        <View style={[styles.detailAuthorRow, { flex: 1, minWidth: 0 }]}>
          <Text style={post.author === '작성자' ? styles.detailAuthor : styles.detailAuthorAnonymous} numberOfLines={1}>
            {post.author}
          </Text>
          <Text style={styles.detailDot}>•</Text>
          <Text style={styles.detailTime} numberOfLines={1}>
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
              <Text style={styles.detailTime}>{' · '}</Text>
              <Text style={[styles.detailLocationText, { flexShrink: 1, minWidth: 0 }]} numberOfLines={1}>
                {post.location}
              </Text>
            </View>
          ) : null}
        </View>
        {typeof post.distanceKm === 'number' && !Number.isNaN(post.distanceKm) ? (
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
                backgroundColor: colors.primaryLight20,
                borderRadius: normalize(10),
                paddingHorizontal: normalize(7),
                paddingVertical: normalize(2),
              }}
            >
              <MaterialIcons name="location-on" size={normalize(10)} color={colors.primaryDark} />
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text
                  style={{
                    fontSize: normalize(11),
                    fontFamily: fonts.regular,
                    color: colors.primaryDark,
                  }}
                >
                  {post.distanceKm < 1 ? '1' : String(Math.round(post.distanceKm))}
                </Text>
                <Text
                  style={{
                    fontSize: normalize(10),
                    fontFamily: fonts.regular,
                    color: colors.primaryDark,
                  }}
                >
                  {post.distanceKm < 1 ? 'km 미만' : 'km'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      <Text style={[styles.detailBody, { marginBottom: normalize(7) }]}>{post.content}</Text>
      {Array.isArray(post.images) && post.images.length > 0 ? (
        <View style={styles.detailImagesWrap}>
          {post.images.map((uri, idx) => (
            <TouchableOpacity key={`${uri}-${idx}`} activeOpacity={0.85} onPress={() => onImagePress(uri)} style={{ width: '100%' }}>
              <Image
                source={{ uri }}
                style={[
                  styles.detailImage,
                  imageRatios[uri]
                    ? { width: undefined, maxWidth: '100%', aspectRatio: imageRatios[uri] }
                    : styles.detailImageFallback,
                  idx === post.images.length - 1 && styles.detailImageLast,
                ]}
                onLoad={(e) => onImageLoad(uri, e)}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {Array.isArray(post.tags) && post.tags.length > 0 ? (
        <View style={styles.detailTagsWrap}>
          {post.tags.map((tag, idx) => {
            const label = tag != null && typeof tag === 'object' ? String(tag.name ?? '') : String(tag ?? '');
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
            <FontAwesome name={postLiked ? 'heart' : 'heart-o'} size={normalize(14)} color={colors.alert} />
            <Text style={styles.detailStatText}>{post.likes}</Text>
          </TouchableOpacity>
          <View style={styles.detailStatItem}>
            <Ionicons name="chatbubble-outline" size={normalize(15)} color={colors.primary} />
            <Text style={styles.detailStatText}>{post.comments}</Text>
          </View>
          <TouchableOpacity
            style={styles.detailStatItem}
            onPress={onScrap}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={postScrapped ? 'bookmark' : 'bookmark-outline'}
              size={normalize(14)}
              color={colors.scrap}
            />
            <Text style={styles.detailStatText}>{post.scraps ?? 0}</Text>
          </TouchableOpacity>
        </View>
        <View ref={postMenuButtonRef} collapsable={false}>
          <TouchableOpacity
            style={styles.detailMenuBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={onMenu}
          >
            <Entypo name="dots-three-vertical" size={normalize(14)} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}


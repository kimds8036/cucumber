import React, { useState } from 'react';
import { View, Image, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../styles/colors';

export function collectPostImageUris(post) {
  const fromImages = Array.isArray(post?.images)
    ? post.images
        .filter((u) => typeof u === 'string' && u.trim())
        .map((u) => u.trim())
    : [];
  if (fromImages.length) return fromImages;
  const thumb =
    typeof post?.thumbnail === 'string' ? post.thumbnail.trim() : '';
  return thumb ? [thumb] : [];
}

/**
 * 정사각 사진을 틈 없이 이어 붙인 가로 체인.
 */
export default function PostImageSlider({
  uris,
  height = 200,
  borderRadius = 10,
  onPress,
  onFirstImageLoad,
  style,
}) {
  const list = Array.isArray(uris)
    ? uris.filter((u) => typeof u === 'string' && u.trim())
    : [];
  const [width, setWidth] = useState(0);

  if (!list.length) return null;

  const tile = width > 0 ? Math.round(Math.min(width * 0.7, height * 1.15)) : height;
  const gap = 6;

  return (
    <View
      style={style}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && w !== width) setWidth(w);
      }}
    >
      <ScrollView
        horizontal
        nestedScrollEnabled
        scrollEnabled={list.length > 1}
        showsHorizontalScrollIndicator={false}
        decelerationRate="normal"
        keyboardShouldPersistTaps="handled"
      >
        {list.map((uri, i) => (
          <TouchableOpacity
            key={`${uri}-${i}`}
            activeOpacity={0.9}
            onPress={() => onPress?.(uri, i)}
            style={{ marginRight: i === list.length - 1 ? 0 : gap }}
          >
            <Image
              source={{ uri }}
              style={{
                width: tile,
                height: tile,
                backgroundColor: colors.textLight10,
                borderRadius,
              }}
              resizeMode="cover"
              onLoad={(e) => {
                if (i === 0) onFirstImageLoad?.(uri, e);
              }}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

import React from 'react';
import { Image, View } from 'react-native';
import ProfileIcon from '../assets/Profile.svg';
import {
  getProfileInnerColor,
  getProfileInnerColorBySeed,
} from '../utils/profileIconColor';

export function pickAvatarUrl(source) {
  if (!source || typeof source !== 'object') return null;
  const raw =
    source.avatarUrl ||
    source.avatar_url ||
    source.other_user_avatar_url ||
    null;
  const url = typeof raw === 'string' ? raw.trim() : '';
  return url || null;
}

export default function UserAvatar({
  uri,
  size,
  colorId,
  seed,
  borderRadius,
  style,
}) {
  const r = borderRadius != null ? borderRadius : size / 2;
  const color =
    getProfileInnerColor(colorId) ||
    (seed != null ? getProfileInnerColorBySeed(seed) : undefined);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          { width: size, height: size, borderRadius: r, overflow: 'hidden' },
          style,
        ]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: r,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <ProfileIcon width={size} height={size} color={color} />
    </View>
  );
}

import React from 'react';
import { Image, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { resolveEquippedBadge } from '../constants/badges';

export default function EquippedBadge({ badge, size = 16, style }) {
  const resolved = resolveEquippedBadge(badge);
  if (!resolved) return null;
  return (
    <View style={[{ justifyContent: 'center', alignItems: 'center' }, style]}>
      {resolved.image ? (
        <Image
          source={resolved.image}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      ) : (
        <Ionicons name={resolved.icon} size={size} color={resolved.color} />
      )}
    </View>
  );
}

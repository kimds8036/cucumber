import React from 'react';
import { Text, View } from 'react-native';
import { fonts } from '../../../../styles/colors';

function formatBannerDate(dateKey) {
  if (!dateKey) return '';
  const parts = dateKey.split('-').map(Number);
  if (parts.length < 3) return dateKey;
  const [y, m, d] = parts;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - target) / 86400000);

  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  return `${m}월 ${d}일`;
}

export default function DateBanner({ date, normalize }) {
  const n = typeof normalize === 'function' ? normalize : (v) => v;
  return (
    <View style={{ alignItems: 'center', paddingVertical: n(10) }}>
      <View
        style={{
          backgroundColor: '#EEEEEE',
          paddingHorizontal: n(12),
          paddingVertical: n(4),
          borderRadius: n(12),
        }}
      >
        <Text
          style={{
            fontSize: n(12),
            color: '#666666',
            fontFamily: fonts?.regular,
          }}
        >
          {formatBannerDate(date)}
        </Text>
      </View>
    </View>
  );
}

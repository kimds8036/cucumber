import React from 'react';
import { Text, View } from 'react-native';
import { colors, fonts } from '../../styles/colors';

/**
 * 등교중 배너 — 슬롯 인프라만. 디자인 확정 전 뼈대.
 * API 없으면 null (송출 X / Tip 금지).
 */
export default function CommuteAdBanner({ adData }) {
  if (adData == null) return null;

  // 디자인 보류: 개발 빌드에서만 슬롯 점유 확인용 마크
  if (__DEV__) {
    return (
      <View
        pointerEvents="none"
        style={{
          marginRight: 4,
          paddingHorizontal: 4,
          paddingVertical: 2,
          borderRadius: 4,
          backgroundColor: colors.primaryLight20,
        }}
      >
        <Text
          style={{
            fontSize: 9,
            fontFamily: fonts.regular,
            color: colors.textSecondary,
          }}
        >
          ad
        </Text>
      </View>
    );
  }

  return null;
}

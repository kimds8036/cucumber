import React from 'react';
import { View } from 'react-native';
import Skeleton from '../../../../components/common/Skeleton';
import { colors } from '../../../../styles/colors';

/**
 * 채팅 리스트 로딩 스켈레톤 (기본 막대형).
 * 헤더·입력창은 ChatScreen에서 실제 컴포넌트가 표시됨.
 */
export default function ChatLoadingSkeleton({ normalize }) {
  const n = typeof normalize === 'function' ? normalize : (v) => v;
  const barWidths = ['58%', '72%', '48%', '64%'];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'flex-end',
        paddingHorizontal: n(6),
        paddingBottom: n(12),
        gap: n(10),
      }}
    >
      {barWidths.map((width, i) => (
        <Skeleton
          key={`chat-skel-${i}`}
          width={width}
          height={n(14)}
          borderRadius={n(6)}
        />
      ))}
    </View>
  );
}

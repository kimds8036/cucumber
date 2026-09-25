import React, { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { getNormalize } from '../../styles/frame.style';
import { colors } from '../../styles/colors';

/**
 * 헤더 아래(또는 게시글과 댓글 사이) 배너 자리.
 * 지금은 빈 사각형만 둔다. 공지·광고 내용은 나중에 채운다.
 */
export default function TopAdBanner({ inset = true }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);

  return (
    <View
      style={{
        height: normalize(100),
        borderRadius: normalize(20),
        overflow: 'hidden',
        backgroundColor: colors.primaryLight2,
        marginHorizontal: inset ? width * 0.04 : 0,
        marginBottom: normalize(4),
      }}
    />
  );
}

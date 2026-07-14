import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';

/**
 * 스플래시 전면 광고 껍데기.
 * 레이아웃 예정: [중앙] 브랜드 로고 → [하단] 광고(이미지·제목·문구) + 로딩바
 * 타이밍: 1.5s skip / 4s auto finish
 *
 * TODO: /api/ads 연동 후 splash 슬롯으로 실제 렌더 구현
 */
export default function SplashAd({ ad, onFinish }) {
  const { width, height } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createStyles(normalize, width, height),
    [normalize, width, height],
  );

  // API 연동 전: 표시하지 않음
  void ad;
  void onFinish;
  void styles;
  return null;
}

function createStyles(n, width, height) {
  return StyleSheet.create({
    root: {
      flex: 1,
      width,
      height,
      backgroundColor: colors.background,
    },
    // TODO: centerBlock / brandBlock / adFooter / progress / skip 스타일 복원
  });
}

import React from 'react';
import { ActivityIndicator } from 'react-native';
import { colors } from '../styles/colors';

/**
 * 앱 공통 로딩 스피너 (ActivityIndicator 래퍼)
 * @param {'small' | 'large'} [size] 생략 시 RN 기본(보통 small)
 * @param {string} [color] 생략 시 colors.primary
 */
export default function Loading({ size, color, style, ...rest }) {
  return (
    <ActivityIndicator
      {...(size !== undefined ? { size } : {})}
      color={color ?? colors.primary}
      style={style}
      {...rest}
    />
  );
}

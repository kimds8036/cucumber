import React from 'react';
import { colors } from '../styles/colors';
import Skeleton from './common/Skeleton';

/**
 * 앱 공통 로딩 스켈레톤
 * @param {'small' | 'large'} [size] 생략 시 RN 기본(보통 small)
 * @param {string} [color] 생략 시 colors.primary
 */
export default function Loading({ size, color, style, ...rest }) {
  const px = size === 'large' ? 28 : 14;
  return (
    <Skeleton
      width={px}
      height={px}
      borderRadius={px / 2}
      style={style}
      {...rest}
    />
  );
}

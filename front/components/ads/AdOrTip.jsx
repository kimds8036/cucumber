import React from 'react';
import { getAdFallbackPolicy } from '../../constants/adPlacements';
import TipPlaceholder from './TipPlaceholder';

/**
 * 광고 데이터가 있으면 Ad만, 없고 tip 정책이면 Tip만 렌더.
 * hide 정책이거나 Tip도 불필요하면 null.
 */
export default function AdOrTip({
  adData,
  placement,
  tipVariant = 'board',
  tipProps,
  children,
}) {
  if (adData != null) {
    return typeof children === 'function' ? children(adData) : children;
  }

  if (getAdFallbackPolicy(placement) === 'tip') {
    return <TipPlaceholder variant={tipVariant} {...(tipProps || {})} />;
  }

  return null;
}

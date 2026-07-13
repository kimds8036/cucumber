import React, { useMemo } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { getNormalize } from '../../styles/frame.style';
import { createAdStyles } from '../../styles/ad.style';
import { AD_PLACEMENTS } from '../../constants/adPlacements';
import AdOrTip from './AdOrTip';
import { AdPill } from './PillBadge';

/**
 * 상단 고정 배너 — 검색창(searchscreen) 배너와 동일 디자인.
 * boardAll / searchscreen / SearchResult / boardDetail 에서 재사용.
 */
export default function TopAdBanner({ styles: externalStyles, adData }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const adStyles = useMemo(
    () => createAdStyles(normalize, width),
    [normalize, width],
  );
  const s = externalStyles || adStyles;

  return (
    <AdOrTip
      adData={adData}
      placement={AD_PLACEMENTS.TOP_BANNER}
      tipVariant="topBanner"
      tipProps={{ styles: s, normalize, badgeOnLeft: true }}
    >
      {(data) => {
        const displayLabel =
          data?.title ||
          data?.label ||
          data?.body ||
          data?.content ||
          '광고';
        return (
          <View style={s.adSection}>
            <View style={s.adSectionRow}>
              <View style={s.adSectionBadge}>
                <AdPill />
              </View>
              <Text style={s.adSectionText} numberOfLines={2}>
                {displayLabel}
              </Text>
            </View>
          </View>
        );
      }}
    </AdOrTip>
  );
}

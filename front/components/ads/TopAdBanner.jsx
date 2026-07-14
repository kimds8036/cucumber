import React, { useMemo } from 'react';
import { Image, Text, View, useWindowDimensions } from 'react-native';
import { getNormalize } from '../../styles/frame.style';
import { createAdStyles } from '../../styles/ad.style';
import TipPlaceholder from './TipPlaceholder';
import { AdPill } from './PillBadge';

/**
 * 상단 고정 배너 — 검색창(searchscreen) 배너와 동일 디자인.
 * boardAll / searchscreen / SearchResult / boardDetail 에서 재사용.
 *
 * TODO: /api/ads 연동 후 useAdSlots + pickAdForPlacement로 adData 공급
 */
export default function TopAdBanner({ styles: externalStyles, adData: adDataProp }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const adStyles = useMemo(
    () => createAdStyles(normalize, width),
    [normalize, width],
  );
  const s = externalStyles || adStyles;
  const titleStyle = adStyles.adSectionTitle;
  const bodyStyle = adStyles.adSectionBody;

  // API 연동 전: prop 없으면 null → tip 폴백
  const ad = adDataProp !== undefined ? adDataProp : null;

  if (ad == null) {
    return (
      <TipPlaceholder
        variant="topBanner"
        styles={s}
        normalize={normalize}
        badgeOnLeft
      />
    );
  }

  const title = ad.title || ad.label || '광고';
  const body = ad.body || ad.content || '';

  return (
    <View style={s.adSection}>
      <View style={s.adSectionRow}>
        <View style={s.adSectionBadge}>
          <AdPill />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={titleStyle} numberOfLines={1}>
            {title}
          </Text>
          {body ? (
            <Text style={bodyStyle} numberOfLines={1}>
              {body}
            </Text>
          ) : null}
        </View>
        {ad.imageUrl ? (
          <Image
            source={{ uri: ad.imageUrl }}
            style={{ width: normalize(40), height: normalize(40), borderRadius: 6 }}
          />
        ) : null}
      </View>
    </View>
  );
}

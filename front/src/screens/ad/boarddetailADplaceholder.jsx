import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { getNormalize } from '../../../styles/frame.style';
import { createAdStyles } from '../../../styles/ad.style';
import TipPlaceholder from '../../../components/ads/TipPlaceholder';
import { AdPill } from '../../../components/ads/PillBadge';

export default function boarddetailADplaceholder({
  styles,
  label = '광고',
  adData,
  badgeOnLeft = false,
}) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const adStyles = useMemo(
    () => createAdStyles(normalize, width),
    [normalize, width],
  );
  const s = styles || adStyles;

  if (adData == null) {
    return (
      <TipPlaceholder
        variant="boardDetail"
        styles={s}
        normalize={normalize}
        badgeOnLeft={badgeOnLeft}
      />
    );
  }

  const displayLabel =
    adData?.label ?? adData?.title ?? adData?.content ?? label;

  if (badgeOnLeft) {
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
  }

  return (
    <View style={s.adSection}>
      <Text style={s.adSectionText}>{displayLabel}</Text>
    </View>
  );
}

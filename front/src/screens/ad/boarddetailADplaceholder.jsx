import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { getNormalize } from '../../../styles/frame.style';
import { createAdStyles } from '../../../styles/ad.style';

export default function boarddetailADplaceholder({
  styles,
  label = '광고',
  adData,
}) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const adStyles = useMemo(
    () => createAdStyles(normalize, width),
    [normalize, width],
  );
  const s = styles || adStyles;
  const displayLabel =
    adData?.label ?? adData?.title ?? adData?.content ?? label;

  return (
    <View style={s.adSection}>
      <Text style={s.adSectionText}>{displayLabel}</Text>
    </View>
  );
}

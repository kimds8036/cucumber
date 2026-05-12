import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { getNormalize } from '../../../styles/frame.style';
import { createAdStyles } from '../../../styles/ad.style';

export default function boarddetailADplaceholder({ styles, label = '광고' }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const adStyles = useMemo(
    () => createAdStyles(normalize, width),
    [normalize, width]
  );
  const s = styles || adStyles;

  return (
    <View style={s.adSection}>
      <Text style={s.adSectionText}>{label}</Text>
    </View>
  );
}

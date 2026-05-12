import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { getNormalize } from '../../../styles/frame.style';
import { createAdStyles } from '../../../styles/ad.style';

const SearchAdPlaceholder = () => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const s = useMemo(
    () => createAdStyles(normalize, width),
    [normalize, width],
  );

  return (
    <View style={s.fullCard}>
      <View style={s.contentTimeRow}>
        <View style={s.snippetWrap}>
          <Text style={s.fullSnippet}>여기에 광고가 표시됩니다.</Text>
        </View>
        <Text style={s.metaTimeInline}>광고</Text>
      </View>
    </View>
  );
};

export default SearchAdPlaceholder;

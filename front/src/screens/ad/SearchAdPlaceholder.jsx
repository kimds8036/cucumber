import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { getNormalize } from '../../../styles/frame.style';
import { createAdStyles } from '../../../styles/ad.style';

const SearchAdPlaceholder = ({ adData }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const s = useMemo(() => createAdStyles(normalize, width), [normalize, width]);
  const contentText =
    adData?.content ?? adData?.body ?? '여기에 광고가 표시됩니다.';

  return (
    <View style={s.fullCard}>
      <View style={s.contentTimeRow}>
        <View style={s.snippetWrap}>
          <Text style={s.fullSnippet}>{contentText}</Text>
        </View>
        <Text style={s.metaTimeInline}>광고</Text>
      </View>
    </View>
  );
};

export default SearchAdPlaceholder;

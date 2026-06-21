import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { getNormalize } from '../../../styles/frame.style';
import { createAdStyles } from '../../../styles/ad.style';
import TipPlaceholder from '../../../components/ads/TipPlaceholder';
import { AdPill } from '../../../components/ads/PillBadge';

const SearchAdPlaceholder = ({ adData, borderStyle }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const s = useMemo(() => createAdStyles(normalize, width), [normalize, width]);
  const cardBorderless = borderStyle ? { borderBottomWidth: 0 } : null;
  const contentText =
    adData?.content ?? adData?.body ?? '여기에 광고가 표시됩니다.';

  const content =
    adData == null ? (
      <TipPlaceholder
        variant="search"
        styles={s}
        normalize={normalize}
        cardStyleOverride={cardBorderless}
      />
    ) : (
      <View style={[s.fullCard, cardBorderless]}>
        <View style={s.contentTimeRow}>
          <View style={s.snippetWrap}>
            <Text style={s.fullSnippet}>{contentText}</Text>
          </View>
          <AdPill />
        </View>
      </View>
    );

  if (borderStyle) {
    return <View style={borderStyle}>{content}</View>;
  }

  return content;
};

export default SearchAdPlaceholder;

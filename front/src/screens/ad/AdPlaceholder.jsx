import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { getNormalize } from '../../../styles/frame.style';
import { createAdStyles } from '../../../styles/ad.style';
import TipPlaceholder from '../../../components/ads/TipPlaceholder';
import { AdPill } from '../../../components/ads/PillBadge';

const AdPlaceholder = ({ styles, normalize, adData }) => {
  const { width } = useWindowDimensions();
  const localNormalize = useMemo(() => getNormalize(width), [width]);
  const adStyles = useMemo(
    () => createAdStyles(normalize || localNormalize, width),
    [normalize, localNormalize, width],
  );
  const s = styles || adStyles;

  if (adData == null) {
    return (
      <TipPlaceholder variant="board" styles={s} normalize={normalize || localNormalize} />
    );
  }

  const sponsorLabel = adData?.sponsor ?? adData?.author ?? '스폰서';
  const contentText =
    adData?.content ?? adData?.body ?? '여기에 광고가 표시됩니다.';

  return (
    <View style={s.postItem}>
      <View style={s.postHeader}>
        <View style={s.postAuthorRow}>
          <Text style={s.postAuthor}>{sponsorLabel}</Text>
          <Text style={s.postDot}>•</Text>
          <Text style={s.postTime}>광고</Text>
        </View>
        <AdPill />
      </View>

      <View style={s.postBodyRow}>
        <View style={s.postBodyColumn}>
          <Text style={[s.postContent, s.postContentCompact]}>
            {contentText}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default AdPlaceholder;

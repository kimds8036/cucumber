import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { colors, fonts } from '../../../styles/colors';
import { useWindowDimensions } from 'react-native';
import { getNormalize } from '../../../styles/frame.style';
import { createAdStyles } from '../../../styles/ad.style';

const AdPlaceholder = ({ styles, normalize }) => {
  const { width } = useWindowDimensions();
  const localNormalize = useMemo(() => getNormalize(width), [width]);
  const adStyles = useMemo(
    () => createAdStyles(normalize || localNormalize, width),
    [normalize, localNormalize, width],
  );
  const s = styles || adStyles;

  return (
    <View style={s.postItem}>
      <View style={s.postHeader}>
        <View style={s.postAuthorRow}>
          <Text style={s.postAuthor}>스폰서</Text>
          <Text style={s.postDot}>•</Text>
          <Text style={s.postTime}>광고</Text>
        </View>
      </View>

      <View style={s.postBodyRow}>
        <View style={s.postBodyColumn}>
          <Text style={[s.postContent, s.postContentCompact]}>
            여기에 광고가 표시됩니다.
          </Text>
          <View style={s.postFooter}>
            <View style={s.postStats}>
              <Text
                style={[
                  s.postStatText,
                  { fontFamily: fonts.regular, color: colors.textSecondary },
                ]}
              >
                AD
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default AdPlaceholder;

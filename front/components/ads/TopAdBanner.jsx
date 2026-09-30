import React, { useMemo, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { getNormalize } from '../../styles/frame.style';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { pickBanner } from '../../constants/bannerAssets';

/**
 * 헤더 아래(또는 게시글과 댓글 사이) 배너.
 * 배경 이미지 위에 왼쪽 두 줄 문구를 올린다.
 *
 * picked 를 넘기면 마운트마다 다시 뽑지 않는다.
 * @param {{ inset?: boolean, placement?: 'board' | 'message' | 'school' | 'timer', picked?: { source: number, copy: { line1: string, line2: string } }, onPress?: () => void }} props
 */
export default function TopAdBanner({ inset = true, placement, picked: pickedProp, onPress }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const [pickedState] = useState(() => pickedProp ?? pickBanner(placement));
  const picked = pickedProp ?? pickedState;
  const styles = useMemo(() => createStyles(normalize), [normalize]);

  const banner = (
    <ImageBackground
      source={picked.source}
      style={[
        styles.wrap,
        {
          marginHorizontal: inset ? width * 0.04 : 0,
        },
      ]}
      imageStyle={styles.image}
      resizeMode="stretch"
      accessibilityIgnoresInvertColors
    >
      <View style={styles.copyCol} pointerEvents="none">
        <Text style={styles.line1} numberOfLines={1}>
          {picked.copy.line1}
        </Text>
        <Text style={styles.line2} numberOfLines={2}>
          {picked.copy.line2}
        </Text>
      </View>
    </ImageBackground>
  );

  if (!onPress) return banner;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${picked.copy.line1} ${picked.copy.line2}`}
    >
      {banner}
    </Pressable>
  );
}

function createStyles(normalize) {
  return StyleSheet.create({
    wrap: {
      height: normalize(80),
      borderRadius: normalize(20),
      overflow: 'hidden',
      backgroundColor: colors.white,
      marginBottom: normalize(10),
      justifyContent: 'center',
    },
    image: {
      borderRadius: normalize(20),
    },
    copyCol: {
      maxWidth: '58%',
      marginLeft: normalize(14),
      paddingVertical: normalize(8),
      paddingHorizontal: normalize(10),
      backgroundColor: 'transparent',
      zIndex: 2,
      elevation: 2,
    },
    line1: {
      fontFamily: fonts.bold,
      fontSize: normalize(14),
      lineHeight: normalize(19),
      color: '#1C1C1C',
    },
    line2: {
      marginTop: normalize(2),
      fontFamily: fonts.regular,
      fontSize: normalize(11),
      lineHeight: normalize(15),
      color: '#555555',
    },
  });
}

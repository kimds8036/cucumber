import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';

const DEFAULT_MIN_MS = 1500;
const DEFAULT_MAX_MS = 4000;

/**
 * 스플래시 전면 이미지 광고.
 * API 없거나 imageUrl 없으면 호출측에서 마운트하지 않는다.
 */
export default function SplashAd({
  ad,
  onFinish,
  minMs = DEFAULT_MIN_MS,
  maxMs = DEFAULT_MAX_MS,
}) {
  const { width, height } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createStyles(normalize, width, height),
    [normalize, width, height],
  );
  const finishedRef = useRef(false);
  const [canSkip, setCanSkip] = useState(false);

  const finish = useRef(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.();
  }).current;

  useEffect(() => {
    const minTimer = setTimeout(() => setCanSkip(true), minMs);
    const maxTimer = setTimeout(() => finish(), maxMs);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, [finish, minMs, maxMs]);

  if (!ad?.imageUrl) {
    return null;
  }

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: ad.imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />
      {canSkip ? (
        <Pressable
          style={styles.skipBtn}
          onPress={finish}
          hitSlop={12}
        >
          <Text style={styles.skipText}>건너뛰기</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(n, width, height) {
  return StyleSheet.create({
    root: {
      flex: 1,
      width,
      height,
      backgroundColor: colors.background,
    },
    image: {
      ...StyleSheet.absoluteFillObject,
      width,
      height,
    },
    skipBtn: {
      position: 'absolute',
      top: n(56),
      right: n(20),
      paddingHorizontal: n(14),
      paddingVertical: n(8),
      borderRadius: n(16),
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    skipText: {
      fontFamily: fonts.regular,
      fontSize: n(fontSizes.lg),
      color: colors.background,
    },
  });
}

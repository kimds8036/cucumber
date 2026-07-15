import React, { useEffect, useRef } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const SPLASH_BG = '#E5F4E0';
/** 네이티브 expo-splash-screen imageWidth(220dp) 와 맞춤 */
const LOGO_WIDTH = 220;
const LOGO_ASPECT =
  Platform.OS === 'android' ? 880 / 692 : 220 / 173;
const FADE_MS = 1000;

const LOGO_SOURCE =
  Platform.OS === 'android'
    ? require('../../assets/splash-icon-android.png')
    : require('../../assets/splash-icon.png');

/**
 * 네이티브 스플래시 hide 직후 동일한 배경 위에서
 * 로고(+ Android: Youth Paper 텍스트)를 opacity 0→1 로 Fade-in.
 */
export default function AnimatedBrandSplash({ onFinished }) {
  const opacity = useSharedValue(0);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    const finish = () => {
      onFinishedRef.current?.();
    };
    opacity.value = withTiming(
      1,
      { duration: FADE_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(finish)();
        }
      },
    );
  }, [opacity]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.root} pointerEvents="auto">
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Image
          source={LOGO_SOURCE}
          style={styles.logo}
          resizeMode="contain"
        />
        {Platform.OS === 'android' ? (
          <Text style={styles.brand}>Youth Paper</Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_BG,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_WIDTH / LOGO_ASPECT,
  },
  brand: {
    marginTop: 12,
    fontFamily: 'Baloo2-Bold',
    fontSize: 22,
    color: '#6f9163',
    letterSpacing: 0.2,
  },
});

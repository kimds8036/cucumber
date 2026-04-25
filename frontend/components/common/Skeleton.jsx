import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { colors } from '../../styles/colors';

export default function Skeleton({
  width = 24,
  height = 24,
  borderRadius = 8,
  style,
}) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          opacity,
          backgroundColor: colors.textLight10,
        },
        style,
      ]}
    />
  );
}

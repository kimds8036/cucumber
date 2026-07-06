import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View, Text, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getNormalize } from '../styles/frame.style';
import { createCommuteHeaderStyles } from '../styles/commute.style';
import { colors } from '../styles/colors';
import { useLocationContext } from '../context/LocationContext';
import { useCommuteAttendance } from '../hooks/useCommuteAttendance';

const DOT_COUNT = 3;

function CommuteDots({ styles, activeIndex }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              opacity: i === activeIndex ? 1 : 0.28,
              transform: [{ scale: i === activeIndex ? 1.2 : 1 }],
            },
          ]}
        />
      ))}
    </View>
  );
}

/** 메인 헤더 우측 — 검색·알림 앞 등교 인디케이터 */
export default function CommuteHeaderIndicator({ enabled = true }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createCommuteHeaderStyles(normalize), [normalize, width]);

  const { coords } = useLocationContext();
  const { phase, activeDot, dismissAfterCelebrate } = useCommuteAttendance({
    enabled,
    viewerCoords: coords,
  });

  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const sparkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase !== 'celebrate') return undefined;

    opacity.setValue(1);
    scale.setValue(1);
    sparkle.setValue(0);

    const anim = Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.15,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(sparkle, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(sparkle, {
            toValue: 0.35,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle, {
            toValue: 0.5,
            duration: 180,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.delay(350),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]);

    anim.start(({ finished }) => {
      if (finished) dismissAfterCelebrate();
    });

    return () => anim.stop();
  }, [phase, dismissAfterCelebrate, opacity, scale, sparkle]);

  if (phase === 'hidden') return null;

  return (
    <Animated.View
      style={[styles.chip, { opacity, transform: [{ scale }] }]}
      pointerEvents="none"
    >
      {phase === 'celebrate' ? (
        <View style={styles.celebrateRow}>
          <Animated.View style={{ opacity: sparkle }}>
            <Ionicons
              name="sparkles"
              size={normalize(14)}
              color={colors.primaryDark}
            />
          </Animated.View>
          <Text style={styles.sparkle}>등교 완료</Text>
          <Ionicons
            name="checkmark-circle"
            size={normalize(14)}
            color={colors.primaryDark}
          />
        </View>
      ) : (
        <>
          <Ionicons
            name="walk"
            size={normalize(14)}
            color={colors.primaryDark}
          />
          <CommuteDots styles={styles} activeIndex={activeDot} />
          <Text style={styles.label} numberOfLines={1}>
            등교중
          </Text>
        </>
      )}
    </Animated.View>
  );
}

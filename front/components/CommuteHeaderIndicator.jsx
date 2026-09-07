import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  View,
  Text,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { getNormalize } from '../styles/frame.style';
import { createCommuteHeaderStyles } from '../styles/commute.style';
import { colors } from '../styles/colors';
import { useLocationContext } from '../context/LocationContext';
import { useCommuteAttendance } from '../hooks/useCommuteAttendance';
import CommuteAdBanner from './ads/CommuteAdBanner';
import { isCommuteTimeWindow } from '../utils/commuteUtils';

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
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createCommuteHeaderStyles(normalize),
    [normalize, width],
  );

  const { coords } = useLocationContext();
  const { phase, activeDot, dismissAfterCelebrate } = useCommuteAttendance({
    enabled,
    viewerCoords: coords,
  });
  const commuteAd = null;

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

  const openGame = () => {
    // 세션: 등교 창(오전 10시 전)에서만 진입. 이미 연 게임은 화면에서 계속 진행.
    if (!isCommuteTimeWindow() && !(typeof __DEV__ !== 'undefined' && __DEV__)) {
      return;
    }
    navigation.navigate('CommuteBreakout');
  };

  if (phase === 'hidden') return null;

  const canOpenGame = phase === 'tracking' || phase === 'celebrate';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <CommuteAdBanner adData={commuteAd} />
      <Pressable
        onPress={canOpenGame ? openGame : undefined}
        disabled={!canOpenGame}
        accessibilityRole="button"
        accessibilityLabel="등교 미니게임 열기"
      >
        <Animated.View
          style={[styles.chip, { opacity, transform: [{ scale }] }]}
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
              <FontAwesome5
                name="walking"
                size={normalize(12)}
                color={colors.primaryDark}
              />
              <CommuteDots styles={styles} activeIndex={activeDot} />
              <Text style={styles.label} numberOfLines={1}>
                등교중
              </Text>
            </>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts } from '../styles/colors';

const DOT_PHASES = [
  '.',
  '..',
  '...',
  '....',
  '.....',
  '......',
  '.......',
  '........',
];

function formatDistance(km) {
  if (typeof km !== 'number' || Number.isNaN(km)) return null;
  if (km < 1) return { number: '1', unit: 'km 미만' };
  return { number: String(Math.round(km)), unit: 'km' };
}

const FRESH_THEME = {
  chipBg: colors.primaryLight20,
  accent: colors.primaryDark,
};

const STALE_THEME = {
  chipBg: colors.distanceStaleChipBg,
  accent: colors.distanceStaleOnChip,
};

function BadgeDots({ accent, normalize }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPhase((p) => (p + 1) % DOT_PHASES.length);
    }, 450);
    return () => clearInterval(id);
  }, []);

  return (
    <View
      style={{
        width: normalize(20),
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: normalize(11),
          fontFamily: fonts.regular,
          color: accent,
        }}
      >
        {DOT_PHASES[phase]}
      </Text>
    </View>
  );
}

/**
 * 거리(km) 배지 — 좌표 없음: 주황 칩, coords 있음(캐시·GPS): 초록 칩. loading 시 주황 칩 + 점 애니메이션.
 */
export default function DistanceBadge({
  distanceKm,
  stale = false,
  loading = false,
  normalize,
  wrapStyle,
  chipStyle,
}) {
  const formatted = useMemo(() => formatDistance(distanceKm), [distanceKm]);
  const showDots = loading && !formatted;
  const theme = stale || showDots ? STALE_THEME : FRESH_THEME;
  const opacity = useSharedValue(1);
  const prevKeyRef = useRef(null);

  const displayKey = showDots
    ? 'dots'
    : formatted
      ? `${formatted.number}-${formatted.unit}`
      : 'empty';

  useEffect(() => {
    const key = `${stale ? 's' : 'f'}-${displayKey}`;
    if (prevKeyRef.current != null && prevKeyRef.current !== key) {
      opacity.value = 0.45;
      opacity.value = withTiming(1, { duration: 220 });
    }
    prevKeyRef.current = key;
  }, [displayKey, stale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const layoutChip = chipStyle ? StyleSheet.flatten(chipStyle) : {};
  const { backgroundColor: _bg, color: _c, ...chipLayoutOnly } = layoutChip;

  if (!formatted && !showDots) {
    return null;
  }

  return (
    <View style={wrapStyle}>
      <Animated.View
        style={[
          chipLayoutOnly,
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: normalize(1),
            backgroundColor: theme.chipBg,
            borderRadius: normalize(10),
            paddingHorizontal: normalize(7),
            paddingVertical: normalize(2),
          },
          animStyle,
        ]}
      >
        <MaterialIcons
          name="location-on"
          size={normalize(10)}
          color={theme.accent}
        />
        {showDots ? (
          <BadgeDots accent={theme.accent} normalize={normalize} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text
              style={{
                fontSize: normalize(11),
                fontFamily: fonts.regular,
                color: theme.accent,
              }}
            >
              {formatted.number}
            </Text>
            <Text
              style={{
                fontSize: normalize(10),
                fontFamily: fonts.regular,
                color: theme.accent,
              }}
            >
              {formatted.unit}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

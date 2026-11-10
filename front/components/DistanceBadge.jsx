import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts } from '../styles/colors';
import Skeleton from './common/Skeleton';

function formatDistance(km) {
  if (typeof km !== 'number' || Number.isNaN(km)) return null;
  if (km < 1) return { number: '1', unit: 'km 미만' };
  return { number: String(Math.round(km)), unit: 'km' };
}

const FRESH_THEME = {
  chipBg: colors.primaryLight3,
  accent: colors.primaryDark,
};

const CHIP_LABEL_STYLE = {
  fontFamily: fonts.regular,
};

/** 거리 숫자 자리. 로딩 스켈레톤이 실제 칩과 같은 칸을 쓰도록 0km 칩을 재서 맞춘다. */
function DistanceLoadingChip({ normalize }) {
  const radius = normalize(10);
  const [box, setBox] = useState(null);
  const labelStyle = {
    ...CHIP_LABEL_STYLE,
    fontSize: normalize(10),
  };

  return (
    <View
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width <= 0 || height <= 0) return;
        setBox((prev) =>
          prev && prev.width === width && prev.height === height
            ? prev
            : { width, height },
        );
      }}
      style={{
        alignSelf: 'flex-start',
        borderRadius: radius,
        overflow: 'hidden',
      }}
    >
      <View
        pointerEvents="none"
        style={{
          opacity: 0,
          flexDirection: 'row',
          alignItems: 'center',
          gap: normalize(1),
          paddingHorizontal: normalize(7),
          paddingVertical: normalize(2),
        }}
      >
        <MaterialIcons
          name="location-on"
          size={normalize(10)}
          color={colors.primaryDark}
        />
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={labelStyle}>0</Text>
          <Text style={labelStyle}>km</Text>
        </View>
      </View>
      <Skeleton
        width={box?.width ?? normalize(46)}
        height={box?.height ?? normalize(18)}
        borderRadius={radius}
        style={{ position: 'absolute', left: 0, top: 0 }}
      />
    </View>
  );
}

/**
 * 거리(km) 배지. 거리가 있으면 초록 칩. 계산 중에는 그 칩과 같은 크기의 로딩 스켈레톤.
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
  const showSkeleton = loading && !formatted;
  const opacity = useSharedValue(1);
  const prevKeyRef = useRef(null);

  const displayKey = showSkeleton
    ? 'skeleton'
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

  if (showSkeleton) {
    return (
      <View style={wrapStyle}>
        <DistanceLoadingChip normalize={normalize} />
      </View>
    );
  }

  if (!formatted) {
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
            backgroundColor: FRESH_THEME.chipBg,
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
          color={FRESH_THEME.accent}
        />
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text
            style={{
              fontSize: normalize(10),
              fontFamily: fonts.regular,
              color: FRESH_THEME.accent,
            }}
          >
            {formatted.number}
          </Text>
          <Text
            style={{
              fontSize: normalize(10),
              fontFamily: fonts.regular,
              color: FRESH_THEME.accent,
            }}
          >
            {formatted.unit}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

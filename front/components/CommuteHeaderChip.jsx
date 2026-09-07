/**
 * 등교중/등교완료 칩 — 메인 헤더·게임방 SubHeader 공유용 프레젠테이션
 */
import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { getNormalize } from '../styles/frame.style';
import { createCommuteHeaderStyles } from '../styles/commute.style';
import { colors } from '../styles/colors';

const DOT_COUNT = 3;

/**
 * @param {{ phase: 'tracking' | 'done', activeDot?: number, style?: object }} props
 */
export default function CommuteHeaderChip({
  phase = 'tracking',
  activeDot = 0,
  style,
}) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createCommuteHeaderStyles(normalize),
    [normalize],
  );

  return (
    <View style={[styles.chip, style]}>
      {phase === 'done' ? (
        <View style={styles.celebrateRow}>
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
          <View style={styles.dotsRow}>
            {Array.from({ length: DOT_COUNT }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    opacity: i === activeDot ? 1 : 0.28,
                    transform: [{ scale: i === activeDot ? 1.2 : 1 }],
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.label} numberOfLines={1}>
            등교중
          </Text>
        </>
      )}
    </View>
  );
}

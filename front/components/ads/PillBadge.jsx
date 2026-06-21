import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSizes, fonts } from '../../styles/colors';

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  adPill: {
    backgroundColor: colors.textLight20,
  },
  tipPill: {
    backgroundColor: colors.primaryLight30,
  },
  text: {
    color: colors.background,
    fontSize: fontSizes.md,
    fontFamily: fonts.regular,
  },
  tiptext: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
    fontFamily: fonts.bold,
  },
});

export function AdPill() {
  return (
    <View style={[styles.pill, styles.adPill]}>
      <Text style={styles.text}>AD</Text>
    </View>
  );
}

export function TipPill() {
  return (
    <View style={[styles.pill, styles.tipPill]}>
      <Text style={styles.tiptext}>Tip</Text>
    </View>
  );
}

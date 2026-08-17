import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Feather from '@expo/vector-icons/Feather';
import { colors, fonts } from '../../styles/colors';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function stepValue(items, value, delta) {
  const idx = Math.max(0, items.findIndex((item) => item === value));
  const next = (idx + delta + items.length) % items.length;
  return items[next];
}

function AndroidStepColumn({ label, items, value, onChange, formatLabel }) {
  const bump = useCallback(
    (delta) => onChange(stepValue(items, value, delta)),
    [items, onChange, value],
  );

  return (
    <View style={styles.stepCol}>
      <Text style={styles.stepLabel}>{label}</Text>
      <Pressable
        onPress={() => bump(1)}
        style={({ pressed }) => [styles.chevronBtn, pressed && styles.chevronPressed]}
        hitSlop={6}
      >
        <Feather name="chevron-up" size={22} color={colors.primaryDark} />
      </Pressable>
      <Text style={styles.stepValue}>{formatLabel(value)}</Text>
      <Pressable
        onPress={() => bump(-1)}
        style={({ pressed }) => [styles.chevronBtn, pressed && styles.chevronPressed]}
        hitSlop={6}
      >
        <Feather name="chevron-down" size={22} color={colors.primaryDark} />
      </Pressable>
    </View>
  );
}

export default function HourMinuteWheel({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  hours,
  minutes,
  pickerStyle,
  pickerItemStyle,
}) {
  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.row, { height: 216 }]}>
        <Picker
          selectedValue={hour}
          onValueChange={onHourChange}
          style={pickerStyle}
          itemStyle={pickerItemStyle}
        >
          {hours.map((h) => (
            <Picker.Item key={`h-${h}`} label={`${pad2(h)}시`} value={h} />
          ))}
        </Picker>
        <Picker
          selectedValue={minute}
          onValueChange={onMinuteChange}
          style={pickerStyle}
          itemStyle={pickerItemStyle}
        >
          {minutes.map((m) => (
            <Picker.Item key={`m-${m}`} label={`${pad2(m)}분`} value={m} />
          ))}
        </Picker>
      </View>
    );
  }

  return (
    <View style={styles.androidWrap}>
      <View style={styles.previewCard}>
        <Text style={styles.previewHour}>{pad2(hour)}</Text>
        <Text style={styles.previewColon}>:</Text>
        <Text style={styles.previewMinute}>{pad2(minute)}</Text>
      </View>
      <View style={styles.androidRow}>
        <AndroidStepColumn
          label="시"
          items={hours}
          value={hour}
          onChange={onHourChange}
          formatLabel={(h) => pad2(h)}
        />
        <AndroidStepColumn
          label="분"
          items={minutes}
          value={minute}
          onChange={onMinuteChange}
          formatLabel={(m) => pad2(m)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  androidWrap: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight10,
    borderWidth: 1,
    borderColor: colors.primaryLight50,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  previewHour: {
    fontFamily: fonts.regular,
    fontSize: 36,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    minWidth: 64,
    textAlign: 'right',
  },
  previewColon: {
    fontFamily: fonts.regular,
    fontSize: 32,
    color: colors.primaryDark,
    marginHorizontal: 6,
    marginTop: -4,
  },
  previewMinute: {
    fontFamily: fonts.regular,
    fontSize: 36,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    minWidth: 64,
    textAlign: 'left',
  },
  androidRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stepCol: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  stepLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  chevronBtn: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  chevronPressed: {
    backgroundColor: colors.primaryLight20,
  },
  stepValue: {
    fontFamily: fonts.regular,
    fontSize: 24,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    paddingVertical: 2,
  },
});

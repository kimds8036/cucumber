import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import SignupStepScroll from './SignupStepScroll';

/** 드롭다운 연도 범위 (가입 가능 여부는 Sign.jsx에서 판정) */
const PICKER_YEAR_SPAN = 80;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function daysInMonth(year, month) {
  const yi = Number(year);
  const mi = Number(month);
  if (!Number.isFinite(yi) || !Number.isFinite(mi) || mi < 1 || mi > 12) {
    return 31;
  }
  return new Date(yi, mi, 0).getDate();
}

function buildBirthDate(y, m, d) {
  const yi = Number(y);
  const mi = Number(m);
  const di = Number(d);
  if (!Number.isFinite(yi) || !Number.isFinite(mi) || !Number.isFinite(di)) {
    return '';
  }
  if (yi < 1900 || yi > new Date().getFullYear()) return '';
  if (mi < 1 || mi > 12 || di < 1 || di > daysInMonth(yi, mi)) return '';
  return `${yi}-${pad2(mi)}-${pad2(di)}`;
}

function parseBirthParts(birthDate) {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return { year: '', month: '', day: '' };
  }
  const [year, month, day] = birthDate.split('-');
  return { year, month, day };
}

/** 생년월일 드롭다운 입력 단계 */
const SignStepAgeGate = ({
  styles,
  normalize,
  bottomOffset,
  initialBirthDate = '',
  onBirthDateChange,
}) => {
  const initialParts = parseBirthParts(initialBirthDate);
  const [year, setYear] = useState(initialParts.year);
  const [month, setMonth] = useState(initialParts.month);
  const [day, setDay] = useState(initialParts.day);
  const [openField, setOpenField] = useState(null); // 'year' | 'month' | 'day' | null

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const pickerMaxYear = currentYear;
  const pickerMinYear = currentYear - PICKER_YEAR_SPAN;

  const yearOptions = useMemo(() => {
    const list = [];
    for (let y = pickerMaxYear; y >= pickerMinYear; y -= 1) {
      list.push(String(y));
    }
    return list;
  }, [pickerMaxYear, pickerMinYear]);

  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => pad2(i + 1)),
    [],
  );

  const dayOptions = useMemo(() => {
    const maxDay = daysInMonth(year || pickerMaxYear, month || 1);
    return Array.from({ length: maxDay }, (_, i) => pad2(i + 1));
  }, [year, month, pickerMaxYear]);

  const emit = (y, m, d) => {
    onBirthDateChange?.(buildBirthDate(y, m, d));
  };

  const applySelection = (field, value) => {
    let nextYear = year;
    let nextMonth = month;
    let nextDay = day;

    if (field === 'year') {
      nextYear = value;
      setYear(value);
    } else if (field === 'month') {
      nextMonth = value;
      setMonth(value);
    } else if (field === 'day') {
      nextDay = value;
      setDay(value);
    }

    const maxDay = daysInMonth(nextYear || pickerMaxYear, nextMonth || 1);
    if (nextDay && Number(nextDay) > maxDay) {
      nextDay = pad2(maxDay);
      setDay(nextDay);
    }

    emit(nextYear, nextMonth, nextDay);
    setOpenField(null);
  };

  const pickerMeta = {
    year: { title: '년도 선택', options: yearOptions, selected: year },
    month: { title: '월 선택', options: monthOptions, selected: month },
    day: { title: '일 선택', options: dayOptions, selected: day },
  };

  const activeMeta = openField ? pickerMeta[openField] : null;
  const selectedIndex = activeMeta
    ? Math.max(0, activeMeta.options.indexOf(activeMeta.selected))
    : 0;

  const local = useMemo(() => makeLocalStyles(normalize), [normalize]);

  const renderDropdown = (field, label, flex, placeholder) => {
    const value = field === 'year' ? year : field === 'month' ? month : day;
    const display = value
      ? field === 'year'
        ? `${value}년`
        : field === 'month'
          ? `${Number(value)}월`
          : `${Number(value)}일`
      : placeholder;

    return (
      <View style={{ flex }}>
        <Text
          style={[
            styles.inputLabel,
            { marginLeft: normalize(12), marginBottom: normalize(6) },
          ]}
        >
          {label}
        </Text>
        <View style={[styles.inputWrapper, { marginBottom: 0 }]}>
          <TouchableOpacity
            style={[
              styles.input,
              {
                width: '100%',
                marginBottom: normalize(8),
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingRight: normalize(14),
              },
            ]}
            onPress={() => setOpenField(field)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                value ? styles.dropdownText : styles.dropdownPlaceholder,
                { flex: 1 },
              ]}
              numberOfLines={1}
            >
              {display}
            </Text>
            <Ionicons
              name="chevron-down"
              size={normalize(16)}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <SignupStepScroll normalize={normalize} bottomOffset={bottomOffset}>
        <View style={styles.birthdayContainer}>
          <View style={[styles.dropdownRow, { gap: normalize(6) }]}>
            {renderDropdown('year', '년', 1.35, '년도')}
            {renderDropdown('month', '월', 1, '월')}
            {renderDropdown('day', '일', 1, '일')}
          </View>
        </View>
      </SignupStepScroll>

      <Modal
        visible={Boolean(openField)}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenField(null)}
      >
        <Pressable style={local.overlay} onPress={() => setOpenField(null)}>
          <Pressable style={local.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={local.sheetTitle}>{activeMeta?.title}</Text>
            <FlatList
              data={activeMeta?.options || []}
              keyExtractor={(item) => item}
              style={local.list}
              showsVerticalScrollIndicator={false}
              initialNumToRender={16}
              getItemLayout={(_, index) => ({
                length: normalize(48),
                offset: normalize(48) * index,
                index,
              })}
              {...(selectedIndex > 0
                ? { initialScrollIndex: selectedIndex }
                : {})}
              onScrollToIndexFailed={() => {}}
              renderItem={({ item }) => {
                const selected = item === activeMeta?.selected;
                const label =
                  openField === 'year'
                    ? `${item}년`
                    : openField === 'month'
                      ? `${Number(item)}월`
                      : `${Number(item)}일`;
                return (
                  <TouchableOpacity
                    style={[local.optionRow, selected && local.optionRowSelected]}
                    onPress={() => applySelection(openField, item)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        local.optionText,
                        selected && local.optionTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={normalize(18)}
                        color={colors.primary}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={local.cancelBtn}
              onPress={() => setOpenField(null)}
              activeOpacity={0.85}
            >
              <Text style={local.cancelText}>닫기</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const makeLocalStyles = (normalize) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      paddingHorizontal: normalize(28),
    },
    sheet: {
      backgroundColor: colors.background,
      borderRadius: normalize(20),
      paddingTop: normalize(18),
      paddingBottom: normalize(12),
      maxHeight: '70%',
      overflow: 'hidden',
    },
    sheetTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: normalize(8),
    },
    list: {
      maxHeight: normalize(320),
    },
    optionRow: {
      height: normalize(48),
      paddingHorizontal: normalize(20),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionRowSelected: {
      backgroundColor: colors.primaryLight20,
    },
    optionText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    optionTextSelected: {
      fontFamily: fonts.bold,
      color: colors.primary,
    },
    cancelBtn: {
      marginTop: normalize(4),
      marginHorizontal: normalize(16),
      paddingVertical: normalize(12),
      alignItems: 'center',
      borderRadius: normalize(14),
      backgroundColor: colors.textLight5,
    },
    cancelText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },
  });

export { buildBirthDate };
export default SignStepAgeGate;

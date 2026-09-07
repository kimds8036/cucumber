import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  createSubHeaderStyles,
  getNormalize,
} from '../../styles/frame.style';
import { colors, fonts, fontSizes } from '../../styles/colors';

/**
 * 검색 공통 헤더 — SubHeader(chevron-back + 제목 자리)와 동일 구조·간격
 */
const SearchSubHeader = forwardRef(function SearchSubHeader(
  {
    onBack,
    value,
    onChangeText,
    onSubmit,
    onFocus,
    placeholder = '검색어를 입력하세요',
    autoFocus = false,
    showClear = true,
    rightElement,
  },
  ref,
) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const subStyles = useMemo(() => createSubHeaderStyles(width, 0), [width]);
  const styles = useMemo(() => createSearchStyles(normalize), [normalize]);
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
  }));

  useEffect(() => {
    if (!autoFocus) return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [autoFocus]);

  const hasValue = String(value ?? '').length > 0;
  const reserveClearSlot = showClear && rightElement == null;
  const hasRight = Boolean(rightElement) || reserveClearSlot;

  return (
    <View style={subStyles.header}>
      <View style={[subStyles.headerTop, styles.headerTopFixed]}>
        <TouchableOpacity
          style={subStyles.backButton}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
        >
          <Ionicons
            name="chevron-back"
            size={normalize(20)}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <View
          style={[
            styles.titleSlot,
            hasRight ? styles.titleSlotWithRight : null,
          ]}
        >
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmit}
            onFocus={onFocus}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            clearButtonMode="never"
            autoCapitalize="none"
            autoCorrect={false}
            multiline={false}
            numberOfLines={1}
            textAlignVertical="center"
          />
        </View>

        {hasRight ? (
          <View style={[subStyles.rightButton, styles.clearSlot]}>
            {rightElement != null ? (
              rightElement
            ) : hasValue ? (
              <TouchableOpacity
                onPress={() => {
                  onChangeText('');
                  inputRef.current?.focus();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="검색어 지우기"
              >
                <Ionicons
                  name="close-circle"
                  size={normalize(18)}
                  color={colors.textLight20}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
});

function createSearchStyles(normalize) {
  const fontSize = normalize(fontSizes.xxl);
  const clearSize = normalize(18);
  /** 입력·X 슬롯 공통 높이 — X(18)보다 작지 않게 고정 */
  const rowHeight = Math.max(clearSize, normalize(24));

  return StyleSheet.create({
    headerTopFixed: {
      minHeight: rowHeight,
    },
    titleSlot: {
      flex: 1,
      marginLeft: normalize(28),
      justifyContent: 'center',
      minHeight: rowHeight,
    },
    titleSlotWithRight: {
      marginRight: normalize(28),
    },
    clearSlot: {
      width: clearSize,
      height: rowHeight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchInput: {
      width: '100%',
      height: rowHeight,
      paddingVertical: 0,
      paddingHorizontal: 0,
      fontSize,
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      textAlign: 'left',
      ...Platform.select({
        android: {
          includeFontPadding: false,
          textAlignVertical: 'center',
        },
        ios: {},
      }),
    },
  });
}

export default SearchSubHeader;

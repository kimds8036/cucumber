import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';

/**
 * SearchSubHeader
 *
 * Props:
 *  - onBack: () => void              뒤로가기 버튼 핸들러
 *  - value: string                   검색어 상태값
 *  - onChangeText: (text) => void    검색어 변경 핸들러
 *  - onSubmit: () => void            검색 실행 핸들러 (엔터/완료)
 *  - placeholder?: string            placeholder 텍스트 (기본: "게시글, 우편함 검색")
 *  - autoFocus?: boolean             진입 시 자동 포커스 여부 (기본: true)
 *  - rightElement?: ReactNode        우측에 추가 버튼이 필요한 경우
 */
const SearchSubHeader = ({
  onBack,
  value,
  onChangeText,
  onSubmit,
  placeholder = '게시글, 우편함 검색',
  autoFocus = true,
  rightElement,
}) => {
  const { width, height } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createStyles(normalize), [normalize]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) {
      // 마운트 직후 약간의 딜레이 후 포커스 (네비게이션 애니메이션 완료 대기)
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  return (
    <>
      <View style={styles.header}>
        {/* 뒤로가기 */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="chevron-back"
            size={normalize(24)}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        {/* 검색 인풋 */}
        <View style={styles.searchWrapper}>
          <Ionicons
            name="search"
            size={normalize(17)}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmit}
            placeholder={placeholder}
            placeholderTextColor="#BBBBBB"
            returnKeyType="search"
            clearButtonMode="never" // iOS 기본 X 버튼 비활성화 (커스텀 사용)
            autoCapitalize="none"
            autoCorrect={false}
          />
          {value.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                onChangeText('');
                inputRef.current?.focus();
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons
                name="close-circle"
                size={normalize(18)}
                color="#BBBBBB"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* 우측 추가 요소 (선택) */}
        {rightElement && (
          <View style={styles.rightSlot}>{rightElement}</View>
        )}
      </View>
    </>
  );
};

const createStyles = (normalize) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(9),
      backgroundColor: colors.background,
      minHeight: normalize(52),
    },
    backButton: {
      width: normalize(36),
      height: normalize(36),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: normalize(4),
    },
    searchWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight5,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(10),
      paddingVertical: Platform.OS === 'ios' ? normalize(8) : normalize(4),
    },
    searchIcon: {
      marginRight: normalize(6),
    },
    searchInput: {
      flex: 1,
      fontSize: normalize(14),
      color: colors.textPrimary,
      padding: 0, // Android 기본 패딩 제거
      includeFontPadding: false,
    },
    rightSlot: {
      marginLeft: normalize(8),
    },
    divider: {
      height: 1,
      backgroundColor: colors.textLight10,
    },
  });

export default SearchSubHeader;

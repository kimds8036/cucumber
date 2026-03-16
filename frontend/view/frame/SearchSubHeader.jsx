import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getNormalize, createSearchStyles } from '../../styles/search.style';
import { colors } from '../../styles/colors';

/**
 * 검색 결과 화면 전용 서브헤더
 * - 뒤로가기 버튼 + 검색어 표시/수정 + 취소 버튼
 *
 * Props:
 * - onBack: () => void
 * - value: string
 * - onChangeText: (text: string) => void
 * - onSubmit: () => void
 * - autoFocus?: boolean
 */
const SearchSubHeader = ({
  onBack,
  value,
  onChangeText,
  onSubmit,
  autoFocus = false,
}) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createSearchStyles(width, normalize),
    [width, normalize],
  );

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        activeOpacity={0.7}
      >
        <Ionicons
          name="chevron-back"
          size={normalize(22)}
          color={colors.textPrimary}
        />
      </TouchableOpacity>

      <View style={styles.searchBox}>
        <Text style={styles.searchIconText}>검색</Text>
        <TextInput
          style={styles.searchQueryText}
          value={value}
          onChangeText={onChangeText}
          placeholder="검색어를 입력하세요"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          autoFocus={autoFocus}
        />
        {value?.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => onChangeText('')}
            activeOpacity={0.7}
          >
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.7}
      >
        <Text style={styles.cancelText}>취소</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SearchSubHeader;


import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createSubHeaderStyles, getNormalize } from '../../styles/frame.style';
import { colors } from '../../styles/colors';

const SubHeader = ({
  title,
  onBack,
  rightButtonText,
  rightIcon,
  rightElement,
  onRightPress,
  rightDisabled,
  titleElement, // 제목 자리에 커스텀 요소(검색창 등)를 넣고 싶을 때 사용
}) => {
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => createSubHeaderStyles(width, height), [width, height]);
  const normalize = useMemo(() => getNormalize(width), [width]);
  const hasRight = rightButtonText || rightIcon || rightElement;

  const getTitle = () => {
    return title;
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={normalize(20)} color={colors.textPrimary} />
          </TouchableOpacity>
          {titleElement ? (
            titleElement
          ) : (
            <Text style={styles.headerTitle}>{getTitle()}</Text>
          )}
          {hasRight && (
            <TouchableOpacity
              style={styles.rightButton}
              onPress={onRightPress}
              disabled={!!rightDisabled}
              activeOpacity={rightDisabled ? 1 : 0.2}
            >
              {rightElement != null
                ? rightElement
                : rightIcon ? (
                    <Ionicons name={rightIcon} size={normalize(22)} color={colors.textPrimary} />
                  ) : (
                    <Text
                      style={[
                        styles.rightButtonText,
                        rightDisabled ? { color: colors.background2 } : null,
                      ]}
                    >
                      {rightButtonText}
                    </Text>
                  )}
            </TouchableOpacity>
          )}
        </View>
      </View>
      {/* 경계선 */}
    </>
  );
};

export default SubHeader;

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createSubHeaderStyles, getNormalize } from '../../styles/frame.style';
import { colors } from '../../styles/colors';

const SubHeader = ({ title, onBack, rightButtonText, rightIcon, rightElement, onRightPress }) => {
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
            <Ionicons name="chevron-back" size={normalize(24)} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getTitle()}</Text>
          {hasRight && (
            <TouchableOpacity style={styles.rightButton} onPress={onRightPress}>
              {rightElement != null
                ? rightElement
                : rightIcon ? (
                    <Ionicons name={rightIcon} size={normalize(22)} color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.rightButtonText}>{rightButtonText}</Text>
                  )}
            </TouchableOpacity>
          )}
        </View>
      </View>
      {/* 경계선 */}
      <View style={styles.divider} />
    </>
  );
};

export default SubHeader;

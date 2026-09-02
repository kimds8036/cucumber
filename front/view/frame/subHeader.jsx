import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import { createSubHeaderStyles, getNormalize } from '../../styles/frame.style';
import { colors } from '../../styles/colors';

const SubHeader = ({
  title,
  subtitle,
  subtitleStyle,
  onBack,
  /** @type {'ionicons'|'feather'} */
  backIconSet = 'ionicons',
  backIconName,
  rightButtonText,
  rightIcon,
  rightElement,
  onRightPress,
  rightDisabled,
  titleElement, // 제목 자리에 커스텀 요소(검색창 등)를 넣고 싶을 때 사용
}) => {
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createSubHeaderStyles(width, 0), [width]);
  const normalize = useMemo(() => getNormalize(width), [width]);
  const hasRight = rightButtonText || rightIcon || rightElement;
  const resolvedBackIconName =
    backIconName || (backIconSet === 'feather' ? 'x' : 'chevron-back');

  const getTitle = () => {
    return title;
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            {backIconSet === 'feather' ? (
              <Feather
                name={resolvedBackIconName}
                size={normalize(20)}
                color={colors.textPrimary}
              />
            ) : (
              <Ionicons
                name={resolvedBackIconName}
                size={normalize(20)}
                color={colors.textPrimary}
              />
            )}
          </TouchableOpacity>
          {titleElement ? (
            titleElement
          ) : (
            <View style={styles.titleBlock}>
              <Text style={styles.headerTitle}>{getTitle()}</Text>
              {subtitle ? (
                <Text style={[styles.headerSubtitle, subtitleStyle]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          )}
          {hasRight && (
            <TouchableOpacity
              style={styles.rightButton}
              onPress={onRightPress}
              disabled={!!rightDisabled}
              activeOpacity={rightDisabled ? 1 : 0.2}
            >
              {rightElement != null ? (
                rightElement
              ) : rightIcon ? (
                <Ionicons
                  name={rightIcon}
                  size={normalize(22)}
                  color={colors.textPrimary}
                />
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

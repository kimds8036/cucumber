import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Modal,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'nearby', label: '근처순' },
];

function createSortChipStyles(width, normalize) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: width * 0.04,
      paddingVertical: normalize(10),
      paddingTop: normalize(8),
    },
    chips: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
      flexShrink: 1,
    },
    chip: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(8),
      borderRadius: normalize(20),
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.textLight1,
    },
    chipActive: {
      backgroundColor: colors.textLight3,
      borderWidth: 0,
    },
    label: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textLight4,
    },
    labelActive: {
      color: colors.white,
    },
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(2),
      marginLeft: normalize(8),
    },
    sortLabel: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textLight4,
    },
    backdrop: {
      flex: 1,
    },
    menu: {
      position: 'absolute',
      minWidth: normalize(108),
      backgroundColor: colors.white,
      borderRadius: normalize(12),
      borderWidth: 1,
      borderColor: colors.textLight1,
      overflow: 'hidden',
    },
    menuItem: {
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(12),
    },
    menuItemActive: {
      backgroundColor: colors.primaryLight2,
    },
    menuLabel: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.text,
    },
  });
}

export default function SortChips({
  value,
  onChange,
  options = [],
  sortValue,
  onSortChange,
}) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createSortChipStyles(width, normalize),
    [width, normalize],
  );
  const triggerRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);
  const showSort = sortValue != null && typeof onSortChange === 'function';
  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === sortValue)?.label ?? '최신순';

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      setMenuPos({
        top: y + h + normalize(4),
        right: Math.max(0, width - (x + w)),
      });
    });
  };

  const closeMenu = () => setMenuPos(null);

  const selectSort = (next) => {
    onSortChange(next);
    closeMenu();
  };

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(option.value)}
            >
              <Text style={[styles.label, active && styles.labelActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {showSort ? (
        <View ref={triggerRef} collapsable={false}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={openMenu}
            hitSlop={normalize(8)}
          >
            <Text style={styles.sortLabel}>{sortLabel}</Text>
            <Ionicons
              name="chevron-down"
              size={normalize(16)}
              color={colors.textLight4}
            />
          </TouchableOpacity>
        </View>
      ) : null}
      <Modal
        visible={menuPos != null}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.menu,
                  { top: menuPos?.top ?? 0, right: menuPos?.right ?? 0 },
                ]}
              >
                {SORT_OPTIONS.map((option) => {
                  const active = sortValue === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.menuItem, active && styles.menuItemActive]}
                      onPress={() => selectSort(option.value)}
                    >
                      <Text style={styles.menuLabel}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

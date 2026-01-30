import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../styles/colors';

const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

const DEFAULT_ITEMS = [
  { label: '쪽지 보내기', iconName: 'chatbubble-outline' },
  { label: '신고', iconName: 'flag-outline' },
  { label: '차단', iconName: 'remove-circle-outline' },
  { label: 'URL 공유', iconName: 'share-outline' },
];

export default function FloatingMenu({
  visible,
  onClose,
  items = DEFAULT_ITEMS,
  anchor,
}) {
  const { width, height } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const menuStyles = useMemo(
    () => ({
      overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        ...(anchor
          ? {}
          : { justifyContent: 'center', alignItems: 'center' }),
      },
      menu: {
        backgroundColor: colors.background,
        borderRadius: normalize(12),
        minWidth: width * 0.45,
        maxWidth: width * 0.7,
        paddingVertical: normalize(4),
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 5,
        ...(anchor
          ? {
              position: 'absolute',
              right: width - anchor.x,
              top: anchor.y,
            }
          : {}),
      },
      item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: normalize(10),
        paddingHorizontal: normalize(14),
      },
      itemLabel: {
        fontSize: normalize(13),
        fontFamily: fonts.regular,
        color: colors.textPrimary,
      },
      divider: {
        height: 1,
        backgroundColor: colors.textLight10,
        marginHorizontal: normalize(8),
      },
    }),
    [width, height, normalize, anchor]
  );

  const handleItemPress = (item) => {
    if (item.onPress) item.onPress();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={menuStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={menuStyles.menu}>
              {items.map((item, index) => (
                <React.Fragment key={index}>
                  <TouchableOpacity
                    style={menuStyles.item}
                    activeOpacity={0.7}
                    onPress={() => handleItemPress(item)}
                  >
                    <Text style={menuStyles.itemLabel}>{item.label}</Text>
                    <Ionicons
                      name={item.iconName}
                      size={normalize(17)}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  {index < items.length - 1 && <View style={menuStyles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

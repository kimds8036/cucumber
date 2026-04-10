import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../styles/colors';

const IOSActionSheet = ({
  visible,
  title,
  subtitle,
  actions = [],
  cancelText = '취소',
  onClose,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.wrap}>
          <View style={styles.card}>
            {!!title && <Text style={styles.title}>{title}</Text>}
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            {actions.map((action, idx) => (
              <View key={`${action.label}-${idx}`}>
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    action.onPress?.();
                  }}
                >
                  <Text
                    style={[
                      styles.actionText,
                      action.destructive ? styles.actionTextDanger : null,
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
                {idx < actions.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>{cancelText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  wrap: {
    gap: 8,
  },
  card: {
    backgroundColor: '#F6F6F6',
    borderRadius: 14,
    overflow: 'hidden',
  },
  title: {
    paddingTop: 14,
    textAlign: 'center',
    fontSize: 13,
    color: '#6B6B6B',
    fontWeight: '600',
  },
  subtitle: {
    paddingTop: 4,
    paddingBottom: 10,
    textAlign: 'center',
    fontSize: 12,
    color: '#8E8E93',
  },
  actionRow: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  actionText: {
    fontSize: 17,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  actionTextDanger: {
    color: '#FF3B30',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D1D1D6',
  },
  cancel: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 17,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

export default IOSActionSheet;

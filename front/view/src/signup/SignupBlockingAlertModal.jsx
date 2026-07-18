import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../../styles/colors';
import SignupIosSafeModal from './SignupIosSafeModal';

/** 배경 탭으로 닫히지 않는 안내 모달 — 버튼으로만 닫기 */
const SignupBlockingAlertModal = ({
  visible,
  title,
  message,
  buttons = [{ text: '확인' }],
  normalize = (n) => n,
}) => (
  <SignupIosSafeModal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={() => {}}
  >
    <View style={styles.backdrop}>
      <View
        style={[
          styles.card,
          { borderRadius: normalize(14), padding: normalize(20) },
        ]}
      >
        {title ? (
          <Text style={[styles.title, { fontSize: normalize(18) }]}>{title}</Text>
        ) : null}
        {message ? (
          <Text
            style={[
              styles.message,
              { fontSize: normalize(14), lineHeight: normalize(22) },
            ]}
          >
            {message}
          </Text>
        ) : null}
        {buttons.map((btn, index) => {
          const isSecondary = btn.variant === 'secondary';
          return (
            <TouchableOpacity
              key={`${btn.text}-${index}`}
              style={[
                isSecondary ? styles.buttonSecondary : styles.button,
                index > 0 && styles.buttonSpaced,
                { borderRadius: normalize(10), paddingVertical: normalize(12) },
              ]}
              activeOpacity={0.9}
              onPress={btn.onPress}
            >
              <Text
                style={[
                  isSecondary ? styles.buttonSecondaryText : styles.buttonText,
                  { fontSize: normalize(15) },
                ]}
              >
                {btn.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  </SignupIosSafeModal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.background,
  },
  title: {
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  buttonSpaced: {
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  buttonSecondaryText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});

export default SignupBlockingAlertModal;

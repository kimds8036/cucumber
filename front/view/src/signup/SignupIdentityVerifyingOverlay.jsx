import React from 'react';
import {
  Modal,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, fonts, fontSizes } from '../../../styles/colors';

/** 회원가입 — KG 이니시스 본인인증 진행 중 전체 화면 오버레이 */
const SignupIdentityVerifyingOverlay = ({
  visible,
  title = '본인인증 진행 중',
  normalize = (n) => n,
  onOpenManually,
  onCancel,
  openingManually = false,
}) => {
  if (!visible) return null;

  return (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={onCancel}
  >
    <View style={styles.backdrop}>
      <View
        style={[
          styles.card,
          { borderRadius: normalize(20), padding: normalize(28) },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={[
            styles.title,
            {
              fontSize: normalize(fontSizes.lg),
              marginTop: normalize(20),
              marginBottom: normalize(8),
            },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.subtitle,
            {
              fontSize: normalize(fontSizes.md),
              lineHeight: normalize(20),
              marginBottom: normalize(20),
            },
          ]}
        >
          인증 화면이 열리지 않으면{'\n'}아래 「직접 열기」를 눌러 주세요.
        </Text>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              borderRadius: normalize(10),
              paddingVertical: normalize(12),
              marginBottom: normalize(10),
            },
            openingManually && styles.buttonDisabled,
          ]}
          activeOpacity={0.9}
          disabled={openingManually}
          onPress={onOpenManually}
        >
          {openingManually ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text
              style={[
                styles.primaryButtonText,
                { fontSize: normalize(fontSizes.lg) },
              ]}
            >
              직접 열기
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryButton,
            {
              borderRadius: normalize(10),
              paddingVertical: normalize(12),
            },
          ]}
          activeOpacity={0.8}
          onPress={onCancel}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              { fontSize: normalize(fontSizes.md) },
            ]}
          >
            취소
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.background,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButtonText: {
    fontFamily: fonts.bold,
    color: colors.background,
  },
  secondaryButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  secondaryButtonText: {
    fontFamily: fonts.bold,
    color: colors.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default SignupIdentityVerifyingOverlay;

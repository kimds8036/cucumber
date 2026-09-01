import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import SignupIosSafeModal from './SignupIosSafeModal';

/** 본인가입 본인인증 진행 중 취소하면 버튼이 비활성화됩니다. */
const SignupIdentityVerifyingOverlay = ({
  visible,
  title = '본인인증 진행',
  normalize = (n) => n,
  onOpenManually,
  onCancel,
  openingManually = false,
}) => (
  <SignupIosSafeModal
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
          본인인증을 진행하면 이메일 인증 및 학생증 인증을 진행할 수 있습니다.
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
              직접 인증하기
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
  </SignupIosSafeModal>
);

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
    color: colors.textSecondary,
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

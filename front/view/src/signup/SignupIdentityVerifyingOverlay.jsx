import React from 'react';
import {
  Modal,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import SignupHelperText from './SignupHelperText';

/** 회원가입 — KG 이니시스 본인인증 진행 중 전체 화면 오버레이 */
const SignupIdentityVerifyingOverlay = ({
  visible,
  title = '본인인증 진행 중',
  normalize = (n) => n,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={() => {}}
  >
    <View style={styles.backdrop}>
      <View style={[styles.card, { borderRadius: normalize(20), padding: normalize(28) }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={[
            styles.title,
            {
              fontSize: normalize(fontSizes.lg),
              marginTop: normalize(20),
              marginBottom: normalize(16),
            },
          ]}
        >
          {title}
        </Text>
        <SignupHelperText
          normalize={normalize}
          variant="emphasis"
          centered
          showIcon
          style={{ width: '100%' }}
        >
          본인인증 완료 후 ✕ 버튼을 눌러{'\n'}앱으로 돌아와 주세요
        </SignupHelperText>
      </View>
    </View>
  </Modal>
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
});

export default SignupIdentityVerifyingOverlay;

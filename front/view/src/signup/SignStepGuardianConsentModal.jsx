import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { colors } from '../../../styles/colors';
import AppPopupModal from '../../../components/common/AppPopupModal';

/** C 케이스 — 보호자 본인인증 필요 안내 모달 */
const SignStepGuardianConsentModal = ({
  visible,
  normalize,
  onStart,
  onLater,
  onDismissed,
}) => (
  <AppPopupModal
    visible={visible}
    onClose={onLater}
    dismissOnBackdrop
    onDismissed={onDismissed}
  >
    <Text
      style={{
        fontSize: normalize(18),
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 10,
      }}
    >
      보호자 본인인증이 필요해요
    </Text>
    <Text
      style={{
        fontSize: normalize(14),
        lineHeight: normalize(22),
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 16,
      }}
    >
      개인정보 보호법 제22조의2에 따라{'\n'}
      만 14세 미만 회원은 보호자(법정대리인)의{'\n'}
      동의와 본인인증이 먼저 필요해요.
    </Text>

    <TouchableOpacity
      style={{
        height: 42,
        borderRadius: 10,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      activeOpacity={0.85}
      onPress={onStart}
    >
      <Text
        style={{
          color: colors.textWhite,
          fontWeight: '700',
          fontSize: normalize(14),
        }}
      >
        보호자 인증 시작하기
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={{
        marginTop: 8,
        height: 42,
        borderRadius: 10,
        backgroundColor: colors.textLight5,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      activeOpacity={0.85}
      onPress={onLater}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontWeight: '700',
          fontSize: normalize(14),
        }}
      >
        나중에 하기
      </Text>
    </TouchableOpacity>
  </AppPopupModal>
);

export default SignStepGuardianConsentModal;

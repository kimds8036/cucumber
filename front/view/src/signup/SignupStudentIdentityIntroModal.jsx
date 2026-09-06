import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { colors } from '../../../styles/colors';
import AppPopupModal from '../../../components/common/AppPopupModal';

/** 보호자 인증 완료 후 — 학생 본인인증 안내 모달 */
const SignupStudentIdentityIntroModal = ({
  visible,
  normalize,
  onStart,
  onCancel,
}) => (
  <AppPopupModal
    visible={visible}
    onClose={onCancel}
    dismissOnBackdrop
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
      보호자 인증이 완료되었어요
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
      이제 가입할 학생 본인의 인증이 필요해요.{'\n'}
      학생 명의 휴대폰으로 본인인증을 진행해 주세요.
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
        학생 본인인증 시작하기
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
      onPress={onCancel}
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

export default SignupStudentIdentityIntroModal;

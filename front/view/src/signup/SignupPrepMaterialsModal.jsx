import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../../styles/colors';
import AppPopupModal from '../../../components/common/AppPopupModal';

/**
 * 로그인 → 회원가입 직전 준비물 안내.
 * 배경(여백) 탭으로 닫히지 않음 — 버튼으로만 진행/취소.
 */
const SignupPrepMaterialsModal = ({
  visible,
  normalize = (n) => n,
  onConfirm,
  onCancel,
}) => (
  <AppPopupModal
    visible={visible}
    onClose={() => {}}
    dismissOnBackdrop={false}
    dismissOnBackPress={false}
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
      회원가입 전에 준비해 주세요
    </Text>
    <Text
      style={{
        fontSize: normalize(14),
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: normalize(22),
        marginBottom: 16,
      }}
    >
      학생 인증에 아래 준비물 중 하나가 필요해요. 미리 준비해 두면 가입이 훨씬
      수월합니다.
    </Text>

    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: normalize(12),
        padding: normalize(14),
        marginBottom: normalize(8),
      }}
    >
      <Text
        style={{
          fontSize: normalize(15),
          fontWeight: '700',
          color: colors.textPrimary,
          marginBottom: normalize(4),
        }}
      >
        1. 학생증
      </Text>
      <Text
        style={{
          fontSize: normalize(13),
          color: colors.textSecondary,
          lineHeight: normalize(19),
        }}
      >
        실물 학생증을 촬영해 제출합니다. (가장 일반적인 방법)
      </Text>
    </View>

    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: normalize(12),
        padding: normalize(14),
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          fontSize: normalize(15),
          fontWeight: '700',
          color: colors.textPrimary,
          marginBottom: normalize(4),
        }}
      >
        2. 나이스+ 또는 재학증명서
      </Text>
      <Text
        style={{
          fontSize: normalize(13),
          color: colors.textSecondary,
          lineHeight: normalize(19),
        }}
      >
        나이스+(교육부) 앱의 학적 화면 캡처, 또는 네이버 등 재학증명서 열람
        주소·열람번호를 준비해 주세요.
      </Text>
    </View>

    <TouchableOpacity
      style={{
        height: 42,
        borderRadius: 10,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      activeOpacity={0.85}
      onPress={onConfirm}
    >
      <Text
        style={{
          fontSize: normalize(14),
          fontWeight: '700',
          color: colors.textWhite,
        }}
      >
        확인했습니다
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
          fontSize: normalize(14),
          fontWeight: '700',
          color: colors.textSecondary,
        }}
      >
        돌아가기
      </Text>
    </TouchableOpacity>
  </AppPopupModal>
);

export default SignupPrepMaterialsModal;

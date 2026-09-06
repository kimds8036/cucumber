import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../styles/colors';
import AppPopupModal from '../../../components/common/AppPopupModal';

/** 배경 탭으로 닫히지 않는 안내 모달 — 시간표 저장 팝업과 동일 셸 */
const SignupBlockingAlertModal = ({
  visible,
  title,
  message,
  buttons = [{ text: '확인' }],
  normalize = (n) => n,
}) => (
  <AppPopupModal
    visible={visible}
    onClose={() => {}}
    dismissOnBackdrop={false}
    dismissOnBackPress={false}
  >
    {title ? (
      <Text
        style={{
          fontSize: normalize(18),
          fontWeight: '700',
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: 10,
        }}
      >
        {title}
      </Text>
    ) : null}
    {message ? (
      <Text
        style={{
          fontSize: normalize(14),
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: normalize(22),
          marginBottom: 16,
        }}
      >
        {message}
      </Text>
    ) : null}
    {buttons.map((btn, index) => {
      const isSecondary = btn.variant === 'secondary';
      return (
        <TouchableOpacity
          key={`${btn.text}-${index}`}
          style={{
            height: 42,
            borderRadius: 10,
            backgroundColor: isSecondary ? colors.textLight5 : colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: index > 0 ? 8 : 0,
          }}
          activeOpacity={0.85}
          onPress={btn.onPress}
        >
          <Text
            style={{
              fontSize: normalize(14),
              fontWeight: '700',
              color: isSecondary ? colors.textSecondary : colors.textWhite,
            }}
          >
            {btn.text}
          </Text>
        </TouchableOpacity>
      );
    })}
  </AppPopupModal>
);

export default SignupBlockingAlertModal;

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors } from '../../../styles/colors';
import SignupIosSafeModal from './SignupIosSafeModal';

/** C 케이스 — 보호자 본인인증 필요 안내 모달 */
const SignStepGuardianConsentModal = ({
  visible,
  normalize,
  onStart,
  onLater,
  onDismissed,
}) => (
  <SignupIosSafeModal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onLater}
    onDismissed={onDismissed}
  >
    <TouchableWithoutFeedback onPress={onLater}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.38)',
          justifyContent: 'center',
          paddingHorizontal: normalize(24),
        }}
      >
        <TouchableWithoutFeedback>
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: normalize(14),
              padding: normalize(20),
            }}
          >
            <Text
              style={{
                fontSize: normalize(18),
                fontWeight: '700',
                color: colors.textPrimary,
                marginBottom: normalize(12),
                textAlign: 'center',
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
              }}
            >
              개인정보 보호법 제22조의2에 따라{'\n'}
              만 14세 미만 회원은 보호자(법정대리인)의{'\n'}
              동의와 본인인증이 먼저 필요해요.
            </Text>

            <TouchableOpacity
              style={{
                marginTop: normalize(20),
                backgroundColor: colors.primary,
                borderRadius: normalize(10),
                paddingVertical: normalize(12),
                alignItems: 'center',
              }}
              activeOpacity={0.9}
              onPress={onStart}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: normalize(15) }}>
                보호자 인증 시작하기
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                marginTop: normalize(10),
                paddingVertical: normalize(10),
                alignItems: 'center',
              }}
              activeOpacity={0.8}
              onPress={onLater}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontWeight: '600',
                  fontSize: normalize(14),
                }}
              >
                나중에 하기
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </SignupIosSafeModal>
);

export default SignStepGuardianConsentModal;

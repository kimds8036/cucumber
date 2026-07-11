import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors } from '../../../styles/colors';

/** 보호자 인증 완료 후 — 학생 본인인증 안내 모달 */
const SignupStudentIdentityIntroModal = ({
  visible,
  normalize,
  onStart,
  onCancel,
}) => {
  if (!visible) return null;

  return (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onCancel}
  >
    <TouchableWithoutFeedback onPress={onCancel}>
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
              보호자 인증이 완료되었어요
            </Text>
            <Text
              style={{
                fontSize: normalize(14),
                lineHeight: normalize(22),
                color: colors.textSecondary,
                textAlign: 'center',
              }}
            >
              이제 가입할 학생 본인의 인증이 필요해요.{'\n'}
              학생 명의 휴대폰으로 본인인증을 진행해 주세요.
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
              <Text
                style={{
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: normalize(15),
                }}
              >
                학생 본인인증 시작하기
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                marginTop: normalize(10),
                paddingVertical: normalize(10),
                alignItems: 'center',
              }}
              activeOpacity={0.8}
              onPress={onCancel}
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
  </Modal>
  );
};

export default SignupStudentIdentityIntroModal;

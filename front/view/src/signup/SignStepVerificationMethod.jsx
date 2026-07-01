import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

// 학생 인증 방식 선택: 학생증 촬영 vs 재학증명서 제출
const SignStepVerificationMethod = ({ styles, onSelect }) => {
  return (
    <View style={styles.ageGateContainer}>
      <TouchableOpacity
        style={styles.verificationMethodStudentIdCard}
        activeOpacity={0.9}
        onPress={() => onSelect?.('studentId')}
      >
        <Text style={styles.verificationMethodStudentIdCardTitle}>
          학생증{' '}
          <Text style={styles.verificationMethodStudentIdCardRecommended}>
            (권장)
          </Text>
        </Text>
        <Text style={styles.verificationMethodStudentIdCardDescription}>
          학생증을 촬영해 제출하면 관리자 확인 후 학생 인증이 완료됩니다.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.verificationMethodCertificateCard}
        activeOpacity={0.9}
        onPress={() => onSelect?.('certificate')}
      >
        <Text style={styles.verificationMethodCertificateCardTitle}>
          재학증명서
        </Text>
        <Text style={styles.verificationMethodCertificateCardDescription}>
          학생증이 없거나 촬영이 어려운 경우 재학증명서로 인증할 수 있습니다.
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default SignStepVerificationMethod;

import React from 'react';
import { View, Text } from 'react-native';

const SignStepCertificate = ({ styles }) => {
  return (
    <View style={styles.ageGateContainer}>
      <View style={styles.ageGateCard}>
        <Text style={styles.ageGateCardTitle}>졸업(예정)증명서 제출 안내</Text>
        <Text style={styles.ageGateCardDescription}>
          학생증이 없는 학교 재학생은 네이버에서 재학 중인 학교의 졸업(예정)증명서를 발급받아
          우리 회사 보관함으로 제출해주세요.
        </Text>
      </View>

      <View style={styles.ageGateCard}>
        <Text style={styles.ageGateCardTitle}>제출 전 확인</Text>
        <Text style={styles.ageGateCardDescription}>
          다음 단계에서 보관함 URL과 접수 번호를 입력하면 제출이 완료됩니다.
        </Text>
      </View>
    </View>
  );
};

export default SignStepCertificate;

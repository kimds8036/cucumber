import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../../styles/colors';

// 학생 인증 방식 선택 단계: 학생증 촬영 vs 증명서 제출 선택 화면
const SignStepVerificationMethod = ({ styles, onSelect, selectedMethod }) => {
  return (
    <View style={styles.ageGateContainer}>
      <TouchableOpacity
        style={[
          styles.ageGateCard,
          selectedMethod === 'studentId' && styles.ageGateCardSelected,
        ]}
        activeOpacity={0.9}
        onPress={() => onSelect && onSelect('studentId')}
      >
        <Text style={styles.ageGateCardTitle}>
          학생증 제출 <Text style={{ color: colors.alert }}>(권장)</Text>
        </Text>
        <Text style={styles.ageGateCardDescription}>
          학생증을 촬영해 제출하면 관리자가 확인 후 학생 인증이 완료됩니다.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.ageGateCard,
          selectedMethod === 'certificate' && styles.ageGateCardSelected,
        ]}
        activeOpacity={0.9}
        onPress={() => onSelect && onSelect('certificate')}
      >
        <Text style={styles.ageGateCardTitle}>졸업(예정)증명서 제출</Text>
        <Text style={styles.ageGateCardDescription}>
          학생증이 없는 학교의 경우에만 선택해주세요.
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default SignStepVerificationMethod;

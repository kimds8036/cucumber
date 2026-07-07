import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../../styles/colors';

// 학생 인증 방식 선택: 학생증 촬영 vs 재학증명서 제출
const SignStepVerificationMethod = ({ styles, onSelect }) => {
  return (
    <View style={styles.ageGateContainer}>
      <TouchableOpacity
        style={styles.ageGateCard}
        activeOpacity={0.9}
        onPress={() => onSelect?.('studentId')}
      >
        <Text style={styles.ageGateCardTitle}>
          학생증 <Text style={{ color: colors.alert }}>(권장)</Text>
        </Text>
        <Text style={styles.ageGateCardDescription}>
          학생증을 촬영해 제출하면 관리자 확인 후 학생 인증이 완료됩니다.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.ageGateCard}
        activeOpacity={0.9}
        onPress={() => onSelect?.('certificate')}
      >
        <Text style={styles.ageGateCardTitle}>재학증명서</Text>
        <Text style={styles.ageGateCardDescription}>
          학생증이 없거나 촬영이 어려운 경우 재학증명서로 인증할 수 있습니다.
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default SignStepVerificationMethod;

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const SignStepAgeGate = ({ styles, onSelect, selectedAgeGroup }) => {
  return (
    <View style={styles.ageGateContainer}>
      <TouchableOpacity
        style={[
          styles.ageGateCard,
          selectedAgeGroup === 'under14' && styles.ageGateCardSelected,
        ]}
        activeOpacity={0.9}
        onPress={() => onSelect && onSelect('under14')}
      >
        <Text style={styles.ageGateCardTitle}>만 14세 미만</Text>
        <Text style={styles.ageGateCardDescription}>
          보호자 동의가 필요한 회원가입 경로로 진행합니다.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.ageGateCard,
          selectedAgeGroup === 'over14' && styles.ageGateCardSelected,
        ]}
        activeOpacity={0.9}
        onPress={() => onSelect && onSelect('over14')}
      >
        <Text style={styles.ageGateCardTitle}>만 14세 이상</Text>
        <Text style={styles.ageGateCardDescription}>
          일반 회원가입 경로로 진행합니다.
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default SignStepAgeGate;

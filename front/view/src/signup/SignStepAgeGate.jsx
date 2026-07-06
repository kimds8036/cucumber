import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { colors } from '../../../styles/colors';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function buildBirthDate(y, m, d) {
  const yi = Number(y);
  const mi = Number(m);
  const di = Number(d);
  if (!Number.isFinite(yi) || !Number.isFinite(mi) || !Number.isFinite(di)) return '';
  if (yi < 1900 || yi > new Date().getFullYear()) return '';
  if (mi < 1 || mi > 12 || di < 1 || di > 31) return '';
  return `${yi}-${pad2(mi)}-${pad2(di)}`;
}

/** Step 0: 생년월일 입력 (만 14세 미만은 Sign.jsx에서 차단) */
const SignStepAgeGate = ({ styles, normalize, onBirthDateChange }) => {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');

  const emit = (y, m, d) => {
    const birthDate = buildBirthDate(y, m, d);
    onBirthDateChange?.(birthDate);
  };

  return (
    <View style={styles.content}>
      <Text style={[styles.inputLabel, { marginBottom: normalize(8) }]}>
        생년월일을 입력해 주세요
      </Text>
      <Text
        style={{
          fontFamily: 'Baloo2-Regular',
          fontSize: normalize(13),
          color: colors.textSecondary,
          marginBottom: normalize(16),
        }}
      >
        만 14세 미만은 보호자 동의 준비 후 가입할 수 있어요.
      </Text>

      <View style={{ flexDirection: 'row', gap: normalize(8) }}>
        <View style={{ flex: 1.2 }}>
          <Text style={styles.inputLabel}>년</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={year}
              onChangeText={(t) => {
                const v = t.replace(/\D/g, '').slice(0, 4);
                setYear(v);
                emit(v, month, day);
              }}
              placeholder="2008"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.inputLabel}>월</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={month}
              onChangeText={(t) => {
                const v = t.replace(/\D/g, '').slice(0, 2);
                setMonth(v);
                emit(year, v, day);
              }}
              placeholder="01"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.inputLabel}>일</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={day}
              onChangeText={(t) => {
                const v = t.replace(/\D/g, '').slice(0, 2);
                setDay(v);
                emit(year, month, v);
              }}
              placeholder="01"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export { buildBirthDate };
export default SignStepAgeGate;

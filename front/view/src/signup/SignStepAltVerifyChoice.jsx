import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons, Foundation } from '@expo/vector-icons';
import { colors, fonts } from '../../../styles/colors';

/**
 * 학생증 대안 인증 수단 선택 — 나이스+ / 재학증명서
 * 학생증 재제출과 같이 ScrollView 없이 View만 사용 (첫 프레임 레이아웃 점프 방지)
 */
const SignStepAltVerifyChoice = ({
  normalize = (n) => n,
  onSelectNeisPlus,
  onSelectCertificate,
}) => {
  const { width } = useWindowDimensions();
  const bodyStyle = useMemo(
    () => ({
      flex: 1,
      minHeight: 0,
      marginHorizontal: -width * 0.04,
      paddingHorizontal: width * 0.07,
    }),
    [width],
  );

  return (
  <View style={bodyStyle}>
    <TouchableOpacity
      style={[
        styles.card,
        { borderRadius: normalize(16), paddingVertical: normalize(20), paddingHorizontal: normalize(20) },
      ]}
      activeOpacity={0.6}
      onPress={onSelectNeisPlus}
    >
      <View style={styles.cardRow}>
        <Foundation name="plus" size={normalize(28)} color="#1060E1" style={{ marginRight: normalize(10) }} />
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { fontSize: normalize(16), marginBottom: normalize(2) }]}>
            NEIS+로 인증하기
          </Text>
          <Text style={[styles.cardBody, { fontSize: normalize(13), lineHeight: normalize(19) }]}>
            NEIS+ 앱에서 이름과 학교가 보이는 학적 화면을 캡처해 제출합니다
          </Text>
        </View>
      </View>
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        styles.card,
        {
          borderRadius: normalize(16),
          paddingVertical: normalize(20),
          paddingHorizontal: normalize(20),
          marginTop: normalize(12),
        },
      ]}
      activeOpacity={0.6}
      onPress={onSelectCertificate}
    >
      <View style={styles.cardRow}>
        <Ionicons name="document-text" size={normalize(26)} color="#03C75A" style={{ marginRight: normalize(10) }} />
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { fontSize: normalize(16), marginBottom: normalize(2) }]}>
            재학증명서로 인증하기
          </Text>
          <Text style={[styles.cardBody, { fontSize: normalize(13), lineHeight: normalize(19) }]}>
            네이버에서 발급한 재학증명서의 일회용 열람 주소와 열람번호로 제출합니다
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  cardBody: {
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
});

export default SignStepAltVerifyChoice;

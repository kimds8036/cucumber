import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../../styles/colors';

/**
 * 학생증 대안 인증 수단 선택 — 나이스+ / 재학증명서
 * 학생증 재제출과 같이 ScrollView 없이 View만 사용 (첫 프레임 레이아웃 점프 방지)
 */
const SignStepAltVerifyChoice = ({
  normalize = (n) => n,
  onSelectNeisPlus,
  onSelectCertificate,
}) => (
  <View style={styles.root}>
    <Text style={[styles.lead, { fontSize: normalize(15), lineHeight: normalize(22) }]}>
      학생증이 없다면 아래 방법 중 하나로 재학을 인증할 수 있어요.
    </Text>

    <TouchableOpacity
      style={[styles.card, { borderRadius: normalize(14), padding: normalize(18) }]}
      activeOpacity={0.88}
      onPress={onSelectNeisPlus}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { borderRadius: normalize(10) }]}>
          <Ionicons name="phone-portrait-outline" size={normalize(22)} color={colors.primaryDark} />
        </View>
        <Text style={[styles.cardTitle, { fontSize: normalize(17) }]}>나이스+</Text>
      </View>
      <Text style={[styles.cardBody, { fontSize: normalize(14), lineHeight: normalize(20) }]}>
        나이스+ 앱에서 이름·학교가 보이는 학적 화면을 캡처해 제출합니다.
        학생증과 같은 방식으로 관리자가 검수합니다.
      </Text>
      <Text style={[styles.cardCta, { fontSize: normalize(14) }]}>
        나이스+로 제출하기 →
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        styles.card,
        {
          borderRadius: normalize(14),
          padding: normalize(18),
          marginTop: normalize(12),
        },
      ]}
      activeOpacity={0.88}
      onPress={onSelectCertificate}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { borderRadius: normalize(10) }]}>
          <Ionicons name="document-text-outline" size={normalize(22)} color={colors.primaryDark} />
        </View>
        <Text style={[styles.cardTitle, { fontSize: normalize(17) }]}>재학증명서</Text>
      </View>
      <Text style={[styles.cardBody, { fontSize: normalize(14), lineHeight: normalize(20) }]}>
        네이버 등에서 발급한 재학증명서의 열람 주소와 열람 번호로 제출합니다.
      </Text>
      <Text style={[styles.cardCta, { fontSize: normalize(14) }]}>
        재학증명서로 제출하기 →
      </Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  lead: {
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    backgroundColor: colors.lightgreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  cardBody: {
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  cardCta: {
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
});

export default SignStepAltVerifyChoice;

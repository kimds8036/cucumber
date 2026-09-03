import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import SignStepPrivacyPolicy from './SignStepPrivacyPolicy';
import SignStepTermsOfService from './SignStepTermsOfService';

// 회원가입 0단계: 필수 동의 항목(개인정보/인증/위치) 확인 화면
const SignStepConsent = ({ normalize, selectedAgeGroup, onChange }) => {
  const isUnder14 = selectedAgeGroup === 'under14';

  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [consents, setConsents] = useState({
    termsOfService: false,
    dataCollection: false,
    guardian: false,
    studentOcr: false,
    location: false,
    marketingOptIn: false,
  });

  /**
   * 전체 필수(마케팅 제외) — 성인 4: 약관·수집·OCR·위치 / 만14미만 5: +법정대리인
   * (개인정보처리방침은 상단 링크로만 열람, 체크박스 없음)
   */
  const checkboxRequiredKeys = isUnder14
    ? ['termsOfService', 'dataCollection', 'guardian', 'studentOcr', 'location']
    : ['termsOfService', 'dataCollection', 'studentOcr', 'location'];

  /** 1) 상단 전체 동의: 위 필수 전부 + 마케팅(성인 5+1=6 UI개에 해당, 만14미만 6개) */
  const bulkConsentKeys = [...checkboxRequiredKeys, 'marketingOptIn'];
  const allBulkChecked = bulkConsentKeys.every((key) => consents[key]);

  /** 4) 전체 필수만(마케팅 제외) */
  const allRequiredChecked = checkboxRequiredKeys.every((key) => consents[key]);

  /** 2) 필수 4개만: 이용약관·회원가입 수집·이용·OCR·위치 (법정대리인 제외) */
  const fourKeyProgressKeys = [
    'termsOfService',
    'dataCollection',
    'studentOcr',
    'location',
  ];
  const fourKeyProgress = fourKeyProgressKeys.every((key) => consents[key]);

  /** 3) 전체 동의 제외 개별 5개: 약관·수집·OCR·위치·마케팅 */
  const fiveWithoutBulkKeys = [
    'termsOfService',
    'dataCollection',
    'studentOcr',
    'location',
    'marketingOptIn',
  ];
  const fiveWithoutBulkProgress = fiveWithoutBulkKeys.every(
    (key) => consents[key],
  );

  const canProceedToNext =
    allBulkChecked ||
    fourKeyProgress ||
    fiveWithoutBulkProgress ||
    allRequiredChecked;

  useEffect(() => {
    onChange?.({
      allConsented: canProceedToNext,
      consents: { ...consents },
    });
  }, [canProceedToNext, consents, onChange]);

  const toggle = (key) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = () => {
    const newVal = !allBulkChecked;
    const updated = {};
    bulkConsentKeys.forEach((k) => {
      updated[k] = newVal;
    });
    setConsents((prev) => ({ ...prev, ...updated }));
  };

  const s = makeStyles(normalize);

  const Checkbox = ({ checked, size = 'sm' }) => (
    <View
      style={[
        s.checkbox,
        size === 'lg' && s.checkboxLg,
        checked && s.checkboxChecked,
      ]}
    >
      {checked && (
        <Ionicons
          name="checkmark"
          size={normalize(size === 'lg' ? 13 : 11)}
          color={colors.textWhite}
        />
      )}
    </View>
  );

  /** badgeType: 필수(초록) / 선택(파랑) — 제목에는 [필수] 문구 넣지 않음 */
  const ConsentCard = ({
    id,
    title,
    tableRows,
    onViewFull,
    badgeType = 'required',
  }) => (
    <View style={s.card} pointerEvents="box-none">
      <TouchableOpacity
        style={s.cardMainRow}
        onPress={() => toggle(id)}
        activeOpacity={0.8}
      >
        <Checkbox checked={consents[id]} />
        <View style={s.cardTitleArea}>
          {badgeType === 'required' && (
            <View style={s.badge}>
              <Text style={s.badgeText}>필수</Text>
            </View>
          )}
          {badgeType === 'optional' && (
            <View style={s.badgeOptional}>
              <Text style={s.badgeOptionalText}>선택</Text>
            </View>
          )}
          <Text style={s.cardTitle}>{title}</Text>
        </View>
      </TouchableOpacity>

      {onViewFull && (
        <TouchableOpacity
          onPress={onViewFull}
          style={s.viewFullRow}
          hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Text style={s.viewFullText}>전문 보기</Text>
          <Ionicons
            name="chevron-forward"
            size={normalize(13)}
            color={colors.primaryDark}
          />
        </TouchableOpacity>
      )}

      {tableRows && (
        <View style={s.table}>
          {tableRows.map((row, i) => (
            <View key={i} style={[s.tableRow, i > 0 && s.tableRowBorder]}>
              <Text style={s.tableKey}>{row.key}</Text>
              <Text style={s.tableValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* 전체 동의: 체크 | (제목 + 약관문구 세로) */}
        <View style={s.allAgreeBlock}>
          <View style={s.allAgreeCard}>
            <View style={s.allAgreeTopRow}>
              <TouchableOpacity
                onPress={toggleAll}
                activeOpacity={0.85}
                style={s.allAgreeCheckboxTap}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Checkbox checked={allBulkChecked} size="lg" />
              </TouchableOpacity>
              <View style={s.allAgreeTextColumn}>
                <TouchableOpacity onPress={toggleAll} activeOpacity={0.85}>
                  <Text style={s.allAgreeText}>항목 전체 동의</Text>
                </TouchableOpacity>
                <View style={s.legalAckWrap}>
                  <Text style={s.legalAckLine}>
                    <Text
                      onPress={() => setShowTermsOfService(true)}
                      style={s.legalAckLink}
                    >
                      이용약관
                    </Text>
                    <Text style={s.legalAckPlain}> 및 </Text>
                    <Text
                      onPress={() => setShowPrivacyPolicy(true)}
                      style={s.legalAckLink}
                    >
                      개인정보처리방침
                    </Text>
                    <Text style={s.legalAckPlain}>
                      을 읽었으며 이에 모두 동의합니다.
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <ConsentCard
          id="termsOfService"
          title="서비스 이용약관 동의"
          badgeType="required"
        />

        <ConsentCard
          id="dataCollection"
          title="회원가입 및 서비스 제공을 위한 개인정보 수집·이용"
          badgeType="required"
        />
        {isUnder14 && (
          <ConsentCard
            id="guardian"
            title="만 14세 미만 회원의 법정대리인 동의 (해당자만)"
            badgeType="required"
          />
        )}

        <ConsentCard
          id="studentOcr"
          title="학생증(OCR) 기반 인증을 위한 개인정보 수집·이용"
          badgeType="required"
        />

        <ConsentCard
          id="location"
          title="위치 정보 수집·이용"
          badgeType="required"
        />
        <ConsentCard
          id="marketingOptIn"
          title="마케팅·이벤트 정보 수신"
          badgeType="optional"
        />

        <Text style={s.refusalNotice}>
          ※ 필수 항목 동의 거부 시 회원가입 및 서비스 이용이 제한됩니다.
        </Text>
      </ScrollView>

      {showPrivacyPolicy && (
        <SignStepPrivacyPolicy
          normalize={normalize}
          onBack={() => setShowPrivacyPolicy(false)}
        />
      )}
      {showTermsOfService && (
        <SignStepTermsOfService
          normalize={normalize}
          onBack={() => setShowTermsOfService(false)}
        />
      )}
    </View>
  );
};

const makeStyles = (normalize) =>
  StyleSheet.create({
    scrollContent: {
      gap: normalize(10),
      paddingBottom: normalize(96),
    },
    allAgreeBlock: {
      gap: normalize(10),
    },
    allAgreeTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: normalize(12),
    },
    allAgreeCheckboxTap: {
      paddingTop: normalize(2),
    },
    allAgreeTextColumn: {
      flex: 1,
      flexDirection: 'column',
    },
    legalAckWrap: {
      alignSelf: 'stretch',
      paddingHorizontal: normalize(2),
    },
    legalAckLine: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(22),
    },
    legalAckPlain: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    legalAckLink: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.bold,
      color: colors.primaryDark,
      textDecorationLine: 'underline',
    },
    allAgreeCard: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: normalize(10),
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: normalize(20),
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(14),
      backgroundColor: colors.primaryLight10,
    },
    allAgreeText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.textLight20,
      borderRadius: normalize(16),
      backgroundColor: colors.background,
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(12),
    },
    cardMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(10),
    },
    cardTitleArea: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: normalize(6),
    },
    badge: {
      backgroundColor: colors.primary,
      borderRadius: normalize(6),
      paddingHorizontal: normalize(6),
      paddingVertical: normalize(2),
    },
    badgeText: {
      fontSize: normalize(fontSizes.sm),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    badgeOptional: {
      backgroundColor: colors.textLight20,
      borderRadius: normalize(6),
      paddingHorizontal: normalize(6),
      paddingVertical: normalize(2),
    },
    badgeOptionalText: {
      fontSize: normalize(fontSizes.sm),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    cardTitle: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      flexShrink: 1,
      lineHeight: normalize(22),
    },
    viewFullRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: normalize(2),
      marginTop: normalize(8),
      paddingTop: normalize(4),
    },
    viewFullText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
    },
    table: {
      marginTop: normalize(10),
      borderTopWidth: 1,
      borderTopColor: colors.textLight10,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: normalize(6),
    },
    tableRowBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.textLight5,
    },
    tableKey: {
      width: normalize(58),
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      flexShrink: 0,
    },
    tableValue: {
      flex: 1,
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(20),
    },
    checkbox: {
      width: normalize(20),
      height: normalize(20),
      borderRadius: normalize(6),
      borderWidth: 1.5,
      borderColor: colors.textLight20,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    checkboxLg: {
      width: normalize(22),
      height: normalize(22),
      borderRadius: normalize(7),
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    refusalNotice: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: normalize(20),
      marginTop: normalize(2),
      textAlign: 'center',
    },
  });

export default SignStepConsent;

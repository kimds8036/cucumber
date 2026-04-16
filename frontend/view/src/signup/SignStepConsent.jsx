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

const SignStepConsent = ({ normalize, selectedAgeGroup, onChange }) => {
  const isUnder14 = selectedAgeGroup === 'under14';

  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [consents, setConsents] = useState({
    privacyPolicy: false,
    termsOfService: false,
    dataCollection: false,
    guardian: false,
    studentOcr: false,
    location: false,
  });

  const requiredKeys = isUnder14
    ? [
        'privacyPolicy',
        'termsOfService',
        'dataCollection',
        'guardian',
        'studentOcr',
        'location',
      ]
    : [
        'privacyPolicy',
        'termsOfService',
        'dataCollection',
        'studentOcr',
        'location',
      ];

  const allConsented = requiredKeys.every((key) => consents[key]);

  useEffect(() => {
    onChange && onChange({ allConsented });
  }, [consents]);

  const toggle = (key) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = () => {
    const newVal = !allConsented;
    const updated = {};
    requiredKeys.forEach((k) => {
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

  const ConsentCard = ({
    id,
    title,
    tableRows,
    onViewFull,
    hideCheckbox = false,
    hideBadge = false,
  }) => (
    <View style={s.card} pointerEvents="box-none">
      <TouchableOpacity
        style={s.cardHeader}
        onPress={() => toggle(id)}
        activeOpacity={0.8}
      >
        {!hideCheckbox && <Checkbox checked={consents[id]} />}
        <View style={s.cardTitleArea}>
          {!hideBadge && (
            <View style={s.badge}>
              <Text style={s.badgeText}>필수</Text>
            </View>
          )}
          <Text style={s.cardTitle}>{title}</Text>
        </View>
        {onViewFull && (
          <TouchableOpacity
            onPress={onViewFull}
            style={s.viewFullBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.viewFullText}>전문 보기</Text>
            <Ionicons
              name="chevron-forward"
              size={normalize(13)}
              color={colors.primaryDark}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

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
        {/* 전체 동의 */}
        <TouchableOpacity
          style={s.allAgreeCard}
          onPress={toggleAll}
          activeOpacity={0.85}
        >
          <Checkbox checked={allConsented} size="lg" />
          <Text style={s.allAgreeText}>필수 항목 전체 동의</Text>
        </TouchableOpacity>

        {/* 1. 회원가입 및 서비스 제공을 위한 개인정보 수집·이용 */}
        <ConsentCard
          id="dataCollection"
          title="회원가입 및 서비스 제공을 위한 개인정보 수집·이용"
          tableRows={[
            {
              key: '수집 항목',
              value:
                '사용자명, 비밀번호, 이름, 휴대전화번호, 생년월일, 학교 정보, IP 주소, 단말 식별자 등',
            },
            {
              key: '이용 목적',
              value:
                '회원 가입 및 본인 확인, 서비스 제공, 부정 이용 방지, 민원 처리',
            },
            { key: '보유 기간', value: '회원 탈퇴 시까지' },
          ]}
        />

        {/* 2. 법정대리인 동의 (만 14세 미만만 표시) */}
        {isUnder14 && (
          <ConsentCard
            id="guardian"
            title="만 14세 미만 회원의 법정대리인 동의"
            tableRows={[
              {
                key: '수집 항목',
                value: '법정대리인의 이름, 연락처 (PASS 인증으로 확인)',
              },
              {
                key: '이용 목적',
                value:
                  '만 14세 미만 아동의 개인정보 수집·이용에 대한 법정대리인 동의 확인',
              },
              { key: '보유 기간', value: '동의 목적 달성 후 지체 없이 파기' },
            ]}
          />
        )}

        {/* 3. 학생증(OCR) 기반 인증 */}
        <ConsentCard
          id="studentOcr"
          title="학생증(OCR) 기반 인증"
          tableRows={[
            {
              key: '수집 항목',
              value: '학생증 이미지(또는 이미지 URL), OCR 추출 텍스트(JSON)',
            },
            { key: '이용 목적', value: '학생 신분 확인, 부정 가입 방지' },
            { key: '보유 기간', value: '인증 목적 달성 후 지체 없이 파기' },
          ]}
        />

        {/* 4. 위치 정보 수집·이용 */}
        <ConsentCard
          id="location"
          title="위치 정보 수집·이용"
          tableRows={[
            { key: '수집 항목', value: '위도·경도 (정밀 GPS 좌표)' },
            {
              key: '이용 목적',
              value: '학교 재학 여부 검증(Geofencing), 위치 기반 게시판 서비스',
            },
            {
              key: '보유 기간',
              value:
                '학교 인증 완료 후 즉시 파기; 게시글 위치는 게시물 삭제 또는 탈퇴 시까지',
            },
          ]}
        />

        {/* 5. 개인정보 처리방침 전문 동의 */}
        <ConsentCard
          id="privacyPolicy"
          title="개인정보 처리방침 전문 동의"
          onViewFull={() => setShowPrivacyPolicy(true)}
          hideCheckbox={true}
          hideBadge={true}
        />

        {/* 6. 서비스 이용약관 동의 */}
        <ConsentCard
          id="termsOfService"
          title="서비스 이용약관 동의"
          onViewFull={() => setShowTermsOfService(true)}
          hideCheckbox={true}
          hideBadge={true}
        />

        <Text style={s.refusalNotice}>
          ※ 필수 항목 동의를 거부할 권리가 있으나, 거부 시 회원가입 및 서비스
          이용이 제한됩니다.
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
      paddingBottom: normalize(8),
    },
    allAgreeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(12),
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
    cardHeader: {
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
    cardTitle: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    viewFullBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(2),
      marginLeft: normalize(4),
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
      lineHeight: normalize(18),
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
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: normalize(18),
      marginTop: normalize(2),
    },
  });

export default SignStepConsent;

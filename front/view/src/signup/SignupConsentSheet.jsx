import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import SignupIosSafeModal from './SignupIosSafeModal';
import SignStepPrivacyPolicy from './SignStepPrivacyPolicy';
import SignStepTermsOfService from './SignStepTermsOfService';
import {
  ALL_CONSENT_KEYS,
  areRequiredConsentsChecked,
  createEmptyConsents,
  getConsentItemsForProvider,
} from './signupConsentItems';

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {'kakao'|'apple'|'phone'} props.provider
 * @param {() => void} props.onClose
 * @param {(payload: { allConsented: boolean, consents: object }) => void} props.onConfirm
 */
const SignupConsentSheet = ({ visible, provider, onClose, onConfirm }) => {
  const { width } = useWindowDimensions();
  const normalize = (size) => Math.round((width / 375) * size);
  const styles = useMemo(() => createStyles(normalize), [normalize]);

  const items = useMemo(
    () => getConsentItemsForProvider(provider),
    [provider],
  );

  const [consents, setConsents] = useState(createEmptyConsents);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);

  useEffect(() => {
    if (!visible) {
      setConsents(createEmptyConsents());
    }
  }, [visible]);

  const allBulkChecked = ALL_CONSENT_KEYS.every((key) => consents[key]);
  const canProceed = areRequiredConsentsChecked(consents);

  const toggle = (key) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = () => {
    const next = !allBulkChecked;
    setConsents(
      ALL_CONSENT_KEYS.reduce((acc, key) => {
        acc[key] = next;
        return acc;
      }, {}),
    );
  };

  const openDetail = (detail) => {
    if (detail === 'terms') setShowTermsOfService(true);
    if (detail === 'privacy') setShowPrivacyPolicy(true);
  };

  const handleConfirm = () => {
    if (!canProceed) return;
    onConfirm?.({
      allConsented: canProceed,
      consents: { ...consents },
    });
  };

  return (
    <>
      <SignupIosSafeModal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <TouchableOpacity
                style={styles.bulkRow}
                onPress={toggleAll}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={allBulkChecked ? 'checkbox' : 'square-outline'}
                  size={normalize(22)}
                  color={allBulkChecked ? colors.primary : colors.textMuted}
                />
                <View style={styles.bulkTextWrap}>
                  <Text style={styles.bulkTitle}>항목 전체 동의</Text>
                  <Text style={styles.bulkSubtitle}>
                    이용약관 및 개인정보처리방침을 읽었으며 이에 모두 동의합니다
                  </Text>
                </View>
              </TouchableOpacity>

              {items.map((item) => (
                <View key={item.key} style={styles.itemRow}>
                  <TouchableOpacity
                    style={styles.itemCheck}
                    onPress={() => toggle(item.key)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={consents[item.key] ? 'checkbox' : 'square-outline'}
                      size={normalize(20)}
                      color={
                        consents[item.key] ? colors.primary : colors.textMuted
                      }
                    />
                    <Text style={styles.itemLabel}>
                      [{item.required ? '필수' : '선택'}] {item.label}
                    </Text>
                  </TouchableOpacity>
                  {item.detail ? (
                    <TouchableOpacity
                      onPress={() => openDetail(item.detail)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.detailLink}>보기</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}

              <Text style={styles.footnote}>
                * 필수 항목 동의 거부 시 회원가입 및 서비스 이용이 제한됩니다.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                !canProceed && styles.primaryButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!canProceed}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>다음 단계</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </SignupIosSafeModal>

      {showTermsOfService ? (
        <SignStepTermsOfService
          normalize={normalize}
          onBack={() => setShowTermsOfService(false)}
        />
      ) : null}
      {showPrivacyPolicy ? (
        <SignStepPrivacyPolicy
          normalize={normalize}
          onBack={() => setShowPrivacyPolicy(false)}
        />
      ) : null}
    </>
  );
};

function createStyles(normalize) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: colors.overlayLight,
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: normalize(20),
      borderTopRightRadius: normalize(20),
      maxHeight: '85%',
      paddingBottom: normalize(20),
    },
    handle: {
      alignSelf: 'center',
      width: normalize(40),
      height: normalize(4),
      borderRadius: normalize(2),
      backgroundColor: colors.border,
      marginTop: normalize(10),
      marginBottom: normalize(8),
    },
    scrollContent: {
      paddingHorizontal: normalize(20),
      paddingBottom: normalize(12),
    },
    bulkRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: normalize(14),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: normalize(8),
    },
    bulkTextWrap: {
      flex: 1,
      marginLeft: normalize(10),
    },
    bulkTitle: {
      fontFamily: fonts.semibold,
      fontSize: fontSizes.md,
      color: colors.textPrimary,
    },
    bulkSubtitle: {
      marginTop: normalize(4),
      fontFamily: fonts.regular,
      fontSize: fontSizes.sm,
      color: colors.textMuted,
      lineHeight: normalize(18),
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: normalize(10),
    },
    itemCheck: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    itemLabel: {
      flex: 1,
      marginLeft: normalize(8),
      fontFamily: fonts.regular,
      fontSize: fontSizes.sm,
      color: colors.textPrimary,
      lineHeight: normalize(20),
    },
    detailLink: {
      fontFamily: fonts.semibold,
      fontSize: fontSizes.sm,
      color: colors.primaryDark,
      marginLeft: normalize(8),
    },
    footnote: {
      marginTop: normalize(12),
      fontFamily: fonts.regular,
      fontSize: fontSizes.xs,
      color: colors.textMuted,
      lineHeight: normalize(18),
    },
    primaryButton: {
      marginHorizontal: normalize(20),
      marginTop: normalize(8),
      height: normalize(52),
      borderRadius: normalize(12),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    primaryButtonText: {
      fontFamily: fonts.semibold,
      fontSize: fontSizes.md,
      color: colors.textPrimary,
    },
  });
}

export default SignupConsentSheet;

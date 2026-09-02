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
import Feather from '@expo/vector-icons/Feather';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import SignupIosSafeModal from './SignupIosSafeModal';
import { SignupLegalDocumentContent } from './SignupLegalDocumentModal';
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

  const detailModalVisible = showTermsOfService || showPrivacyPolicy;
  const activeDetail = showTermsOfService
    ? 'terms'
    : showPrivacyPolicy
      ? 'privacy'
      : null;

  useEffect(() => {
    if (!visible) {
      setConsents(createEmptyConsents());
      setShowTermsOfService(false);
      setShowPrivacyPolicy(false);
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

  const closeDetail = () => {
    setShowTermsOfService(false);
    setShowPrivacyPolicy(false);
  };

  const handleConfirm = () => {
    if (!canProceed) return;
    onConfirm?.({
      allConsented: canProceed,
      consents: { ...consents },
    });
  };

  /** @param {'bulk'|'item'} variant — bulk: 원형 체크 / item: 체크 아이콘만 */
  const Checkbox = ({ checked, variant = 'item' }) => {
    if (variant === 'bulk') {
      return (
        <View
          style={[
            styles.checkbox,
            styles.checkboxLg,
            checked ? styles.checkboxChecked : styles.checkboxUnchecked,
          ]}
        >
          <Feather
            name="check"
            size={normalize(18)}
            color={checked ? colors.textWhite : colors.textLight20}
          />
        </View>
      );
    }

    return (
      <View style={styles.itemCheckWrap}>
        <Feather
          name="check"
          size={normalize(18)}
          color={checked ? colors.primary : colors.textLight20}
        />
      </View>
    );
  };

  return (
    <>
      <SignupIosSafeModal
        visible={visible}
        transparent={!detailModalVisible}
        animationType="slide"
        onRequestClose={() => {
          if (detailModalVisible) closeDetail();
          else onClose();
        }}
      >
        {detailModalVisible && activeDetail ? (
          <SignupLegalDocumentContent
            slug={
              activeDetail === 'privacy' ? 'privacy_policy' : 'terms_of_service'
            }
            normalize={normalize}
            onClose={closeDetail}
          />
        ) : (
          <Pressable style={styles.backdrop} onPress={onClose}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.handle} />
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
              <View style={styles.bulkCard}>
                <View style={styles.bulkRow}>
                  <TouchableOpacity
                    onPress={toggleAll}
                    activeOpacity={0.85}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Checkbox checked={allBulkChecked} variant="bulk" />
                  </TouchableOpacity>
                  <View style={styles.bulkTextWrap}>
                    <TouchableOpacity onPress={toggleAll} activeOpacity={0.85}>
                      <Text style={styles.bulkTitle}>항목 전체 동의</Text>
                    </TouchableOpacity>
                    <View style={styles.bulkSubtitleRow}>
                      <TouchableOpacity
                        onPress={() => openDetail('terms')}
                        activeOpacity={0.7}
                        hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                      >
                        <Text style={styles.bulkLink}>이용약관</Text>
                      </TouchableOpacity>
                      <Text style={styles.bulkSubtitlePlain}> 및 </Text>
                      <TouchableOpacity
                        onPress={() => openDetail('privacy')}
                        activeOpacity={0.7}
                        hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                      >
                        <Text style={styles.bulkLink}>개인정보처리방침</Text>
                      </TouchableOpacity>
                      <Text style={styles.bulkSubtitlePlain}>
                        을 읽었으며 이에 모두 동의합니다
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.itemList}>
                {items.map((item) => (
                  <View key={item.key} style={styles.itemCard}>
                    <TouchableOpacity
                      style={styles.itemRow}
                      onPress={() => toggle(item.key)}
                      activeOpacity={0.85}
                    >
                      <Checkbox checked={consents[item.key]} variant="item" />
                      <View style={styles.itemLabelWrap}>
                        {item.required ? (
                          <View style={styles.badgeRequired}>
                            <Text style={styles.badgeText}>필수</Text>
                          </View>
                        ) : (
                          <View style={styles.badgeOptional}>
                            <Text style={styles.badgeText}>선택</Text>
                          </View>
                        )}
                        <Text style={styles.itemLabel}>{item.label}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

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
              <Text
                style={[
                  styles.primaryButtonText,
                  !canProceed && styles.primaryButtonTextDisabled,
                ]}
              >
                다음 단계
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
        )}
      </SignupIosSafeModal>
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
      borderTopLeftRadius: normalize(24),
      borderTopRightRadius: normalize(24),
      maxHeight: '88%',
      paddingBottom: normalize(30),
    },
    handle: {
      alignSelf: 'center',
      width: normalize(40),
      height: normalize(4),
      borderRadius: normalize(2),
      backgroundColor: colors.border,
      marginTop: normalize(10),
      marginBottom: normalize(12),
    },
    scrollContent: {
      paddingHorizontal: normalize(20),
      paddingBottom: normalize(12),
      gap: normalize(10),
    },
    bulkCard: {
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: normalize(20),
      backgroundColor: colors.primaryLight10,
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(14),
    },
    bulkRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: normalize(10),
    },
    bulkTextWrap: {
      flex: 1,
    },
    bulkTitle: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xl),
      color: colors.textPrimary,
    },
    bulkSubtitleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginTop: normalize(6),
    },
    bulkSubtitlePlain: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
    },
    bulkLink: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.md),
      color: colors.primaryDark,
      textDecorationLine: 'underline',
    },
    itemList: {
      gap: normalize(8),
    },
    itemCard: {
      borderWidth: 1,
      borderColor: colors.textLight20,
      borderRadius: normalize(16),
      backgroundColor: colors.background,
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(12),
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: normalize(10),
    },
    itemLabelWrap: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: normalize(6),
    },
    badgeRequired: {
      backgroundColor: colors.primary,
      borderRadius: normalize(6),
      paddingHorizontal: normalize(6),
      paddingVertical: normalize(2),
    },
    badgeOptional: {
      backgroundColor: colors.textLight20,
      borderRadius: normalize(6),
      paddingHorizontal: normalize(6),
      paddingVertical: normalize(2),
    },
    badgeText: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.sm),
      color: colors.textPrimary,
    },
    itemLabel: {
      flex: 1,
      flexShrink: 1,
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.lg),
      color: colors.textPrimary,
      lineHeight: normalize(22),
    },
    checkbox: {
      width: normalize(20),
      height: normalize(20),
      borderRadius: normalize(10),
      borderWidth: 1.5,
      borderColor: colors.textLight20,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: normalize(2),
    },
    checkboxLg: {
      width: normalize(25),
      height: normalize(25),
      borderRadius: normalize(50),
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    itemCheckWrap: {
      width: normalize(24),
      height: normalize(24),
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: normalize(2),
    },
    footnote: {
      marginTop: normalize(4),
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      lineHeight: normalize(20),
      textAlign: 'center',
    },
    primaryButton: {
      marginHorizontal: normalize(20),
      marginTop: normalize(8),
      height: normalize(52),
      borderRadius: normalize(26),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    primaryButtonText: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xxl),
      color: colors.textWhite,
    },
    primaryButtonTextDisabled: {
      color: colors.textSecondary,
    },
  });
}

export default SignupConsentSheet;

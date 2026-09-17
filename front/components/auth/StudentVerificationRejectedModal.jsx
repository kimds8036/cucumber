import React, { useEffect, useMemo, useState } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppPopupModal from '../common/AppPopupModal';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';

const FALLBACK_REASON =
  '관리자 확인 결과, 제출하신 자료로 재학을 확인할 수 없습니다.';

/**
 * 학생증/증명서 거절 사유 안내.
 * 재제출은 선택 — 닫으면 미인증으로 앱 계속 이용.
 * canResubmit=false(예: 이미 PENDING 검수 중)면 재제출 버튼 숨김.
 */
export default function StudentVerificationRejectedModal({
  visible,
  onClose,
  onDismissed,
  onPressResubmit,
  rejectReason,
  canResubmit = true,
}) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createStyles(normalize), [normalize]);
  const incomingReason = String(rejectReason || '').trim();
  // 닫힘 애니메이션 중 props 가 비워져도 내용이 바뀌지 않도록 유지
  const [latchedReason, setLatchedReason] = useState(incomingReason);

  useEffect(() => {
    if (!visible) return;
    if (incomingReason) setLatchedReason(incomingReason);
  }, [visible, incomingReason]);

  const reasonText = latchedReason || FALLBACK_REASON;

  return (
    <AppPopupModal
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      dismissOnBackdrop={false}
      dismissOnBackPress
      overlayColor="rgba(0,0,0,0.5)"
      cardStyle={styles.card}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name="alert-circle-outline"
          size={normalize(28)}
          color={colors.alertDark || colors.alert}
        />
      </View>
      <Text style={styles.title}>학생증이 거절되었습니다</Text>
      <View style={styles.reasonBox}>
        <Text style={styles.reasonLabel}>거절 사유</Text>
        <Text style={styles.reasonText}>{reasonText}</Text>
      </View>
      <Text style={styles.hint}>
        {canResubmit
          ? '다시 제출하지 않아도 미인증 상태로 앱을 이용할 수 있어요.'
          : '이미 학생증 검수 중이에요. 결과가 나올 때까지 기다려 주세요.'}
      </Text>
      <View style={styles.actions}>
        {canResubmit ? (
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={onPressResubmit}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>다시 제출하기</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={onClose}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSecondaryText}>
            {canResubmit ? '미인증으로 계속' : '확인'}
          </Text>
        </TouchableOpacity>
      </View>
    </AppPopupModal>
  );
}

function createStyles(normalize) {
  return {
    card: {
      paddingTop: normalize(22),
      paddingBottom: normalize(18),
    },
    iconWrap: {
      alignSelf: 'center',
      width: normalize(52),
      height: normalize(52),
      borderRadius: normalize(26),
      backgroundColor: colors.alertLight || '#FFF0F0',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: normalize(14),
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xl + 1),
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: normalize(14),
    },
    reasonBox: {
      width: '100%',
      backgroundColor: colors.alertLight || '#FFF0F0',
      borderRadius: normalize(12),
      borderWidth: 1,
      borderColor: colors.alert,
      borderLeftWidth: 4,
      borderLeftColor: colors.alertDark || colors.alert,
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(12),
      marginBottom: normalize(12),
    },
    reasonLabel: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.sm + 2),
      color: colors.alertDark || colors.alert,
      marginBottom: normalize(6),
    },
    reasonText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textPrimary,
      lineHeight: normalize(22),
    },
    hint: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: normalize(20),
      marginBottom: normalize(18),
      paddingHorizontal: normalize(4),
    },
    actions: {
      gap: normalize(8),
    },
    btn: {
      height: normalize(48),
      borderRadius: normalize(14),
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnPrimary: {
      backgroundColor: colors.primary,
    },
    btnPrimaryText: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.lg),
      color: colors.textWhite || colors.background,
    },
    btnSecondary: {
      backgroundColor: colors.textLight5 || 'rgba(0,0,0,0.05)',
    },
    btnSecondaryText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
    },
  };
}

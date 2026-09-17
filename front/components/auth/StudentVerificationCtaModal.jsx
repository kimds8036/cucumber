import React, { useMemo } from 'react';
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

/**
 * 제한 기능 진입 시 학생인증 유도
 * AppPopupModal 셸 · 여백 탭으로 닫기 금지
 */
export default function StudentVerificationCtaModal({
  visible,
  onClose,
  onPressVerify,
  onDismissed,
  status = 'UNVERIFIED',
  message,
}) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createStyles(normalize), [normalize]);

  const isPending = status === 'PENDING';
  const title = isPending ? '학생증 검수 중' : '학생 인증이 필요해요';
  const body =
    message ||
    (isPending
      ? '제출하신 학생증을 확인하고 있어요. 승인되면 우리학교·학생 게시판·우편을 이용할 수 있어요.'
      : '우리학교·학생 게시판·우편 등 전용 기능은 학생인증 후 이용할 수 있어요.');

  return (
    <AppPopupModal
      visible={visible}
      onClose={onClose}
      dismissOnBackdrop={false}
      dismissOnBackPress
      overlayColor="rgba(0,0,0,0.5)"
      cardStyle={styles.card}
      onDismissed={onDismissed}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={isPending ? 'time-outline' : 'school-outline'}
          size={normalize(28)}
          color={colors.primary}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <View style={styles.actions}>
        {!isPending ? (
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={onPressVerify}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>학생 인증하기</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={onClose}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSecondaryText}>
            {isPending ? '확인' : '나중에'}
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
      backgroundColor: colors.green || 'rgba(76, 175, 80, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: normalize(14),
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xl + 1),
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: normalize(8),
    },
    body: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: normalize(22),
      marginBottom: normalize(22),
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

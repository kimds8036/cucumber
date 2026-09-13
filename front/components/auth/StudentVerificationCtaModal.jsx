import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';

/**
 * 우리학교·학생 보드 등 제한 기능 진입 시 학생증 인증 유도
 */
export default function StudentVerificationCtaModal({
  visible,
  onClose,
  onPressVerify,
  status = 'UNVERIFIED',
}) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createStyles(normalize), [normalize]);

  const isPending = status === 'PENDING';
  const title = isPending ? '학생증 검수 중' : '학생 인증이 필요해요';
  const body = isPending
    ? '제출하신 학생증을 확인하고 있어요. 승인되면 우리학교·학생 게시판·우편을 이용할 수 있어요.'
    : '우리학교·학생 게시판·우편 등 전용 기능은 학생증 인증 후 이용할 수 있어요.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.actions}>
            {!isPending ? (
              <Pressable
                style={[styles.btn, styles.btnPrimary]}
                onPress={onPressVerify}
              >
                <Text style={styles.btnPrimaryText}>학생증으로 인증</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.btn, styles.btnSecondary]}
              onPress={onClose}
            >
              <Text style={styles.btnSecondaryText}>
                {isPending ? '확인' : '나중에'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(normalize) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      paddingHorizontal: normalize(28),
    },
    card: {
      backgroundColor: colors.background,
      borderRadius: normalize(16),
      paddingHorizontal: normalize(20),
      paddingVertical: normalize(22),
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xl),
      color: colors.textPrimary,
      marginBottom: normalize(10),
    },
    body: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      lineHeight: normalize(22),
      marginBottom: normalize(20),
    },
    actions: { gap: normalize(8) },
    btn: {
      borderRadius: normalize(12),
      paddingVertical: normalize(14),
      alignItems: 'center',
    },
    btnPrimary: { backgroundColor: colors.primary },
    btnPrimaryText: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.lg),
      color: colors.background,
    },
    btnSecondary: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border || colors.textLight20,
    },
    btnSecondaryText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
    },
  });
}

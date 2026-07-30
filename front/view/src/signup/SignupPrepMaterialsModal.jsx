import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../../styles/colors';
import SignupIosSafeModal from './SignupIosSafeModal';

/**
 * 로그인 → 회원가입 직전 준비물 안내.
 * 배경(여백) 탭으로 닫히지 않음 — 버튼으로만 진행/취소.
 */
const SignupPrepMaterialsModal = ({
  visible,
  normalize = (n) => n,
  onConfirm,
  onCancel,
}) => (
  <SignupIosSafeModal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={() => {}}
  >
    <View style={styles.backdrop}>
      <View
        style={[
          styles.card,
          { borderRadius: normalize(14), padding: normalize(20) },
        ]}
      >
        <Text style={[styles.title, { fontSize: normalize(18) }]}>
          회원가입 전에 준비해 주세요
        </Text>
        <Text
          style={[
            styles.lead,
            { fontSize: normalize(14), lineHeight: normalize(22) },
          ]}
        >
          학생 인증에 아래 준비물 중 하나가 필요해요. 미리 준비해 두면 가입이
          훨씬 수월합니다.
        </Text>

        <View
          style={[
            styles.listBox,
            {
              borderRadius: normalize(12),
              padding: normalize(14),
              marginBottom: normalize(8),
            },
          ]}
        >
          <Text
            style={[
              styles.itemTitle,
              { fontSize: normalize(15), marginBottom: normalize(4) },
            ]}
          >
            1. 학생증
          </Text>
          <Text
            style={[
              styles.itemBody,
              { fontSize: normalize(13), lineHeight: normalize(19) },
            ]}
          >
            실물 학생증을 촬영해 제출합니다. (가장 일반적인 방법)
          </Text>
        </View>

        <View
          style={[
            styles.listBox,
            {
              borderRadius: normalize(12),
              padding: normalize(14),
              marginBottom: normalize(16),
            },
          ]}
        >
          <Text
            style={[
              styles.itemTitle,
              { fontSize: normalize(15), marginBottom: normalize(4) },
            ]}
          >
            2. 나이스+ 또는 재학증명서
          </Text>
          <Text
            style={[
              styles.itemBody,
              { fontSize: normalize(13), lineHeight: normalize(19) },
            ]}
          >
            나이스+(교육부) 앱의 학적 화면 캡처, 또는 네이버 등 재학증명서 열람
            주소·열람번호를 준비해 주세요.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            { borderRadius: normalize(10), paddingVertical: normalize(12) },
          ]}
          activeOpacity={0.9}
          onPress={onConfirm}
        >
          <Text style={[styles.buttonText, { fontSize: normalize(15) }]}>
            확인했습니다
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            marginTop: normalize(10),
            paddingVertical: normalize(10),
            alignItems: 'center',
          }}
          activeOpacity={0.8}
          onPress={onCancel}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontWeight: '600',
              fontSize: normalize(14),
            }}
          >
            돌아가기
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </SignupIosSafeModal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.background,
  },
  title: {
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  lead: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  listBox: {
    backgroundColor: colors.surface,
  },
  itemTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemBody: {
    color: colors.textSecondary,
  },
  button: {
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default SignupPrepMaterialsModal;

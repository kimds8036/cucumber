import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { colors, fonts } from '../../../styles/colors';
import { getNormalize } from '../../../styles/frame.style';
import { api } from '../../../utils/api';
import SignupHelperText from './SignupHelperText';
import { useAuth } from '../../../context/AuthContext';
import SubmittingLockModal from '../../../components/common/SubmittingLockModal';
import SubHeader from '../../frame/subHeader';

/**
 * 거절 후 재학증명서 재제출 — SafeArea 는 App 거절 플로우 셸에서만 처리
 */
const CertificateResubmit = ({ navigation }) => {
  const { refreshStudentVerification } = useAuth();
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);

  const [certificateUrl, setCertificateUrl] = useState('');
  const [accessNumber, setAccessNumber] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    const certificateViewUrl = certificateUrl.trim();
    const certificateAccessCode = accessNumber.trim();
    if (!certificateViewUrl || !certificateAccessCode) {
      Alert.alert('알림', '열람용 주소와 열람 번호를 모두 입력해 주세요.');
      return;
    }

    setBusy(true);
    try {
      const res = await api.post('/api/auth/resubmit-certificate', {
        certificateViewUrl,
        certificateAccessCode,
      });
      if (!res.data?.success) {
        throw new Error(res.data?.message || '제출에 실패했습니다.');
      }
      await refreshStudentVerification();
      Alert.alert(
        '제출 완료',
        res.data?.message ||
          '재학증명서가 제출되었습니다. 관리자 승인을 기다려 주세요.',
      );
      if (typeof navigation.closeFlow === 'function') {
        navigation.closeFlow();
      } else {
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert(
        '제출 실패',
        e?.response?.data?.message ||
          e?.message ||
          '재학증명서 재제출 중 오류가 발생했습니다.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <SubHeader
        title="재학증명서 제출"
        onBack={() => {
          if (busy) return;
          navigation.goBack();
        }}
      />

      <View style={[styles.body, { paddingHorizontal: width * 0.07 }]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: normalize(16) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <SignupHelperText
            normalize={normalize}
            variant="emphasis"
            style={{ marginBottom: normalize(16) }}
          >
            재학증명서 열람 주소와 열람 번호를 입력해 주세요.
          </SignupHelperText>

          <Text style={[styles.label, { fontSize: normalize(14) }]}>
            열람용 주소
          </Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { fontSize: normalize(15) }]}
              value={certificateUrl}
              onChangeText={setCertificateUrl}
              placeholder="ex) https://naver.me/XXXXXXXX"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!busy}
            />
          </View>

          <Text
            style={[
              styles.label,
              { fontSize: normalize(14), marginTop: normalize(14) },
            ]}
          >
            열람 번호
          </Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { fontSize: normalize(15) }]}
              value={accessNumber}
              onChangeText={setAccessNumber}
              placeholder="ex) 000000"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
              editable={!busy}
            />
          </View>
        </ScrollView>
      </View>

      <View style={[styles.footer, { paddingHorizontal: width * 0.07 }]}>
        <TouchableOpacity
          style={[
            styles.submit,
            {
              height: normalize(50),
              borderRadius: normalize(24),
              opacity: busy ? 0.6 : 1,
            },
          ]}
          activeOpacity={0.9}
          disabled={busy}
          onPress={handleSubmit}
        >
          {busy ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.submitText, { fontSize: normalize(16) }]}>
              제출하기
            </Text>
          )}
        </TouchableOpacity>
      </View>
      <SubmittingLockModal visible={busy} message="재학증명서 제출 중…" />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  footer: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: 12,
    flexShrink: 0,
  },
  label: {
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  input: {
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  submit: {
    width: '100%',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    fontFamily: fonts.bold,
    color: colors.background,
  },
});

export default CertificateResubmit;

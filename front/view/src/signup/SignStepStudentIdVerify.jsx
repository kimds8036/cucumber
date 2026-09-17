import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import { api } from '../../../utils/api';
import { normalizeBirthDateForCompare } from './signupBirthDatePolicy';
import SubmittingLockModal from '../../../components/common/SubmittingLockModal';
import SignupPrimaryFooter from './SignupPrimaryFooter';
import { SIGNUP_REDESIGN_SKIP_VALIDATION } from './signupRedesignFlags';
import StudentIdPhotoAttachFields from './StudentIdPhotoAttachFields';

const UPLOAD_TIMEOUT_MS = 120_000;

const SignStepStudentIdVerify = ({
  styles,
  normalize = (n) => n,
  identity,
  schoolId,
  alreadyVerified = false,
  onVerified,
  onCertificateGuide,
  onConfirm,
  submitting = false,
}) => {
  const { width } = useWindowDimensions();
  const localStyles = useMemo(
    () => createLocalStyles(normalize, width),
    [normalize, width],
  );
  const bodyStyle = useMemo(
    () => [styles.stepFlex, localStyles.body, localStyles.stepRoot],
    [localStyles.body, localStyles.stepRoot, styles.stepFlex],
  );

  const [uploading, setUploading] = useState(false);
  const [primaryUri, setPrimaryUri] = useState(null);
  const [primaryBase64, setPrimaryBase64] = useState(null);
  const [primaryAspect, setPrimaryAspect] = useState(1);
  const [secondaryUri, setSecondaryUri] = useState(null);
  const [secondaryBase64, setSecondaryBase64] = useState(null);
  const [secondaryAspect, setSecondaryAspect] = useState(1);

  const busy = uploading;

  const validateBeforeSubmit = useCallback(() => {
    if (SIGNUP_REDESIGN_SKIP_VALIDATION) return true;

    if (!identity?.name?.trim() || !identity?.birthDate) {
      Alert.alert('알림', '이름·생년월일·전화번호 인증을 먼저 완료해 주세요.');
      return false;
    }
    if (!schoolId) {
      Alert.alert('알림', '재학 중인 학교를 먼저 선택해 주세요.');
      return false;
    }
    if (!primaryBase64) {
      Alert.alert('알림', '학생증 사진을 첨부해 주세요.');
      return false;
    }
    return true;
  }, [identity, schoolId, primaryBase64]);

  const handleSubmit = useCallback(async () => {
    if (alreadyVerified || busy) return;

    if (SIGNUP_REDESIGN_SKIP_VALIDATION) {
      onVerified?.({
        name: identity?.name || '개편테스트',
        manualReview: true,
        cloudinaryUrl: '',
        grade: '',
        class: '',
        graduationYear: '',
        studentVerificationToken: 'redesign-skip-student-token',
        verification: {
          studentVerificationToken: 'redesign-skip-student-token',
        },
      });
      return;
    }

    if (!validateBeforeSubmit()) return;

    setUploading(true);
    try {
      const normalizedBirthDate =
        normalizeBirthDateForCompare(identity.birthDate) || identity.birthDate;
      const normalizedPhone = String(identity.phoneNumber || '').replace(
        /\D/g,
        '',
      );

      const body = {
        name: identity.name.trim(),
        birthDate: normalizedBirthDate,
        phone: normalizedPhone,
        schoolId,
        imageBase64: primaryBase64,
      };
      if (secondaryBase64) {
        body.imageBase64Secondary = secondaryBase64;
      }

      const res = await api.post('/api/auth/signup/upload-student-id', body, {
        timeout: UPLOAD_TIMEOUT_MS,
      });

      const data = res.data?.data;
      if (!res.data?.success || !data?.passed) {
        Alert.alert(
          '학생증 제출 실패',
          res.data?.message || '학생증 사진을 다시 첨부해 주세요.',
        );
        return;
      }

      onVerified?.({
        name: identity.name,
        manualReview: true,
        cloudinaryUrl: data.cloudinaryUrl,
        grade: data.suggestedGrade ?? '',
        class: data.suggestedClassNumber ?? '',
        graduationYear: data.suggestedGraduationYear ?? '',
        expectedLevel: data.expectedLevel,
        studentVerificationToken: data.studentVerificationToken,
        verification: data,
      });
    } catch (e) {
      console.warn('[SignStepStudentIdVerify]', e?.response?.data || e);
      const timedOut = e?.code === 'ECONNABORTED';
      const networkLike =
        timedOut || !e?.response || e?.message === 'Network Error';
      const msg =
        e?.response?.status === 429
          ? e?.response?.data?.message ||
            '학생증 업로드 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
          : networkLike
            ? '학생증 업로드에 시간이 걸리거나 연결이 끊겼습니다. Wi‑Fi·데이터를 확인한 뒤 다시 시도해 주세요.'
            : e?.response?.data?.message ||
              '학생증 제출 중 오류가 발생했습니다.';
      Alert.alert('인증 오류', msg);
    } finally {
      setUploading(false);
    }
  }, [
    alreadyVerified,
    busy,
    identity,
    schoolId,
    onVerified,
    validateBeforeSubmit,
    primaryBase64,
    secondaryBase64,
  ]);

  if (alreadyVerified) {
    return (
      <View style={bodyStyle}>
        <View style={localStyles.completeContent}>
          <Text style={localStyles.completeEmoji}>🎉</Text>
          <Text style={localStyles.completeTitle}>가입이 완료되었습니다!</Text>
          <Text style={localStyles.completeSubtitle}>
            학생증 확인 완료 후 서비스를 이용할 수 있어요
          </Text>
          <Text style={localStyles.completeSubtitle}>
            확인이 완료되면 알림을 보내드릴게요
          </Text>
        </View>

        <SignupPrimaryFooter
          label="확인"
          onPress={() => onConfirm?.()}
          disabled={submitting}
          loading={submitting}
          embedded
        />
      </View>
    );
  }

  return (
    <View style={bodyStyle}>
      <ScrollView
        style={localStyles.scroll}
        contentContainerStyle={localStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <StudentIdPhotoAttachFields
          normalize={normalize}
          busy={busy}
          primaryUri={primaryUri}
          primaryAspect={primaryAspect}
          secondaryUri={secondaryUri}
          secondaryAspect={secondaryAspect}
          onPrimaryPicked={({ uri, base64, aspect }) => {
            setPrimaryUri(uri);
            setPrimaryBase64(base64);
            setPrimaryAspect(aspect);
          }}
          onSecondaryPicked={({ uri, base64, aspect }) => {
            setSecondaryUri(uri);
            setSecondaryBase64(base64);
            setSecondaryAspect(aspect);
          }}
          onClearPrimary={() => {
            if (secondaryUri) {
              setPrimaryUri(secondaryUri);
              setPrimaryBase64(secondaryBase64);
              setPrimaryAspect(secondaryAspect);
              setSecondaryUri(null);
              setSecondaryBase64(null);
              setSecondaryAspect(1);
            } else {
              setPrimaryUri(null);
              setPrimaryBase64(null);
              setPrimaryAspect(1);
            }
          }}
          onClearSecondary={() => {
            setSecondaryUri(null);
            setSecondaryBase64(null);
            setSecondaryAspect(1);
          }}
          onNoStudentIdPress={onCertificateGuide}
        />
      </ScrollView>

      <View style={localStyles.bottomBlock}>
        <SignupPrimaryFooter
          label="제출하기"
          onPress={handleSubmit}
          disabled={busy || !primaryBase64}
          loading={busy}
          embedded
        />
      </View>

      <SubmittingLockModal visible={uploading} message="학생증 제출 중…" />
    </View>
  );
};

function createLocalStyles(normalize, width) {
  return StyleSheet.create({
    body: {
      flex: 1,
      marginHorizontal: -width * 0.04,
      paddingHorizontal: width * 0.07,
    },
    stepRoot: {
      flex: 1,
      minHeight: 0,
      backgroundColor: 'transparent',
    },
    scroll: {
      flex: 1,
      minHeight: 0,
    },
    scrollContent: {
      paddingBottom: normalize(16),
    },
    bottomBlock: {
      flexShrink: 0,
      paddingTop: normalize(8),
    },
    completeContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: normalize(12),
    },
    completeEmoji: {
      fontSize: normalize(40),
      marginBottom: normalize(12),
    },
    completeTitle: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xl),
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: normalize(8),
    },
    completeSubtitle: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: normalize(22),
    },
  });
}

export default SignStepStudentIdVerify;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useCameraPermissions } from 'expo-camera';
import { colors } from '../../../styles/colors';
import { createStudentIdCameraLayerStyles } from '../../../styles/studentIdCameraLayers';
import { api } from '../../../utils/api';
import {
  cropRectToNormalized,
  getStudentIdFrameSize,
  resolveStudentIdCropRect,
} from '../../../utils/studentIdFrameCrop';
import StudentIdCaptureStage, {
  useStudentIdCapture,
} from '../../../components/auth/StudentIdCaptureStage';
import SignupHelperText from './SignupHelperText';
import { normalizeBirthDateForCompare } from './signupBirthDatePolicy';
import SubmittingLockModal from '../../../components/common/SubmittingLockModal';
import { SIGNUP_REDESIGN_SKIP_VALIDATION } from './signupRedesignFlags';

const UPLOAD_TIMEOUT_MS = 120_000;

const SignStepStudentIdVerify = ({
  styles,
  normalize = (n) => n,
  identity,
  schoolId,
  alreadyVerified = false,
  onVerified,
  onCertificateGuide,
}) => {
  const isFocused = useIsFocused();
  const { width: screenWidth } = useWindowDimensions();
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const layerStyles = useMemo(() => createStudentIdCameraLayerStyles(), []);

  const stageReady = stageSize.width > 0 && stageSize.height > 0;
  const stageWidth = stageReady ? stageSize.width : screenWidth;

  const { frameWidth, frameHeight } = useMemo(
    () =>
      stageReady
        ? getStudentIdFrameSize(stageWidth)
        : { frameWidth: 0, frameHeight: 0 },
    [stageReady, stageWidth],
  );

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const { frozenUri, capture, resetCapture, previewLayoutRef, lastPhotoRef } =
    useStudentIdCapture(cameraRef);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('');

  const onStageLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setStageSize({ width, height });
      previewLayoutRef.current = { width, height };
    }
  }, [previewLayoutRef]);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const runVerify = useCallback(async () => {
    if (alreadyVerified) {
      Alert.alert('알림', '이미 학생증 인증이 완료되었습니다. 다음 단계로 진행해 주세요.');
      return;
    }
    if (busy) return;

    // [SIGNUP_REDESIGN_SKIP] 촬영·업로드·필수 필드 검증 우회
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

    if (!identity?.name?.trim() || !identity?.birthDate) {
      Alert.alert('알림', '이름·생년월일·전화번호 인증을 먼저 완료해 주세요.');
      return;
    }
    if (!schoolId) {
      Alert.alert('알림', '재학 중인 학교를 먼저 선택해 주세요.');
      return;
    }

    if (!cameraRef.current) return;

    const preview = previewLayoutRef.current;
    if (!preview.width || !preview.height) {
      Alert.alert('알림', '카메라가 준비되는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    setBusy(true);
    setStatusText('학생증을 업로드하는 중…');
    try {
      let photo = lastPhotoRef.current;
      if (!photo) {
        photo = await capture();
      }

      if (!photo?.base64) {
        Alert.alert('촬영 실패', '다시 촬영해 주세요.');
        resetCapture();
        return;
      }

      const cropRect = resolveStudentIdCropRect({
        photoWidth: photo.width,
        photoHeight: photo.height,
        previewWidth: preview.width,
        previewHeight: preview.height,
        frameWidth,
        frameHeight,
      });

      const cropRegion =
        cropRect && photo.width && photo.height
          ? cropRectToNormalized(cropRect, photo.width, photo.height)
          : null;

      const normalizedBirthDate =
        normalizeBirthDateForCompare(identity.birthDate) || identity.birthDate;
      const normalizedPhone = String(identity.phoneNumber || '').replace(/\D/g, '');

      const res = await api.post(
        '/api/auth/signup/upload-student-id',
        {
          name: identity.name.trim(),
          birthDate: normalizedBirthDate,
          phone: normalizedPhone,
          schoolId,
          imageBase64: photo.base64,
          cropRegion,
        },
        { timeout: UPLOAD_TIMEOUT_MS },
      );

      const data = res.data?.data;
      if (!res.data?.success || !data?.passed) {
        Alert.alert(
          '학생증 제출 실패',
          res.data?.message || '학생증을 다시 촬영해 주세요.',
        );
        setStatusText('업로드에 실패했습니다. 다시 시도해 주세요.');
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
      setStatusText('오류가 발생했습니다. 다시 시도해 주세요.');
      resetCapture();
    } finally {
      setBusy(false);
      if (!lastPhotoRef.current) {
        setStatusText('');
      }
    }
  }, [identity, schoolId, onVerified, frameWidth, frameHeight, alreadyVerified, busy, capture, lastPhotoRef, resetCapture]);

  if (alreadyVerified) {
    return (
      <View style={[styles.content, localStyles.stepRoot, localStyles.centered]}>
        <Text style={[styles.inputLabel, { textAlign: 'center' }]}>
          학생증 촬영이 완료되었습니다.
        </Text>
        <SignupHelperText
          normalize={normalize}
          centered
          showIcon={false}
          style={{ marginTop: normalize(8) }}
        >
          아래 [제출하기]를 누르면 가입이 완료되고, 관리자 승인 대기 화면으로
          이동합니다.
        </SignupHelperText>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.content, localStyles.stepRoot, localStyles.centered]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.content, localStyles.stepRoot]}>
        <Text style={styles.inputLabel}>카메라 권한이 필요합니다.</Text>
        <TouchableOpacity style={styles.manualButton} onPress={requestPermission}>
          <Text style={styles.manualButtonText}>권한 허용하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showCamera = isFocused;

  return (
    <View style={[styles.content, localStyles.stepRoot]}>
      <SignupHelperText
        normalize={normalize}
        variant="emphasis"
        style={{ marginBottom: normalize(10) }}
      >
        학교명과 이름이 선명하게 보이도록 촬영해 주세요. 흐리거나 잘리면 승인되지
        않을 수 있어요.
      </SignupHelperText>
      <View style={styles.cameraContainer}>
        <View
          style={styles.cameraStage}
          onLayout={onStageLayout}
          collapsable={false}
        >
          {showCamera ? (
            <View style={styles.cameraStageStack} collapsable={false}>
              <StudentIdCaptureStage
                cameraRef={cameraRef}
                frozenUri={frozenUri}
                statusText={statusText}
                guideTextStyle={styles.cameraGuideText}
                stageStyle={[styles.cameraPreview, layerStyles.preview, { flex: 1 }]}
                previewLayoutRef={previewLayoutRef}
                onStageLayout={({ width, height }) => {
                  previewLayoutRef.current = { width, height };
                }}
              />
            </View>
          ) : (
            <View style={localStyles.cameraPlaceholder}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.nextButton, localStyles.captureButton, busy && { opacity: 0.6 }]}
        disabled={busy || !showCamera}
        onPress={runVerify}
      >
        {busy ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.nextButtonText}>
            {frozenUri ? '제출하기' : '촬영 및 제출하기'}
          </Text>
        )}
      </TouchableOpacity>
      <View style={localStyles.certificateGuideLinkRow}>
        <Text style={localStyles.certificateGuideLinkText}>
          학생증이 없으신가요?{' '}
        </Text>
        <TouchableOpacity
          onPress={onCertificateGuide}
          disabled={busy}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text
            style={[
              localStyles.certificateGuideLinkAction,
              busy && localStyles.disabledLink,
            ]}
          >
            나이스+ / 증명서로 인증하기
          </Text>
        </TouchableOpacity>
      </View>
      {frozenUri ? (
        <TouchableOpacity
          style={localStyles.retakeLink}
          onPress={resetCapture}
          disabled={busy}
        >
          <Text style={localStyles.retakeLinkText}>다시 촬영하기</Text>
        </TouchableOpacity>
      ) : null}
      <SubmittingLockModal visible={busy} message="학생증 제출 중…" />
    </View>
  );
};

const localStyles = StyleSheet.create({
  stepRoot: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  captureButton: {
    marginTop: 12,
    flexShrink: 0,
  },
  certificateGuideLinkRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  certificateGuideLinkText: {
    fontFamily: 'Baloo2-Regular',
    color: colors.textSecondary,
    fontSize: 14,
  },
  certificateGuideLinkAction: {
    fontFamily: 'Baloo2-Bold',
    color: colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  disabledLink: {
    opacity: 0.5,
  },
  retakeLink: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 6,
  },
  retakeLinkText: {
    fontFamily: 'Baloo2-Bold',
    color: colors.primary,
    fontSize: 14,
  },
});

export default SignStepStudentIdVerify;

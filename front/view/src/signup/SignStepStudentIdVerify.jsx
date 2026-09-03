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
import { colors, fonts, fontSizes } from '../../../styles/colors';
import { createStudentIdCameraLayerStyles } from '../../../styles/studentIdCameraLayers';
import { api } from '../../../utils/api';
import {
  cropRectToNormalized,
  resolveStudentIdCropRect,
} from '../../../utils/studentIdFrameCrop';
import StudentIdCaptureStage, {
  useStudentIdCapture,
} from '../../../components/auth/StudentIdCaptureStage';
import { normalizeBirthDateForCompare } from './signupBirthDatePolicy';
import SubmittingLockModal from '../../../components/common/SubmittingLockModal';
import SignupPrimaryFooter from './SignupPrimaryFooter';
import { SIGNUP_REDESIGN_SKIP_VALIDATION } from './signupRedesignFlags';

const UPLOAD_TIMEOUT_MS = 120_000;
const CAMERA_INSTRUCTION =
  '학생증의 이름과 학교명이 잘 보이도록 촬영해 주세요';

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
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const layerStyles = useMemo(() => createStudentIdCameraLayerStyles(), []);
  const localStyles = useMemo(
    () => createLocalStyles(normalize, width),
    [normalize, width],
  );
  const bodyStyle = useMemo(
    () => [styles.stepFlex, localStyles.body, localStyles.stepRoot],
    [localStyles.body, localStyles.stepRoot, styles.stepFlex],
  );

  const stageReady = stageSize.width > 0 && stageSize.height > 0;

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const { frozenUri, capture, resetCapture, previewLayoutRef, lastPhotoRef } =
    useStudentIdCapture(cameraRef);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState('');

  const busy = capturing || uploading;

  const onStageLayout = useCallback((e) => {
    const { width: layoutWidth, height } = e.nativeEvent.layout;
    if (layoutWidth > 0 && height > 0) {
      setStageSize({ width: layoutWidth, height });
      previewLayoutRef.current = { width: layoutWidth, height };
    }
  }, [previewLayoutRef]);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const validateBeforeCapture = useCallback(() => {
    if (SIGNUP_REDESIGN_SKIP_VALIDATION) return true;

    if (!identity?.name?.trim() || !identity?.birthDate) {
      Alert.alert('알림', '이름·생년월일·전화번호 인증을 먼저 완료해 주세요.');
      return false;
    }
    if (!schoolId) {
      Alert.alert('알림', '재학 중인 학교를 먼저 선택해 주세요.');
      return false;
    }
    return true;
  }, [identity, schoolId]);

  const handleCapture = useCallback(async () => {
    if (alreadyVerified || busy || frozenUri) return;
    if (!validateBeforeCapture()) return;

    if (!cameraRef.current) {
      Alert.alert('알림', '카메라가 준비되는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    const preview = previewLayoutRef.current;
    if (!preview.width || !preview.height) {
      Alert.alert('알림', '카메라가 준비되는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    setCapturing(true);
    try {
      const photo = await capture();
      if (!photo?.base64) {
        Alert.alert('촬영 실패', '다시 촬영해 주세요.');
        resetCapture();
      }
    } finally {
      setCapturing(false);
    }
  }, [
    alreadyVerified,
    busy,
    frozenUri,
    validateBeforeCapture,
    capture,
    resetCapture,
  ]);

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

    if (!validateBeforeCapture()) return;

    const photo = lastPhotoRef.current;
    if (!photo?.base64) {
      Alert.alert('알림', '먼저 학생증을 촬영해 주세요.');
      return;
    }

    const preview = previewLayoutRef.current;
    if (!preview.width || !preview.height) {
      Alert.alert('알림', '촬영 정보를 불러오지 못했습니다. 다시 촬영해 주세요.');
      resetCapture();
      return;
    }

    setUploading(true);
    setStatusText('학생증을 업로드하는 중…');
    try {
      const cropRect = resolveStudentIdCropRect({
        photoWidth: photo.width,
        photoHeight: photo.height,
        previewWidth: preview.width,
        previewHeight: preview.height,
        frameWidth: preview.width,
        frameHeight: preview.height,
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

      setStatusText('');
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
      setUploading(false);
    }
  }, [
    alreadyVerified,
    busy,
    identity,
    schoolId,
    onVerified,
    validateBeforeCapture,
    lastPhotoRef,
    resetCapture,
  ]);

  const handlePrimaryPress = frozenUri ? handleSubmit : handleCapture;

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

  if (!permission) {
    return (
      <View style={[...bodyStyle, localStyles.centered]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={bodyStyle}>
        <Text style={styles.inputLabel}>카메라 권한이 필요합니다.</Text>
        <TouchableOpacity style={styles.manualButton} onPress={requestPermission}>
          <Text style={styles.manualButtonText}>권한 허용하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showCamera = isFocused;
  const primaryLabel = frozenUri ? '제출하기' : '촬영하기';

  return (
    <View style={bodyStyle}>
      <View style={localStyles.cameraArea}>
        <View
          style={localStyles.cameraCard}
          onLayout={onStageLayout}
          collapsable={false}
        >
          {showCamera ? (
            <>
              <StudentIdCaptureStage
                cameraRef={cameraRef}
                frozenUri={frozenUri}
                statusText={statusText}
                guideTextStyle={localStyles.statusText}
                hideFrameGuide
                onCameraReady={() => setCameraReady(true)}
                stageStyle={[
                  StyleSheet.absoluteFill,
                  layerStyles.preview,
                  localStyles.cameraPreview,
                ]}
                previewLayoutRef={previewLayoutRef}
                onStageLayout={({ width: stageWidth, height }) => {
                  previewLayoutRef.current = { width: stageWidth, height };
                }}
              />
              {stageReady && !frozenUri ? (
                <View style={localStyles.instructionOverlay} pointerEvents="none">
                  <Text style={localStyles.instructionText}>
                    {CAMERA_INSTRUCTION}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={localStyles.cameraPlaceholder}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          )}
        </View>
      </View>

      <View style={localStyles.bottomBlock}>
        <View style={localStyles.altAuthRow}>
          <Text style={localStyles.altAuthPrefix}>
            학생증 촬영이 어려우신가요?{' '}
          </Text>
          <TouchableOpacity
            onPress={onCertificateGuide}
            disabled={busy}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text
              style={[
                localStyles.altAuthAction,
                busy && localStyles.disabledLink,
              ]}
            >
              다른 방법으로 인증하기
            </Text>
          </TouchableOpacity>
        </View>

        <SignupPrimaryFooter
          label={primaryLabel}
          onPress={handlePrimaryPress}
          disabled={busy || !showCamera || (!frozenUri && !cameraReady)}
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
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    cameraArea: {
      flex: 1,
      minHeight: normalize(320),
      marginBottom: normalize(16),
    },
    cameraCard: {
      flex: 1,
      borderRadius: normalize(28),
      overflow: 'hidden',
      backgroundColor: '#2C2C2C',
      position: 'relative',
    },
    cameraPreview: {
      borderRadius: normalize(28),
    },
    cameraPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#2C2C2C',
    },
    instructionOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 3,
      paddingTop: normalize(20),
      paddingHorizontal: normalize(20),
      alignItems: 'center',
    },
    instructionText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg+1),
      color: colors.textWhite,
      textAlign: 'center',
      lineHeight: normalize(Math.round(fontSizes.xl * 1.5)),
    },
    statusText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textWhite,
      textAlign: 'center',
    },
    bottomBlock: {
      flexShrink: 0,
    },
    altAuthRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: normalize(8),
      paddingHorizontal: normalize(4),
    },
    altAuthPrefix: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
    },
    altAuthAction: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.lg),
      color: colors.textPrimary,
    },
    disabledLink: {
      opacity: 0.5,
    },
    completeContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: normalize(8),
    },
    completeEmoji: {
      fontSize: normalize(56),
      marginBottom: normalize(20),
    },
    completeTitle: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.heading),
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: normalize(16),
    },
    completeSubtitle: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.xl),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: normalize(Math.round(fontSizes.xl * 1.5)),
      marginBottom: normalize(4),
    },
  });
}

export default SignStepStudentIdVerify;

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
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../../../styles/colors';
import { createStudentIdCameraLayerStyles } from '../../../styles/studentIdCameraLayers';
import { api } from '../../../utils/api';
import {
  cropRectToNormalized,
  getStudentIdFrameSize,
  resolveStudentIdCropRect,
} from '../../../utils/studentIdFrameCrop';
import StudentIdCameraGuideOverlay from './StudentIdCameraGuideOverlay';

const OCR_VERIFY_TIMEOUT_MS = 120_000;

const SignStepStudentIdVerify = ({
  styles,
  identity,
  alreadyVerified = false,
  onVerified,
}) => {
  const isFocused = useIsFocused();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const layerStyles = useMemo(() => createStudentIdCameraLayerStyles(), []);

  const stageWidth = stageSize.width > 0 ? stageSize.width : screenWidth;
  const stageHeight =
    stageSize.height > 0 ? stageSize.height : Math.max(280, screenHeight * 0.42);

  const { frameWidth, frameHeight } = useMemo(
    () => getStudentIdFrameSize(stageWidth),
    [stageWidth],
  );

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const previewLayoutRef = useRef({ width: 0, height: 0 });
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('학생증을 가운데 틀에 맞춰 주세요.');

  const onStageLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setStageSize({ width, height });
      previewLayoutRef.current = { width, height };
    }
  }, []);

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
    if (!identity?.name?.trim() || !identity?.birthDate) {
      Alert.alert('알림', '이름·생년월일·전화번호 인증을 먼저 완료해 주세요.');
      return;
    }

    if (!cameraRef.current) return;

    const preview = previewLayoutRef.current;
    if (!preview.width || !preview.height) {
      Alert.alert('알림', '카메라가 준비되는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    setBusy(true);
    setStatusText('학생증을 인식하는 중…');
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo?.base64) {
        Alert.alert('촬영 실패', '다시 촬영해 주세요.');
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

      const res = await api.post(
        '/api/auth/signup/verify-student-id',
        {
          name: identity.name.trim(),
          birthDate: identity.birthDate,
          phone: identity.phoneNumber,
          imageBase64: photo.base64,
          cropRegion,
        },
        { timeout: OCR_VERIFY_TIMEOUT_MS },
      );

      const data = res.data?.data;
      if (__DEV__) {
        console.log('[SignStepStudentIdVerify] OCR API response', {
          passed: data?.passed,
          nameOk: data?.nameOk,
          levelOk: data?.levelOk,
          schoolOk: data?.schoolOk,
          expectedLevel: data?.expectedLevel,
          detectedLevel: data?.detectedLevel,
          school: data?.school,
          reasons: data?.reasons,
          suggestedGrade: data?.suggestedGrade,
          suggestedGraduationYear: data?.suggestedGraduationYear,
          ocrTextPreview: data?.ocrTextPreview,
        });
      }
      if (!res.data?.success || !data?.passed) {
        const reasons = (data?.reasons || []).join('\n');
        Alert.alert(
          '학생증 인증 실패',
          reasons || res.data?.message || '학생증을 다시 촬영해 주세요.',
        );
        setStatusText('인식에 실패했습니다. 다시 맞춰 주세요.');
        return;
      }

      onVerified?.({
        name: identity.name,
        school: data.school,
        schoolId: data.school?.id,
        grade: data.suggestedGrade ?? '',
        class: data.suggestedClassNumber ?? '',
        graduationYear: data.suggestedGraduationYear ?? '',
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
            '학생증 인식 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
          : networkLike
            ? '학생증 인식에 시간이 걸리거나 연결이 끊겼습니다. Wi‑Fi·데이터를 확인한 뒤 다시 시도해 주세요.'
            : e?.response?.data?.message ||
              '학생증 인증 중 오류가 발생했습니다.';
      Alert.alert('인증 오류', msg);
      setStatusText('오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
      setStatusText('학생증을 가운데 틀에 맞춰 주세요.');
    }
  }, [identity, onVerified, frameWidth, frameHeight, alreadyVerified, busy]);

  if (alreadyVerified) {
    return (
      <View style={[styles.content, localStyles.stepRoot, localStyles.centered]}>
        <Text style={[styles.inputLabel, { textAlign: 'center' }]}>
          학생증 인증이 완료되었습니다.
        </Text>
        <Text
          style={{
            marginTop: 8,
            color: colors.textSecondary,
            fontFamily: 'Baloo2-Regular',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          뒤로 가도 인증 결과가 유지됩니다. 다음 단계로 진행해 주세요.
        </Text>
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
      <View style={styles.cameraContainer}>
        <View
          style={styles.cameraStage}
          onLayout={onStageLayout}
          collapsable={false}
        >
          {showCamera ? (
            <View style={styles.cameraStageStack} collapsable={false}>
              <CameraView
                ref={cameraRef}
                style={[styles.cameraPreview, layerStyles.preview]}
                facing="back"
                mode="picture"
                collapsable={false}
                onMountError={(e) => {
                  console.warn('[SignStepStudentIdVerify] camera mount', e);
                  Alert.alert(
                    '카메라 오류',
                    e?.message ||
                      '카메라를 시작하지 못했습니다. 앱을 다시 시작해 주세요.',
                  );
                }}
              />
              <StudentIdCameraGuideOverlay
                stageWidth={stageWidth}
                stageHeight={stageHeight}
                frameWidth={frameWidth}
                frameHeight={frameHeight}
                statusText={statusText}
                guideTextStyle={styles.cameraGuideText}
                overlayRootStyle={[styles.cameraGuideOverlay, layerStyles.guideOverlay]}
                layerStyles={layerStyles}
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
          <Text style={styles.nextButtonText}>촬영 및 인증하기</Text>
        )}
      </TouchableOpacity>
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
});

export default SignStepStudentIdVerify;

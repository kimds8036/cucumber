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
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../styles/colors';
import { createStudentIdCameraLayerStyles } from '../../../styles/studentIdCameraLayers';
import { api } from '../../../utils/api';
import {
  cropRectToNormalized,
  getStudentIdFrameSize,
  resolveStudentIdCropRect,
} from '../../../utils/studentIdFrameCrop';
import StudentIdCameraGuideOverlay from './StudentIdCameraGuideOverlay';
import { useAuth } from '../../../context/AuthContext';

const UPLOAD_TIMEOUT_MS = 120_000;

/** 거절된 사용자 학생증 재제출 */
const StudentIdResubmit = ({ navigation }) => {
  const { refreshStudentVerification } = useAuth();
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
  const [statusText, setStatusText] = useState(
    '학생증을 가운데 틀에 맞춘 뒤 촬영해 주세요.',
  );

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission, requestPermission]);

  const runResubmit = useCallback(async () => {
    if (busy || !cameraRef.current) return;
    const preview = previewLayoutRef.current;
    if (!preview.width || !preview.height) {
      Alert.alert('알림', '카메라가 준비되는 중입니다.');
      return;
    }

    setBusy(true);
    setStatusText('학생증을 업로드하는 중…');
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

      await api.post(
        '/api/auth/resubmit-student-id',
        { imageBase64: photo.base64, cropRegion },
        { timeout: UPLOAD_TIMEOUT_MS },
      );

      await refreshStudentVerification();
      Alert.alert(
        '제출 완료',
        '학생증이 재제출되었습니다. 관리자 승인을 기다려 주세요.',
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert(
        '제출 실패',
        e?.response?.data?.message || '학생증 재제출 중 오류가 발생했습니다.',
      );
    } finally {
      setBusy(false);
      setStatusText('학생증을 가운데 틀에 맞춰 주세요.');
    }
  }, [busy, frameWidth, frameHeight, refreshStudentVerification, navigation]);

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.label}>카메라 권한이 필요합니다.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>권한 허용하기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>학생증 재제출</Text>
        <View style={{ width: 28 }} />
      </View>

      <View
        style={styles.cameraStage}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setStageSize({ width, height });
            previewLayoutRef.current = { width, height };
          }
        }}
      >
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="picture"
        />
        <StudentIdCameraGuideOverlay
          stageWidth={stageWidth}
          stageHeight={stageHeight}
          frameWidth={frameWidth}
          frameHeight={frameHeight}
          statusText={statusText}
          guideTextStyle={styles.guideText}
          overlayRootStyle={layerStyles.guideOverlay}
          layerStyles={layerStyles}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, busy && { opacity: 0.6 }]}
        disabled={busy}
        onPress={runResubmit}
      >
        {busy ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.submitBtnText}>촬영 및 재제출하기</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: 'Baloo2-Bold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  cameraStage: {
    flex: 1,
    minHeight: 280,
    backgroundColor: '#000',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  guideText: {
    color: '#fff',
    fontFamily: 'Baloo2-Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  submitBtn: {
    margin: 16,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    fontFamily: 'Baloo2-Bold',
    color: colors.background,
    fontSize: 16,
  },
  label: {
    fontFamily: 'Baloo2-Regular',
    fontSize: 15,
    color: colors.textPrimary,
    margin: 24,
  },
  btn: {
    marginHorizontal: 24,
    padding: 14,
    backgroundColor: colors.primary,
    borderRadius: 20,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: 'Baloo2-Bold',
    color: colors.background,
  },
});

export default StudentIdResubmit;

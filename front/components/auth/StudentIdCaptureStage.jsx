import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { colors } from '../../styles/colors';
import { createStudentIdCameraLayerStyles } from '../../styles/studentIdCameraLayers';
import { getStudentIdFrameSize } from '../../utils/studentIdFrameCrop';
import StudentIdCameraGuideOverlay from '../../view/src/signup/StudentIdCameraGuideOverlay';

export function useStudentIdCapture(cameraRef) {
  const [frozenUri, setFrozenUri] = useState(null);
  const previewLayoutRef = useRef({ width: 0, height: 0 });
  const lastPhotoRef = useRef(null);

  const capture = useCallback(async () => {
    if (!cameraRef.current) return null;
    const photo = await cameraRef.current.takePictureAsync({
      base64: true,
      quality: 0.85,
      skipProcessing: false,
    });
    if (!photo?.base64) return null;
    const uri = photo.uri || `data:image/jpeg;base64,${photo.base64}`;
    lastPhotoRef.current = photo;
    setFrozenUri(uri);
    return photo;
  }, [cameraRef]);

  const resetCapture = useCallback(() => {
    setFrozenUri(null);
    lastPhotoRef.current = null;
  }, []);

  return { frozenUri, capture, resetCapture, previewLayoutRef, lastPhotoRef };
}

export default function StudentIdCaptureStage({
  cameraRef,
  frozenUri,
  statusText,
  guideTextStyle,
  stageStyle,
  previewLayoutRef,
  onStageLayout,
}) {
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const layerStyles = useMemo(() => createStudentIdCameraLayerStyles(), []);

  const stageReady = stageSize.width > 0 && stageSize.height > 0;
  const stageWidth = stageSize.width;
  const stageHeight = stageSize.height;
  const { frameWidth, frameHeight } = useMemo(
    () => (stageReady ? getStudentIdFrameSize(stageWidth) : { frameWidth: 0, frameHeight: 0 }),
    [stageReady, stageWidth],
  );

  const handleLayout = useCallback(
    (e) => {
      const { width, height } = e.nativeEvent.layout;
      if (width > 0 && height > 0) {
        setStageSize({ width, height });
        if (previewLayoutRef) previewLayoutRef.current = { width, height };
        onStageLayout?.({ width, height });
      }
    },
    [onStageLayout, previewLayoutRef],
  );

  return (
    <View style={[styles.stage, stageStyle]} onLayout={handleLayout}>
      {frozenUri ? (
        <Image
          source={{ uri: frozenUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="picture"
        />
      )}

      {/* 레이아웃 확정 전: 가이드가 튀지 않도록 준비 중 화면 */}
      {!stageReady ? (
        <View style={styles.readyMask} pointerEvents="none">
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.readyText}>카메라 준비 중…</Text>
        </View>
      ) : (
        <StudentIdCameraGuideOverlay
          stageWidth={stageWidth}
          stageHeight={stageHeight}
          frameWidth={frameWidth}
          frameHeight={frameHeight}
          statusText={statusText}
          guideTextStyle={guideTextStyle}
          overlayRootStyle={layerStyles.guideOverlay}
          layerStyles={layerStyles}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    minHeight: 280,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  readyMask: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  readyText: {
    fontFamily: 'Baloo2-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
});
